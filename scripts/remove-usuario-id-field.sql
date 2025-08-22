-- Remover campo obsoleto usuario_id de tabla jugadores
-- EJECUTAR ESTE SQL EN SUPABASE DASHBOARD

-- Verificar que el campo existe antes de removerlo
SELECT column_name 
FROM information_schema.columns 
WHERE table_name = 'jugadores' AND column_name = 'usuario_id';

-- Remover el campo usuario_id (ya no necesario en nueva arquitectura)
ALTER TABLE jugadores DROP COLUMN IF EXISTS usuario_id;

-- Verificar que se removió correctamente
SELECT column_name 
FROM information_schema.columns 
WHERE table_name = 'jugadores' 
ORDER BY ordinal_position;