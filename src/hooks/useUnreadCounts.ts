import { useEffect, useState, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface UseUnreadCountsProps {
  atendimentos: any[];
  vendedorId: string | null;
  enabled: boolean;
  currentAtendimentoId?: string | null;
}

export function useUnreadCounts({ atendimentos, vendedorId, enabled, currentAtendimentoId }: UseUnreadCountsProps) {
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({});
  const initialFetchDone = useRef(false);
  const previousAtendimentoIds = useRef<Set<string>>(new Set());

  // Função para buscar contador de um atendimento específico
  const fetchSingleUnreadCount = useCallback(async (atendimentoId: string) => {
    if (!vendedorId) return 0;
    
    const { count } = await supabase
      .from('mensagens')
      .select('*', { count: 'exact', head: true })
      .eq('atendimento_id', atendimentoId)
      .in('remetente_tipo', ['cliente', 'ia'])
      .is('read_at', null);
    
    return count || 0;
  }, [vendedorId]);

  // Fetch inicial APENAS - busca contadores para todos os atendimentos uma vez
  useEffect(() => {
    if (!vendedorId || !enabled || atendimentos.length === 0 || initialFetchDone.current) {
      return;
    }

    console.log('🎯 Fetch inicial de contadores para', atendimentos.length, 'atendimentos');

    const fetchInitialCounts = async () => {
      const counts: Record<string, number> = {};
      
      for (const atendimento of atendimentos) {
        const count = await fetchSingleUnreadCount(atendimento.id);
        if (count > 0) {
          counts[atendimento.id] = count;
        }
      }
      
      console.log('📊 Contadores iniciais:', counts);
      setUnreadCounts(counts);
      initialFetchDone.current = true;
      
      // Armazenar IDs atuais
      previousAtendimentoIds.current = new Set(atendimentos.map(a => a.id));
    };

    fetchInitialCounts();
  }, [vendedorId, enabled, atendimentos, fetchSingleUnreadCount]);

  // Detectar novos atendimentos e buscar seus contadores
  useEffect(() => {
    if (!initialFetchDone.current || !vendedorId || !enabled) return;

    const currentIds = new Set(atendimentos.map(a => a.id));
    const newIds = Array.from(currentIds).filter(id => !previousAtendimentoIds.current.has(id));

    if (newIds.length > 0) {
      console.log('🆕 Novos atendimentos detectados:', newIds);
      
      // Buscar contadores para novos atendimentos
      newIds.forEach(async (atendimentoId) => {
        const count = await fetchSingleUnreadCount(atendimentoId);
        if (count > 0) {
          setUnreadCounts(prev => ({
            ...prev,
            [atendimentoId]: count
          }));
        }
      });
    }

    // Remover contadores de atendimentos que não existem mais
    const removedIds = Array.from(previousAtendimentoIds.current).filter(id => !currentIds.has(id));
    if (removedIds.length > 0) {
      console.log('🗑️ Atendimentos removidos:', removedIds);
      setUnreadCounts(prev => {
        const newCounts = { ...prev };
        removedIds.forEach(id => delete newCounts[id]);
        return newCounts;
      });
    }

    previousAtendimentoIds.current = currentIds;
  }, [atendimentos, vendedorId, enabled, fetchSingleUnreadCount]);

  // Subscribe to real-time updates - INSERTs de mensagens
  useEffect(() => {
    if (!enabled || !vendedorId) return;

    const channel = supabase
      .channel('unread-counts-vendedor')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'mensagens'
        },
        (payload) => {
          // Nova mensagem de cliente/IA - sempre incrementar
          if (payload.new && 
              (payload.new.remetente_tipo === 'cliente' || payload.new.remetente_tipo === 'ia')) {
            const atendimentoId = payload.new.atendimento_id;
            
            console.log('➕ Incrementando contador para atendimento:', atendimentoId);
            
            setUnreadCounts(prev => {
              const newCount = (prev[atendimentoId] || 0) + 1;
              console.log(`   Contador: ${prev[atendimentoId] || 0} → ${newCount}`);
              return {
                ...prev,
                [atendimentoId]: newCount
              };
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [enabled, vendedorId]);

  // Marcar mensagens como lidas e limpar contador
  const clearUnreadCount = useCallback(async (atendimentoId: string) => {
    if (!vendedorId) return;
    
    console.log('🧹 Limpando contador para:', atendimentoId);
    
    // Primeiro, remover do contador local IMEDIATAMENTE
    setUnreadCounts(prev => {
      const newCounts = { ...prev };
      delete newCounts[atendimentoId];
      return newCounts;
    });
    
    // Depois marcar mensagens como lidas no banco
    const { data: unreadMessages } = await supabase
      .from('mensagens')
      .select('id')
      .eq('atendimento_id', atendimentoId)
      .in('remetente_tipo', ['cliente', 'ia'])
      .is('read_at', null);
    
    if (unreadMessages && unreadMessages.length > 0) {
      const ids = unreadMessages.map(m => m.id);
      const now = new Date().toISOString();
      
      await supabase
        .from('mensagens')
        .update({ read_at: now, read_by_id: vendedorId })
        .in('id', ids);
    }
  }, [vendedorId]);

  // Função para refazer fetch completo (se necessário)
  const refreshUnreadCounts = useCallback(async () => {
    if (!vendedorId || !enabled || atendimentos.length === 0) return;

    console.log('🔄 Refresh manual de contadores');
    
    const counts: Record<string, number> = {};
    for (const atendimento of atendimentos) {
      const count = await fetchSingleUnreadCount(atendimento.id);
      if (count > 0) {
        counts[atendimento.id] = count;
      }
    }
    
    setUnreadCounts(counts);
  }, [vendedorId, enabled, atendimentos, fetchSingleUnreadCount]);

  return { unreadCounts, clearUnreadCount, refreshUnreadCounts };
}
