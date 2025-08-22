-- ======================================================================
-- ELIMINAR TABLA TEMPORADAS OBSOLETA
-- ======================================================================
-- Fecha: 2025-08-22
-- Descripción: Eliminar tabla temporadas obsoleta ya que se usa configuracion_temporada

-- Verificar si existen datos en la tabla temporadas antes de eliminar
DO $$
DECLARE
    record_count INTEGER;
BEGIN
    -- Contar registros en la tabla temporadas
    SELECT COUNT(*) INTO record_count FROM temporadas;
    
    IF record_count > 0 THEN
        RAISE NOTICE 'ADVERTENCIA: La tabla temporadas contiene % registros. Estos se perderán.', record_count;
        RAISE NOTICE 'Si necesitas migrar datos, cancela y ejecuta primero una migración de datos.';
    ELSE
        RAISE NOTICE 'La tabla temporadas está vacía. Es seguro eliminarla.';
    END IF;
END $$;

-- Eliminar la tabla temporadas y todas sus dependencias
DROP TABLE IF EXISTS temporadas CASCADE;

-- Mensaje de confirmación
DO $$
BEGIN
    RAISE NOTICE 'Tabla temporadas eliminada exitosamente.';
    RAISE NOTICE 'El sistema ahora usa únicamente configuracion_temporada.';
END $$;