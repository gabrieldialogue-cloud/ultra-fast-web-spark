import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface ClientPresence {
  atendimentoId: string;
  isOnline: boolean;
  isTyping: boolean;
}

interface UseClientPresenceProps {
  atendimentos: any[];
  enabled: boolean;
}

export function useClientPresence({ atendimentos, enabled }: UseClientPresenceProps) {
  const [clientPresence, setClientPresence] = useState<Record<string, ClientPresence>>({});

  useEffect(() => {
    if (!enabled || atendimentos.length === 0) return;

    const updatePresenceFromActivity = async () => {
      const presenceMap: Record<string, ClientPresence> = {};
      
      for (const atendimento of atendimentos) {
        // Get last client message to determine if recently active
        const { data: lastClientMsg } = await supabase
          .from('mensagens')
          .select('created_at, remetente_tipo')
          .eq('atendimento_id', atendimento.id)
          .eq('remetente_tipo', 'cliente')
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        const isRecentlyActive = lastClientMsg && 
          (new Date().getTime() - new Date(lastClientMsg.created_at).getTime()) < 2 * 60 * 1000; // 2 minutes

        presenceMap[atendimento.id] = {
          atendimentoId: atendimento.id,
          isOnline: isRecentlyActive || false,
          isTyping: false
        };
      }
      
      setClientPresence(presenceMap);
    };

    updatePresenceFromActivity();

    // Subscribe to new messages to update presence
    const channels = atendimentos.map(atendimento => {
      const channel = supabase.channel(`client-presence:${atendimento.id}`);
      
      channel
        .on('broadcast', { event: 'client_online' }, (payload) => {
          setClientPresence(prev => ({
            ...prev,
            [atendimento.id]: {
              ...prev[atendimento.id],
              isOnline: payload.payload.isOnline
            }
          }));
        })
        .on('broadcast', { event: 'client_typing' }, (payload) => {
          setClientPresence(prev => ({
            ...prev,
            [atendimento.id]: {
              ...prev[atendimento.id],
              isTyping: payload.payload.isTyping
            }
          }));
          
          if (payload.payload.isTyping) {
            setTimeout(() => {
              setClientPresence(prev => ({
                ...prev,
                [atendimento.id]: {
                  ...prev[atendimento.id],
                  isTyping: false
                }
              }));
            }, 3000);
          }
        })
        .on('postgres_changes', {
          event: 'INSERT',
          schema: 'public',
          table: 'mensagens',
          filter: `atendimento_id=eq.${atendimento.id}`
        }, (payload: any) => {
          if (payload.new.remetente_tipo === 'cliente') {
            // Cliente enviou mensagem, está online
            setClientPresence(prev => ({
              ...prev,
              [atendimento.id]: {
                ...prev[atendimento.id],
                isOnline: true,
                isTyping: false
              }
            }));
            
            // Clear online status after 2 minutes
            setTimeout(() => {
              setClientPresence(prev => ({
                ...prev,
                [atendimento.id]: {
                  ...prev[atendimento.id],
                  isOnline: false
                }
              }));
            }, 2 * 60 * 1000);
          }
        })
        .subscribe();
      
      return channel;
    });

    return () => {
      channels.forEach(channel => {
        supabase.removeChannel(channel);
      });
    };
  }, [atendimentos, enabled]);

  return { clientPresence };
}
