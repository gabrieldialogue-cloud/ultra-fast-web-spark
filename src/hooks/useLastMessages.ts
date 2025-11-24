import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface LastMessage {
  atendimentoId: string;
  conteudo: string;
  attachmentType: string | null;
  createdAt: string;
  remetenteTipo: string;
  attachmentCount?: number;
}

interface UseLastMessagesProps {
  atendimentos: any[];
  enabled: boolean;
}

export function useLastMessages({ atendimentos, enabled }: UseLastMessagesProps) {
  const [lastMessages, setLastMessages] = useState<Record<string, LastMessage>>({});

  const fetchLastMessages = async () => {
    if (!enabled || atendimentos.length === 0) return;

    const messagesMap: Record<string, LastMessage> = {};
    
    for (const atendimento of atendimentos) {
      // Get last message
      const { data: lastMsg } = await supabase
        .from('mensagens')
        .select('conteudo, attachment_type, created_at, remetente_tipo')
        .eq('atendimento_id', atendimento.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();
      
      // Get attachment count
      const { count: attachmentCount } = await supabase
        .from('mensagens')
        .select('*', { count: 'exact', head: true })
        .eq('atendimento_id', atendimento.id)
        .not('attachment_url', 'is', null);
      
      if (lastMsg) {
        messagesMap[atendimento.id] = {
          atendimentoId: atendimento.id,
          conteudo: lastMsg.conteudo,
          attachmentType: lastMsg.attachment_type,
          createdAt: lastMsg.created_at,
          remetenteTipo: lastMsg.remetente_tipo,
          attachmentCount: attachmentCount || 0
        };
      }
    }
    
    setLastMessages(messagesMap);
  };

  // Initial fetch
  useEffect(() => {
    fetchLastMessages();
  }, [atendimentos, enabled]);

  // Subscribe to real-time updates
  useEffect(() => {
    if (!enabled) return;

    const channel = supabase
      .channel('last-messages-updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'mensagens'
        },
        () => {
          fetchLastMessages();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [enabled, atendimentos]);

  return { lastMessages, refreshLastMessages: fetchLastMessages };
}
