-- Add push_name and profile_picture_url to clientes table
ALTER TABLE clientes 
ADD COLUMN IF NOT EXISTS push_name TEXT,
ADD COLUMN IF NOT EXISTS profile_picture_url TEXT;