-- =====================================================================
-- CORREGIR POLÍTICAS RLS PARA SUPABASE STORAGE - FOTOS DE JUGADORES
-- =====================================================================
-- Ejecutar este SQL en el SQL Editor de Supabase Dashboard

-- =====================================================================
-- PASO 1: HABILITAR RLS EN LA TABLA storage.objects (si no está habilitado)
-- =====================================================================

-- Primero verificar si RLS está habilitado
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'storage' AND tablename = 'objects';

-- Habilitar RLS en storage.objects
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- =====================================================================
-- PASO 2: ELIMINAR POLÍTICAS EXISTENTES (en caso de conflicto)
-- =====================================================================

-- Eliminar políticas existentes si existen
DROP POLICY IF EXISTS "Public read access for player photos" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload player photos" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own player photos" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own player photos" ON storage.objects;

-- =====================================================================
-- PASO 3: CREAR POLÍTICAS CORRECTAS
-- =====================================================================

-- 1. Política de lectura pública (permite ver las fotos)
CREATE POLICY "Allow public read access to player photos" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'player-photos');

-- 2. Política de subida para usuarios autenticados
CREATE POLICY "Allow authenticated users to upload player photos" 
ON storage.objects 
FOR INSERT 
WITH CHECK (
  bucket_id = 'player-photos' 
  AND auth.role() = 'authenticated'
);

-- 3. Política de actualización para usuarios autenticados
CREATE POLICY "Allow authenticated users to update player photos" 
ON storage.objects 
FOR UPDATE 
USING (
  bucket_id = 'player-photos' 
  AND auth.role() = 'authenticated'
);

-- 4. Política de eliminación para usuarios autenticados
CREATE POLICY "Allow authenticated users to delete player photos" 
ON storage.objects 
FOR DELETE 
USING (
  bucket_id = 'player-photos' 
  AND auth.role() = 'authenticated'
);

-- =====================================================================
-- PASO 4: VERIFICAR QUE LAS POLÍTICAS SE CREARON CORRECTAMENTE
-- =====================================================================

-- Verificar políticas creadas
SELECT 
    schemaname, 
    tablename, 
    policyname, 
    permissive, 
    roles, 
    cmd, 
    qual, 
    with_check 
FROM pg_policies 
WHERE schemaname = 'storage' 
AND tablename = 'objects' 
AND policyname LIKE '%player photos%';

-- =====================================================================
-- PASO 5: VERIFICAR CONFIGURACIÓN DEL BUCKET
-- =====================================================================

-- Verificar configuración del bucket player-photos
SELECT 
    id,
    name,
    public,
    allowed_mime_types,
    file_size_limit
FROM storage.buckets 
WHERE name = 'player-photos';

-- =====================================================================
-- CONFIRMACIÓN
-- =====================================================================

-- Si todo está correcto, deberías ver:
-- ✅ RLS habilitado en storage.objects
-- ✅ 4 políticas creadas para player-photos
-- ✅ Bucket player-photos configurado como público

-- Mensaje de confirmación
DO $$
BEGIN
    RAISE NOTICE '🎉 =====================================';
    RAISE NOTICE '🎉 POLÍTICAS RLS CONFIGURADAS';
    RAISE NOTICE '🎉 =====================================';
    RAISE NOTICE '✅ Políticas creadas para bucket player-photos';
    RAISE NOTICE '✅ Usuarios autenticados pueden subir fotos';
    RAISE NOTICE '✅ Lectura pública habilitada';
    RAISE NOTICE '✅ Actualización/eliminación para autenticados';
    RAISE NOTICE '';
    RAISE NOTICE '🚀 Ahora los usuarios pueden subir fotos sin errores de RLS';
END $$;