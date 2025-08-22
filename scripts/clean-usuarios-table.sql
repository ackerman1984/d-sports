-- Limpiar completamente la tabla usuarios para nueva estructura
-- IMPORTANTE: Ejecutar este SQL en Supabase Dashboard

-- 1. Eliminar todos los datos existentes
DELETE FROM usuarios;

-- 2. Eliminar columnas innecesarias de la tabla usuarios
ALTER TABLE usuarios DROP COLUMN IF EXISTS telefono;
ALTER TABLE usuarios DROP COLUMN IF EXISTS foto_url;
ALTER TABLE usuarios DROP COLUMN IF EXISTS numero_casaca;
ALTER TABLE usuarios DROP COLUMN IF EXISTS equipo_id;
ALTER TABLE usuarios DROP COLUMN IF EXISTS ultimo_login;
ALTER TABLE usuarios DROP COLUMN IF EXISTS posicion;
ALTER TABLE usuarios DROP COLUMN IF EXISTS updated_at;

-- 3. Agregar columna activo si no existe
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS activo BOOLEAN DEFAULT true;

-- 4. Verificar estructura final de usuarios
-- La tabla usuarios debe tener solo:
-- id, email, nombre, role, liga_id, created_at, activo

-- 5. Limpiar tabla jugadores si es necesario
DELETE FROM jugadores;

-- 6. Verificar que tabla jugadores tenga los campos correctos
-- Agregar campos faltantes si es necesario
ALTER TABLE jugadores ADD COLUMN IF NOT EXISTS telefono TEXT;
ALTER TABLE jugadores ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES usuarios(id);

-- 7. Limpiar tabla anotadores
DELETE FROM anotadores;

-- 8. Verificar que tabla anotadores tenga telefono como opcional
ALTER TABLE anotadores ALTER COLUMN telefono DROP NOT NULL;

-- 9. Limpiar tabla administradores
DELETE FROM administradores;