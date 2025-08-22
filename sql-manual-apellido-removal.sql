-- =====================================================================
-- SQL MANUAL PARA REMOVER COLUMNA APELLIDO - EJECUTAR PASO A PASO
-- =====================================================================
-- IMPORTANTE: Ejecuta estos comandos UNO POR UNO en tu dashboard de Supabase
-- en el orden exacto que aparecen aquí

-- =====================================================================
-- PASO 1: VERIFICAR QUE LA TABLA Y COLUMNA EXISTEN
-- =====================================================================
-- Ejecuta este query primero para verificar el estado actual:

SELECT 
    column_name, 
    data_type, 
    is_nullable 
FROM information_schema.columns 
WHERE table_name = 'jugadores' 
    AND table_schema = 'public' 
    AND column_name IN ('nombre', 'apellido')
ORDER BY column_name;

-- =====================================================================
-- PASO 2: VER DATOS ACTUALES (OPCIONAL)
-- =====================================================================
-- Para ver qué datos tienes actualmente:

SELECT 
    id, 
    nombre, 
    apellido, 
    email 
FROM jugadores 
LIMIT 5;

-- =====================================================================
-- PASO 3: MIGRAR DATOS - CONCATENAR NOMBRE + APELLIDO
-- =====================================================================
-- Este comando combinará nombre y apellido en la columna nombre:

UPDATE jugadores 
SET nombre = CASE 
    WHEN apellido IS NOT NULL AND TRIM(apellido) <> '' THEN 
        COALESCE(TRIM(nombre), '') || ' ' || TRIM(apellido)
    ELSE 
        COALESCE(TRIM(nombre), 'Sin nombre')
END;

-- =====================================================================
-- PASO 4: LIMPIAR NOMBRES VACÍOS (OPCIONAL)
-- =====================================================================
-- Por si hay registros con nombres vacíos:

UPDATE jugadores 
SET nombre = 'Sin nombre' 
WHERE nombre IS NULL OR TRIM(nombre) = '';

-- =====================================================================
-- PASO 5: VERIFICAR QUE LOS DATOS SE MIGRARON CORRECTAMENTE
-- =====================================================================
-- Verifica que los nombres se combinaron correctamente:

SELECT 
    id, 
    nombre, 
    apellido, 
    email 
FROM jugadores 
LIMIT 5;

-- =====================================================================
-- PASO 6: ELIMINAR LA COLUMNA APELLIDO
-- =====================================================================
-- ADVERTENCIA: Esta acción es irreversible. Asegúrate de que el paso 5 muestre
-- los nombres correctamente combinados antes de ejecutar esto:

ALTER TABLE jugadores DROP COLUMN apellido;

-- =====================================================================
-- PASO 7: VERIFICAR QUE LA COLUMNA FUE ELIMINADA
-- =====================================================================
-- Verifica que apellido ya no existe:

SELECT 
    column_name, 
    data_type, 
    is_nullable 
FROM information_schema.columns 
WHERE table_name = 'jugadores' 
    AND table_schema = 'public' 
ORDER BY column_name;

-- =====================================================================
-- PASO 8: ACTUALIZAR COMENTARIO DE LA COLUMNA (OPCIONAL)
-- =====================================================================

COMMENT ON COLUMN jugadores.nombre IS 'Nombre completo del jugador';

-- =====================================================================
-- PASO 9: VERIFICACIÓN FINAL
-- =====================================================================
-- Ver los datos finales:

SELECT 
    id, 
    nombre, 
    email, 
    numero_casaca 
FROM jugadores 
ORDER BY nombre 
LIMIT 10;