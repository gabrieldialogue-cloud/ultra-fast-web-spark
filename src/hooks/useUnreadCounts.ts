import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface UseUnreadCountsProps {
  atendimentos: any[];
  vendedorId: string | null;
  enabled: boolean;
  currentAtendimentoId?: string | null;
}

export function useUnreadCounts({ atendimentos, vendedorId, enabled, currentAtendimentoId }: UseUnreadCountsProps) {
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({});
  const [clearedAtendimentos, setClearedAtendimentos] = useState<Set<string>>(new Set());

  // Fetch unread counts for all atendimentos
  const fetchUnreadCounts = async () => {
    if (!vendedorId || !enabled || atendimentos.length === 0) return;

    const counts: Record<string, number> = {};
    
    for (const atendimento of atendimentos) {
      // Não buscar contadores para atendimentos que foram manualmente limpos
      if (clearedAtendimentos.has(atendimento.id)) {
        continue;
      }
      
      const { count } = await supabase
        .from('mensagens')
        .select('*', { count: 'exact', head: true })
        .eq('atendimento_id', atendimento.id)
        .in('remetente_tipo', ['cliente', 'ia'])
        .is('read_at', null);
      
      if (count && count > 0) {
        counts[atendimento.id] = count;
      }
    }
    
    setUnreadCounts(counts);
  };

  // Initial fetch
  useEffect(() => {
    fetchUnreadCounts();
  }, [atendimentos, vendedorId, enabled]);

  // Subscribe to real-time updates - APENAS para INSERTs de novas mensagens
  useEffect(() => {
    if (!enabled || !vendedorId) return;

    const channel = supabase
      .channel('unread-counts-vendedor')
      .on(
        'postgres_changes',
        {
          event: 'INSERT', // Apenas INSERTs, não UPDATEs
          schema: 'public',
          table: 'mensagens'
        },
        (payload) => {
          console.log('📨 Nova mensagem inserida, atualizando contadores', payload);
          // Apenas buscar novamente se for mensagem de cliente/IA
          if (payload.new && 
              (payload.new.remetente_tipo === 'cliente' || payload.new.remetente_tipo === 'ia')) {
            fetchUnreadCounts();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [enabled, vendedorId, atendimentos]);

  // Clear unread count for specific atendimento e marcar como "cleared"
  const clearUnreadCount = (atendimentoId: string) => {
    console.log('🧹 Limpando contador de não lidas para:', atendimentoId);
    setClearedAtendimentos(prev => new Set(prev).add(atendimentoId));
    setUnreadCounts(prev => {
      const newCounts = { ...prev };
      delete newCounts[atendimentoId];
      return newCounts;
    });
  };

  // Resetar cleared quando houver nova mensagem de cliente/IA nesse atendimento
  useEffect(() => {
    if (!enabled || !vendedorId) return;

    const channel = supabase
      .channel('reset-cleared-atendimentos')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'mensagens'
        },
        (payload) => {
          if (payload.new && 
              (payload.new.remetente_tipo === 'cliente' || payload.new.remetente_tipo === 'ia')) {
            const atendimentoId = payload.new.atendimento_id;
            console.log('🔄 Nova mensagem de cliente/IA, removendo flag de cleared para:', atendimentoId);
            setClearedAtendimentos(prev => {
              const newSet = new Set(prev);
              newSet.delete(atendimentoId);
              return newSet;
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [enabled, vendedorId]);

  return { unreadCounts, clearUnreadCount, refreshUnreadCounts: fetchUnreadCounts };
}
