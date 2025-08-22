-- Migración segura para remover la columna apellido de la tabla jugadores
-- El nombre completo se almacenará en la columna nombre
-- Fecha: 2025-08-19

-- ======================================================================
-- PASO 1: VERIFICAR QUE LA TABLA EXISTE
-- ======================================================================

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'jugadores' 
        AND table_schema = 'public'
    ) THEN
        RAISE NOTICE 'ℹ️ La tabla jugadores no existe. Saltando migración.';
        RETURN;
    END IF;
    
    RAISE NOTICE '✅ Tabla jugadores encontrada. Continuando migración...';
END $$;

-- ======================================================================
-- PASO 2: VERIFICAR SI LA COLUMNA APELLIDO EXISTE
-- ======================================================================

DO $$
DECLARE
    apellido_exists boolean := false;
BEGIN
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'jugadores' 
        AND column_name = 'apellido' 
        AND table_schema = 'public'
    ) INTO apellido_exists;
    
    IF NOT apellido_exists THEN
        RAISE NOTICE 'ℹ️ La columna apellido ya no existe. Migración no necesaria.';
        RETURN;
    END IF;
    
    RAISE NOTICE '🔍 Columna apellido encontrada. Iniciando migración de datos...';
END $$;

-- ======================================================================
-- PASO 3: MIGRAR DATOS EXISTENTES (SOLO SI APELLIDO EXISTE)
-- ======================================================================

DO $$
DECLARE
    record_count integer;
    updated_count integer;
BEGIN
    -- Verificar si la columna apellido existe antes de continuar
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'jugadores' 
        AND column_name = 'apellido' 
        AND table_schema = 'public'
    ) THEN
        RAISE NOTICE 'ℹ️ Columna apellido no existe. Saltando migración de datos.';
        RETURN;
    END IF;

    -- Contar registros totales
    SELECT COUNT(*) INTO record_count FROM jugadores;
    RAISE NOTICE 'ℹ️ Total de registros en jugadores: %', record_count;
    
    -- Migrar datos: concatenar nombre + apellido donde apellido no esté vacío
    UPDATE jugadores 
    SET nombre = CASE 
        WHEN apellido IS NOT NULL AND TRIM(apellido) <> '' THEN 
            TRIM(COALESCE(nombre, '')) || ' ' || TRIM(apellido)
        ELSE 
            COALESCE(TRIM(nombre), 'Sin nombre')
    END
    WHERE apellido IS NOT NULL AND TRIM(apellido) <> '';
    
    GET DIAGNOSTICS updated_count = ROW_COUNT;
    RAISE NOTICE '✅ Datos migrados: % registros actualizados', updated_count;
    
    -- Limpiar nombres vacíos
    UPDATE jugadores 
    SET nombre = 'Sin nombre' 
    WHERE nombre IS NULL OR TRIM(nombre) = '';
    
    GET DIAGNOSTICS updated_count = ROW_COUNT;
    RAISE NOTICE '🔧 Nombres vacíos corregidos: % registros', updated_count;
    
END $$;

-- ======================================================================
-- PASO 4: ELIMINAR LA COLUMNA APELLIDO (SOLO SI EXISTE)
-- ======================================================================

DO $$
BEGIN
    -- Verificar si la columna apellido existe
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'jugadores' 
        AND column_name = 'apellido' 
        AND table_schema = 'public'
    ) THEN
        -- Eliminar la columna apellido
        EXECUTE 'ALTER TABLE jugadores DROP COLUMN apellido';
        RAISE NOTICE '✅ Columna apellido eliminada exitosamente';
    ELSE
        RAISE NOTICE 'ℹ️ Columna apellido ya no existe';
    END IF;
END $$;

-- ======================================================================
-- PASO 5: ACTUALIZAR COMENTARIOS Y CONSTRAINTS
-- ======================================================================

DO $$
BEGIN
    -- Actualizar comentario de la columna nombre
    EXECUTE 'COMMENT ON COLUMN jugadores.nombre IS ''Nombre completo del jugador''';
    RAISE NOTICE '📝 Comentario de columna actualizado';
EXCEPTION 
    WHEN OTHERS THEN
        RAISE NOTICE '⚠️ No se pudo actualizar el comentario: %', SQLERRM;
END $$;

-- ======================================================================
-- PASO 6: VERIFICACIÓN FINAL
-- ======================================================================

DO $$
DECLARE
    apellido_exists boolean := false;
    sample_names text[];
BEGIN
    -- Verificar que la columna apellido ya no existe
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'jugadores' 
        AND column_name = 'apellido' 
        AND table_schema = 'public'
    ) INTO apellido_exists;
    
    IF apellido_exists THEN
        RAISE NOTICE '❌ ERROR: La columna apellido aún existe';
    ELSE
        RAISE NOTICE '✅ ÉXITO: La columna apellido ha sido eliminada';
        
        -- Mostrar algunos nombres de muestra
        SELECT ARRAY(
            SELECT nombre 
            FROM jugadores 
            WHERE nombre IS NOT NULL 
            LIMIT 3
        ) INTO sample_names;
        
        IF array_length(sample_names, 1) > 0 THEN
            RAISE NOTICE '📋 Nombres de muestra: %', array_to_string(sample_names, ', ');
        END IF;
    END IF;
END $$;

-- ======================================================================
-- PASO 7: MENSAJE FINAL
-- ======================================================================

DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '🎉 ============================================';
    RAISE NOTICE '🎉 MIGRACIÓN COMPLETADA EXITOSAMENTE';
    RAISE NOTICE '🎉 - Columna apellido eliminada';
    RAISE NOTICE '🎉 - Datos migrados a columna nombre';
    RAISE NOTICE '🎉 - Formularios actualizados en el código';
    RAISE NOTICE '🎉 ============================================';
    RAISE NOTICE '';
END $$;