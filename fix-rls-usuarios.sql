-- Corregir políticas RLS para tabla usuarios
-- El problema: las políticas actuales no permiten a los admins crear usuarios para otros

-- Eliminar políticas problemáticas
DROP POLICY IF EXISTS "Permitir registro de usuarios" ON usuarios;
DROP POLICY IF EXISTS "Ver usuarios de la misma liga" ON usuarios;
DROP POLICY IF EXISTS "Actualizar propio perfil" ON usuarios;
DROP POLICY IF EXISTS "Admins gestionar usuarios de su liga" ON usuarios;

-- ======================================================================
-- NUEVAS POLÍTICAS PARA TABLA USUARIOS
-- ======================================================================

-- 1. Permitir inserción libre (necesario para registro y creación por admin)
CREATE POLICY "Permitir insercion de usuarios" ON usuarios
  FOR INSERT 
  WITH CHECK (true);

-- 2. Permitir a usuarios ver otros usuarios de su liga
CREATE POLICY "Ver usuarios de la misma liga" ON usuarios
  FOR SELECT 
  USING (
    auth.uid() IS NOT NULL AND (
      id = auth.uid() OR  -- Siempre puede ver su propio perfil
      liga_id = (SELECT liga_id FROM usuarios WHERE id = auth.uid())  -- O usuarios de su liga
    )
  );

-- 3. Permitir a usuarios actualizar su propio perfil
CREATE POLICY "Actualizar propio perfil" ON usuarios
  FOR UPDATE 
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- 4. Permitir a admins gestionar todos los usuarios de su liga
CREATE POLICY "Admins gestionar usuarios liga" ON usuarios
  FOR ALL 
  USING (
    EXISTS (
      SELECT 1 FROM usuarios admin_user 
      WHERE admin_user.id = auth.uid() 
      AND admin_user.role = 'admin' 
      AND admin_user.liga_id = usuarios.liga_id
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM usuarios admin_user 
      WHERE admin_user.id = auth.uid() 
      AND admin_user.role = 'admin' 
      AND admin_user.liga_id = usuarios.liga_id
    )
  );

-- 5. Permitir a service_role hacer cualquier operación (necesario para operaciones del servidor)
CREATE POLICY "Service role acceso total" ON usuarios
  FOR ALL 
  USING (current_setting('role') = 'service_role')
  WITH CHECK (current_setting('role') = 'service_role');

-- ======================================================================
-- COMENTARIOS PARA DOCUMENTACIÓN
-- ======================================================================

COMMENT ON POLICY "Permitir insercion de usuarios" ON usuarios IS 'Permite registro libre de usuarios y creación por administradores';
COMMENT ON POLICY "Ver usuarios de la misma liga" ON usuarios IS 'Los usuarios pueden ver otros usuarios de su liga';
COMMENT ON POLICY "Actualizar propio perfil" ON usuarios IS 'Los usuarios pueden actualizar solo su propio perfil';
COMMENT ON POLICY "Admins gestionar usuarios liga" ON usuarios IS 'Los administradores pueden gestionar usuarios de su liga';
COMMENT ON POLICY "Service role acceso total" ON usuarios IS 'El service role puede hacer cualquier operación (necesario para el servidor)';

-- Verificar que las políticas se aplicaron correctamente
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
WHERE tablename = 'usuarios'
ORDER BY policyname;