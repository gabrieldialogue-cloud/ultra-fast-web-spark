import { useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

export function useTypingIndicator(vendedorId: string | null, isTyping: boolean) {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  useEffect(() => {
    if (!vendedorId) return;

    // Initialize channel
    channelRef.current = supabase.channel(`typing:${vendedorId}`);
    channelRef.current.subscribe();

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [vendedorId]);

  useEffect(() => {
    if (!vendedorId || !channelRef.current) return;

    if (isTyping) {
      // Send typing indicator
      channelRef.current.send({
        type: 'broadcast',
        event: 'typing',
        payload: { vendedorId, isTyping: true }
      });

      // Clear previous timeout
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      // Set timeout to stop typing indicator
      timeoutRef.current = setTimeout(() => {
        if (channelRef.current) {
          channelRef.current.send({
            type: 'broadcast',
            event: 'typing',
            payload: { vendedorId, isTyping: false }
          });
        }
      }, 3000);
    } else {
      // Send stop typing immediately
      if (channelRef.current) {
        channelRef.current.send({
          type: 'broadcast',
          event: 'typing',
          payload: { vendedorId, isTyping: false }
        });
      }
      
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    }
  }, [isTyping, vendedorId]);
}
