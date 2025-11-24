-- Adicionar coluna para controlar cache de fotos de perfil
ALTER TABLE clientes 
ADD COLUMN IF NOT EXISTS profile_picture_fetched_at TIMESTAMPTZ;

-- Adicionar índice para otimizar consultas
CREATE INDEX IF NOT EXISTS idx_clientes_profile_picture_fetched 
ON clientes(profile_picture_fetched_at) 
WHERE profile_picture_url IS NULL;