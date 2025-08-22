-- Arreglar políticas RLS para permitir creación de ligas y usuarios
-- Fecha: 2025-08-05

-- ======================================================================
-- POLÍTICAS PARA TABLA LIGAS
-- ======================================================================

-- Eliminar políticas existentes para ligas
DROP POLICY IF EXISTS "Usuarios pueden ver ligas" ON ligas;
DROP POLICY IF EXISTS "Admins pueden crear ligas" ON ligas;
DROP POLICY IF EXISTS "Admins pueden gestionar su liga" ON ligas;

-- Política para permitir a cualquier usuario autenticado ver ligas (necesario para registro)
CREATE POLICY "Usuarios autenticados pueden ver ligas" ON ligas
  FOR SELECT 
  USING (auth.uid() IS NOT NULL);

-- Política para permitir crear ligas durante el registro de admin (sin restricciones iniciales)
CREATE POLICY "Permitir creación de ligas" ON ligas
  FOR INSERT 
  WITH CHECK (true);

-- Política para permitir a admins actualizar su propia liga
CREATE POLICY "Admins pueden actualizar su liga" ON ligas
  FOR UPDATE 
  USING (
    EXISTS (
      SELECT 1 FROM usuarios u 
      WHERE u.id = auth.uid() 
      AND u.role = 'admin' 
      AND u.liga_id = ligas.id
    )
  );

-- ======================================================================
-- POLÍTICAS PARA TABLA USUARIOS
-- ======================================================================

-- Eliminar políticas existentes problemáticas
DROP POLICY IF EXISTS "Usuarios pueden ver usuarios de su liga" ON usuarios;
DROP POLICY IF EXISTS "Usuarios pueden actualizar su propio perfil" ON usuarios;
DROP POLICY IF EXISTS "Admins pueden gestionar usuarios de su liga" ON usuarios;

-- Permitir inserción de nuevos usuarios (necesario para registro)
CREATE POLICY "Permitir registro de usuarios" ON usuarios
  FOR INSERT 
  WITH CHECK (true);

-- Permitir a usuarios ver otros usuarios de su liga
CREATE POLICY "Ver usuarios de la misma liga" ON usuarios
  FOR SELECT 
  USING (
    auth.uid() IS NOT NULL AND (
      id = auth.uid() OR  -- Siempre puede ver su propio perfil
      liga_id = (SELECT liga_id FROM usuarios WHERE id = auth.uid())  -- O usuarios de su liga
    )
  );

-- Permitir a usuarios actualizar su propio perfil
CREATE POLICY "Actualizar propio perfil" ON usuarios
  FOR UPDATE 
  USING (id = auth.uid());

-- Permitir a admins gestionar usuarios de su liga
CREATE POLICY "Admins gestionar usuarios de su liga" ON usuarios
  FOR ALL 
  USING (
    EXISTS (
      SELECT 1 FROM usuarios u 
      WHERE u.id = auth.uid() 
      AND u.role = 'admin' 
      AND (u.liga_id = usuarios.liga_id OR usuarios.id = auth.uid())
    )
  );

-- ======================================================================
-- POLÍTICAS PARA TABLA EQUIPOS
-- ======================================================================

-- Eliminar y recrear políticas para equipos
DROP POLICY IF EXISTS "Ver equipos de la liga" ON equipos;
DROP POLICY IF EXISTS "Admins gestionar equipos" ON equipos;

-- Permitir ver equipos de cualquier liga (necesario para registro de jugadores)
CREATE POLICY "Ver equipos" ON equipos
  FOR SELECT 
  USING (auth.uid() IS NOT NULL);

-- Permitir a admins gestionar equipos de su liga
CREATE POLICY "Admins gestionar equipos de su liga" ON equipos
  FOR ALL 
  USING (
    EXISTS (
      SELECT 1 FROM usuarios u 
      WHERE u.id = auth.uid() 
      AND u.role = 'admin' 
      AND u.liga_id = equipos.liga_id
    )
  );

-- ======================================================================
-- POLÍTICAS PARA TABLA TEMPORADAS
-- ======================================================================

-- Políticas para temporadas
DROP POLICY IF EXISTS "Ver temporadas" ON temporadas;
DROP POLICY IF EXISTS "Admins gestionar temporadas" ON temporadas;

CREATE POLICY "Ver temporadas" ON temporadas
  FOR SELECT 
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admins gestionar temporadas de su liga" ON temporadas
  FOR ALL 
  USING (
    EXISTS (
      SELECT 1 FROM usuarios u 
      WHERE u.id = auth.uid() 
      AND u.role = 'admin' 
      AND u.liga_id = temporadas.liga_id
    )
  );

-- ======================================================================
-- POLÍTICAS PARA TABLA JUGADORES
-- ======================================================================

-- Recrear políticas para jugadores
DROP POLICY IF EXISTS "Ver jugadores de la liga" ON jugadores;
DROP POLICY IF EXISTS "Admins gestionar jugadores" ON jugadores;

CREATE POLICY "Ver jugadores" ON jugadores
  FOR SELECT 
  USING (
    auth.uid() IS NOT NULL AND
    EXISTS (
      SELECT 1 FROM usuarios u, equipos e
      WHERE u.id = auth.uid() 
      AND e.id = jugadores.equipo_id
      AND (u.liga_id = e.liga_id OR jugadores.usuario_id = auth.uid())
    )
  );

CREATE POLICY "Admins y sistema gestionar jugadores" ON jugadores
  FOR ALL 
  USING (
    EXISTS (
      SELECT 1 FROM usuarios u, equipos e
      WHERE u.id = auth.uid() 
      AND e.id = jugadores.equipo_id
      AND (u.role = 'admin' AND u.liga_id = e.liga_id)
    ) OR jugadores.usuario_id = auth.uid()
  );

-- ======================================================================
-- FUNCIONES DE UTILIDAD
-- ======================================================================

-- Función para verificar si un usuario es admin de una liga
CREATE OR REPLACE FUNCTION is_admin_of_league(user_id uuid, league_id uuid)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM usuarios 
    WHERE id = user_id 
    AND role = 'admin' 
    AND liga_id = league_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función para verificar si un usuario pertenece a una liga
CREATE OR REPLACE FUNCTION belongs_to_league(user_id uuid, league_id uuid)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM usuarios 
    WHERE id = user_id 
    AND liga_id = league_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ======================================================================
-- GRANTS NECESARIOS
-- ======================================================================

-- Asegurar que las funciones puedan ser ejecutadas
GRANT EXECUTE ON FUNCTION is_admin_of_league TO authenticated;
GRANT EXECUTE ON FUNCTION belongs_to_league TO authenticated;

-- Comentarios para documentar los cambios
COMMENT ON POLICY "Permitir creación de ligas" ON ligas IS 'Permite crear ligas durante el registro de administradores';
COMMENT ON POLICY "Permitir registro de usuarios" ON usuarios IS 'Permite registro de nuevos usuarios sin restricciones iniciales';
COMMENT ON FUNCTION is_admin_of_league IS 'Verifica si un usuario es administrador de una liga específica';
COMMENT ON FUNCTION belongs_to_league IS 'Verifica si un usuario pertenece a una liga específica';