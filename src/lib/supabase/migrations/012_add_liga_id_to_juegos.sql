-- Migración para agregar liga_id a la tabla juegos
-- Esto permite que los juegos se asocien correctamente con las ligas
-- Fecha: 2025-08-16

-- ======================================================================
-- AGREGAR LIGA_ID A TABLA JUEGOS
-- ======================================================================

-- Agregar columna liga_id a la tabla juegos
ALTER TABLE juegos 
ADD COLUMN IF NOT EXISTS liga_id UUID REFERENCES ligas(id) ON DELETE CASCADE;

-- Crear índice para mejor rendimiento
CREATE INDEX IF NOT EXISTS idx_juegos_liga_id ON juegos(liga_id);

-- ======================================================================
-- ACTUALIZAR JUEGOS EXISTENTES (OPCIONAL)
-- ======================================================================

-- Si hay juegos existentes, intentar asignarles liga_id basado en los equipos
-- Esto es opcional y puede no ser necesario si no hay datos existentes
UPDATE juegos 
SET liga_id = equipos.liga_id
FROM equipos 
WHERE juegos.equipo_local_id = equipos.id 
AND juegos.liga_id IS NULL;

-- ======================================================================
-- VERIFICACIÓN
-- ======================================================================

-- Verificar que la columna se agregó correctamente
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'juegos' 
        AND column_name = 'liga_id' 
        AND table_schema = 'public'
    ) THEN
        RAISE NOTICE '✅ Columna liga_id agregada exitosamente a la tabla juegos';
    ELSE
        RAISE NOTICE '❌ Error: No se pudo agregar la columna liga_id';
    END IF;
END $$;

-- Mostrar estructura actualizada de la tabla juegos
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'juegos' 
AND table_schema = 'public' 
ORDER BY ordinal_position;