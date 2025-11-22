-- Add WhatsApp message id column to mensagens if it does not exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'mensagens' 
      AND column_name = 'whatsapp_message_id'
  ) THEN
    ALTER TABLE public.mensagens
    ADD COLUMN whatsapp_message_id text;
  END IF;
END $$;