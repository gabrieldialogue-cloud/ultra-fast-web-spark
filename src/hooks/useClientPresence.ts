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

    // Initialize presence for all atendimentos
    const initialPresence: Record<string, ClientPresence> = {};
    atendimentos.forEach(atendimento => {
      initialPresence[atendimento.id] = {
        atendimentoId: atendimento.id,
        isOnline: false,
        isTyping: false
      };
    });
    setClientPresence(initialPresence);

    // Subscribe to presence updates for each atendimento
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
          
          // Auto-clear typing after 3 seconds
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
