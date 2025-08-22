-- Arreglo FINAL de acceso público a equipos para registro
-- Fecha: 2025-08-14

-- ======================================================================
-- ELIMINAR POLÍTICAS EXISTENTES CONFLICTIVAS
-- ======================================================================

-- Eliminar todas las políticas existentes de equipos para empezar limpio
DROP POLICY IF EXISTS "Ver equipos de la liga" ON equipos;
DROP POLICY IF EXISTS "Acceso público a equipos activos" ON equipos;
DROP POLICY IF EXISTS "Admins pueden crear equipos" ON equipos;
DROP POLICY IF EXISTS "Admins pueden actualizar equipos" ON equipos;
DROP POLICY IF EXISTS "Admins pueden eliminar equipos" ON equipos;

-- ======================================================================
-- CREAR POLÍTICAS NUEVAS Y SIMPLES
-- ======================================================================

-- 1. ACCESO PÚBLICO PARA LECTURA (para el registro)
CREATE POLICY "public_read_active_equipos" ON equipos
  FOR SELECT 
  USING (activo = true);

-- 2. ACCESO PARA USUARIOS AUTENTICADOS DE LA MISMA LIGA
CREATE POLICY "authenticated_read_own_liga_equipos" ON equipos
  FOR SELECT 
  USING (
    auth.uid() IS NOT NULL AND
    EXISTS (
      SELECT 1 FROM usuarios u 
      WHERE u.id = auth.uid() 
      AND u.liga_id = equipos.liga_id
    )
  );

-- 3. SOLO ADMINS PUEDEN CREAR EQUIPOS
CREATE POLICY "admin_create_equipos" ON equipos
  FOR INSERT 
  WITH CHECK (
    auth.uid() IS NOT NULL AND
    EXISTS (
      SELECT 1 FROM usuarios u 
      WHERE u.id = auth.uid() 
      AND u.role = 'admin' 
      AND u.liga_id = equipos.liga_id
    )
  );

-- 4. SOLO ADMINS PUEDEN ACTUALIZAR EQUIPOS
CREATE POLICY "admin_update_equipos" ON equipos
  FOR UPDATE 
  USING (
    auth.uid() IS NOT NULL AND
    EXISTS (
      SELECT 1 FROM usuarios u 
      WHERE u.id = auth.uid() 
      AND u.role = 'admin' 
      AND u.liga_id = equipos.liga_id
    )
  );

-- 5. SOLO ADMINS PUEDEN ELIMINAR EQUIPOS
CREATE POLICY "admin_delete_equipos" ON equipos
  FOR DELETE 
  USING (
    auth.uid() IS NOT NULL AND
    EXISTS (
      SELECT 1 FROM usuarios u 
      WHERE u.id = auth.uid() 
      AND u.role = 'admin' 
      AND u.liga_id = equipos.liga_id
    )
  );

-- ======================================================================
-- COMENTARIOS PARA DOCUMENTACIÓN
-- ======================================================================

COMMENT ON POLICY "public_read_active_equipos" ON equipos IS 'Permite acceso público para leer equipos activos (necesario para registro)';
COMMENT ON POLICY "authenticated_read_own_liga_equipos" ON equipos IS 'Permite a usuarios autenticados ver equipos de su liga';
COMMENT ON POLICY "admin_create_equipos" ON equipos IS 'Solo admins pueden crear equipos en su liga';
COMMENT ON POLICY "admin_update_equipos" ON equipos IS 'Solo admins pueden actualizar equipos de su liga';
COMMENT ON POLICY "admin_delete_equipos" ON equipos IS 'Solo admins pueden eliminar equipos de su liga';

-- ======================================================================
-- VERIFICAR QUE RLS ESTÉ HABILITADO
-- ======================================================================

-- Asegurar que RLS está habilitado
ALTER TABLE equipos ENABLE ROW LEVEL SECURITY;