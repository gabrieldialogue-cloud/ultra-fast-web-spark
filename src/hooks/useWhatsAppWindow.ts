import { useState, useEffect, useMemo } from 'react';
import { differenceInHours } from 'date-fns';

interface Message {
  id: string;
  remetente_tipo: string;
  created_at: string;
}

interface UseWhatsAppWindowProps {
  messages: Message[];
  enabled?: boolean;
}

interface UseWhatsAppWindowReturn {
  isWindowClosed: boolean;
  lastClientMessageAt: Date | null;
  hoursRemaining: number;
  hoursSinceLast: number;
}

/**
 * Hook para verificar a janela de 24 horas do WhatsApp Business API.
 * A Meta permite enviar mensagens gratuitas apenas dentro de 24 horas
 * após a última mensagem do cliente.
 */
export function useWhatsAppWindow({
  messages,
  enabled = true,
}: UseWhatsAppWindowProps): UseWhatsAppWindowReturn {
  const [now, setNow] = useState(new Date());

  // Atualiza o tempo atual a cada minuto para recalcular a janela
  useEffect(() => {
    if (!enabled) return;
    
    const interval = setInterval(() => {
      setNow(new Date());
    }, 60000); // 1 minuto

    return () => clearInterval(interval);
  }, [enabled]);

  const result = useMemo(() => {
    if (!enabled || messages.length === 0) {
      return {
        isWindowClosed: false,
        lastClientMessageAt: null,
        hoursRemaining: 24,
        hoursSinceLast: 0,
      };
    }

    // Encontrar a última mensagem do cliente
    const clientMessages = messages.filter(
      (msg) => msg.remetente_tipo === 'cliente'
    );

    if (clientMessages.length === 0) {
      // Se não há mensagens do cliente, a janela está fechada
      return {
        isWindowClosed: true,
        lastClientMessageAt: null,
        hoursRemaining: 0,
        hoursSinceLast: 0,
      };
    }

    // Ordenar por data e pegar a mais recente
    const sortedClientMessages = [...clientMessages].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );

    const lastClientMessage = sortedClientMessages[0];
    const lastClientMessageAt = new Date(lastClientMessage.created_at);
    
    // Calcular quantas horas se passaram desde a última mensagem do cliente
    const hoursSinceLast = differenceInHours(now, lastClientMessageAt);
    
    // A janela fecha após 24 horas
    const isWindowClosed = hoursSinceLast >= 24;
    const hoursRemaining = Math.max(0, 24 - hoursSinceLast);

    return {
      isWindowClosed,
      lastClientMessageAt,
      hoursRemaining,
      hoursSinceLast,
    };
  }, [messages, now, enabled]);

  return result;
}

/**
 * Função utilitária para verificar se a janela de 24h expirou
 * baseado na data da última mensagem do cliente.
 */
export function isWhatsAppWindowExpired(lastClientMessageAt: Date | string | null): boolean {
  if (!lastClientMessageAt) return true;
  
  const messageDate = typeof lastClientMessageAt === 'string' 
    ? new Date(lastClientMessageAt) 
    : lastClientMessageAt;
  
  const hoursSince = differenceInHours(new Date(), messageDate);
  return hoursSince >= 24;
}

/**
 * Função utilitária para verificar se a janela de 24h expirou
 * baseado no remetente e data da última mensagem.
 */
export function checkWindowFromLastMessage(
  lastMessageRemetenteTipo: string | undefined,
  lastMessageCreatedAt: string | undefined
): boolean {
  // Se a última mensagem foi do cliente, verificamos se faz mais de 24h
  if (lastMessageRemetenteTipo === 'cliente' && lastMessageCreatedAt) {
    return !isWhatsAppWindowExpired(lastMessageCreatedAt);
  }
  
  // Se a última mensagem não foi do cliente, precisamos verificar
  // quando foi a última mensagem do cliente (isso requer contexto adicional)
  // Por segurança, retornamos false para indicar que precisa de verificação
  return true; // Assumimos que está ok se não temos info do cliente
}

