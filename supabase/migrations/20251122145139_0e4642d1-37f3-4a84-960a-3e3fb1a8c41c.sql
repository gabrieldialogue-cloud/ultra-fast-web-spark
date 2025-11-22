-- Add read tracking to mensagens table
ALTER TABLE public.mensagens 
ADD COLUMN read_at timestamp with time zone,
ADD COLUMN read_by_id uuid REFERENCES public.usuarios(id);

-- Add index for better query performance
CREATE INDEX idx_mensagens_read_status ON public.mensagens(atendimento_id, read_at);

-- Add RLS policy for updating read status
CREATE POLICY "Users can mark messages as read"
ON public.mensagens
FOR UPDATE
USING (
  atendimento_id IN (
    SELECT atendimentos.id 
    FROM atendimentos 
    WHERE 
      atendimentos.vendedor_fixo_id IN (
        SELECT usuarios.id 
        FROM usuarios 
        WHERE usuarios.user_id = auth.uid()
      )
      OR EXISTS (
        SELECT 1 FROM usuarios 
        WHERE usuarios.user_id = auth.uid() 
        AND usuarios.role = 'supervisor'
      )
  )
);