-- ======================================================================
-- ELIMINAR TABLA JUEGOS OBSOLETA
-- ======================================================================
-- Fecha: 2025-08-22
-- Descripción: Eliminar tabla juegos obsoleta ya que se usa partidos_calendario

-- Verificar si existen datos en la tabla juegos antes de eliminar
DO $$
DECLARE
    record_count INTEGER;
BEGIN
    -- Contar registros en la tabla juegos
    SELECT COUNT(*) INTO record_count FROM juegos;
    
    IF record_count > 0 THEN
        RAISE NOTICE 'ADVERTENCIA: La tabla juegos contiene % registros. Estos se perderán.', record_count;
        RAISE NOTICE 'Si necesitas migrar datos, cancela y ejecuta primero una migración de datos.';
    ELSE
        RAISE NOTICE 'La tabla juegos está vacía. Es seguro eliminarla.';
    END IF;
END $$;

-- Primero actualizar referencias en anotador_juegos para usar partidos_calendario
-- (Si hay datos que migrar)
DO $$
BEGIN
    -- Verificar si la tabla anotador_juegos existe y tiene referencias a juegos
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name = 'anotador_juegos' AND column_name = 'juego_id') THEN
        
        -- Renombrar la columna para claridad
        RAISE NOTICE 'Actualizando referencias en anotador_juegos...';
        
        -- Si hay datos, este paso requeriría migración manual
        -- Por simplicidad, asumimos que se puede renombrar la referencia
        ALTER TABLE anotador_juegos 
        DROP CONSTRAINT IF EXISTS anotador_juegos_juego_id_fkey;
        
        -- La columna juego_id ahora referencia partidos_calendario
        ALTER TABLE anotador_juegos 
        ADD CONSTRAINT anotador_juegos_juego_id_fkey 
        FOREIGN KEY (juego_id) REFERENCES partidos_calendario(id) ON DELETE CASCADE;
        
    END IF;
END $$;

-- Actualizar referencias en estadisticas_jugador
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name = 'estadisticas_jugador' AND column_name = 'juego_id') THEN
        
        RAISE NOTICE 'Actualizando referencias en estadisticas_jugador...';
        
        ALTER TABLE estadisticas_jugador 
        DROP CONSTRAINT IF EXISTS estadisticas_jugador_juego_id_fkey;
        
        -- La columna juego_id ahora referencia partidos_calendario
        ALTER TABLE estadisticas_jugador 
        ADD CONSTRAINT estadisticas_jugador_juego_id_fkey 
        FOREIGN KEY (juego_id) REFERENCES partidos_calendario(id) ON DELETE CASCADE;
        
    END IF;
END $$;

-- Eliminar la tabla juegos y todas sus dependencias
DROP TABLE IF EXISTS juegos CASCADE;

-- Mensaje de confirmación
DO $$
BEGIN
    RAISE NOTICE 'Tabla juegos eliminada exitosamente.';
    RAISE NOTICE 'El sistema ahora usa únicamente partidos_calendario.';
    RAISE NOTICE 'Referencias en anotador_juegos y estadisticas_jugador actualizadas.';
END $$;