-- Agregar campo updated_at faltante a la tabla usuarios
-- EJECUTAR ESTE SQL EN SUPABASE DASHBOARD

-- Agregar columna updated_at si no existe
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Actualizar registros existentes para que tengan updated_at
UPDATE usuarios SET updated_at = created_at WHERE updated_at IS NULL;