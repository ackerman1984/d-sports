-- Arreglar políticas RLS para equipos - permitir INSERT correctamente
-- Fecha: 2025-08-07

-- ======================================================================
-- POLÍTICAS CORREGIDAS PARA TABLA EQUIPOS
-- ======================================================================

-- Eliminar política problemática
DROP POLICY IF EXISTS "Admins gestionar equipos de su liga" ON equipos;

-- Crear políticas separadas para diferentes operaciones

-- SELECT: Permitir ver equipos de la liga del usuario
CREATE POLICY "Ver equipos de la liga" ON equipos
  FOR SELECT 
  USING (
    auth.uid() IS NOT NULL AND
    EXISTS (
      SELECT 1 FROM usuarios u 
      WHERE u.id = auth.uid() 
      AND u.liga_id = equipos.liga_id
    )
  );

-- INSERT: Permitir a admins crear equipos en su liga
CREATE POLICY "Admins pueden crear equipos" ON equipos
  FOR INSERT 
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM usuarios u 
      WHERE u.id = auth.uid() 
      AND u.role = 'admin' 
      AND u.liga_id = equipos.liga_id
    )
  );

-- UPDATE: Permitir a admins actualizar equipos de su liga
CREATE POLICY "Admins pueden actualizar equipos" ON equipos
  FOR UPDATE 
  USING (
    EXISTS (
      SELECT 1 FROM usuarios u 
      WHERE u.id = auth.uid() 
      AND u.role = 'admin' 
      AND u.liga_id = equipos.liga_id
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM usuarios u 
      WHERE u.id = auth.uid() 
      AND u.role = 'admin' 
      AND u.liga_id = equipos.liga_id
    )
  );

-- DELETE: Permitir a admins eliminar equipos de su liga
CREATE POLICY "Admins pueden eliminar equipos" ON equipos
  FOR DELETE 
  USING (
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

COMMENT ON POLICY "Ver equipos de la liga" ON equipos IS 'Permite ver equipos de la misma liga que el usuario';
COMMENT ON POLICY "Admins pueden crear equipos" ON equipos IS 'Solo administradores pueden crear equipos en su liga';
COMMENT ON POLICY "Admins pueden actualizar equipos" ON equipos IS 'Solo administradores pueden actualizar equipos de su liga';
COMMENT ON POLICY "Admins pueden eliminar equipos" ON equipos IS 'Solo administradores pueden eliminar equipos de su liga';
