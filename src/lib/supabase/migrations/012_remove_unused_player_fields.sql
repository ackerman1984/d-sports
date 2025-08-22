-- Migración para eliminar campos no utilizados de jugadores
-- Eliminamos: posicion_principal, altura, peso

-- 1. Eliminar columnas de la tabla jugadores
ALTER TABLE jugadores 
DROP COLUMN IF EXISTS posicion_principal,
DROP COLUMN IF EXISTS altura,
DROP COLUMN IF EXISTS peso;

-- 2. Comentario para documentar el cambio
COMMENT ON TABLE jugadores IS 'Tabla de jugadores - Eliminados campos posicion_principal, altura, peso por no ser necesarios en el proyecto';