-- Migración para corregir la estructura de la tabla jugadores
-- La tabla actual solo tiene campos de autenticación básicos
-- Necesitamos transformarla a la estructura correcta para el sistema de béisbol
-- Fecha: 2025-08-15

-- ======================================================================
-- PASO 1: VERIFICAR Y CORREGIR ESTRUCTURA DE TABLA JUGADORES
-- ======================================================================

-- Primero, verificar si la tabla tiene la estructura correcta
-- Si no tiene las columnas necesarias, las agregamos

-- Agregar columnas faltantes para información del jugador
ALTER TABLE jugadores 
ADD COLUMN IF NOT EXISTS nombre VARCHAR(255),
ADD COLUMN IF NOT EXISTS apellido VARCHAR(255),
ADD COLUMN IF NOT EXISTS numero_casaca INTEGER,
ADD COLUMN IF NOT EXISTS equipo_id UUID REFERENCES equipos(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS usuario_id UUID REFERENCES usuarios(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS posicion VARCHAR(50),
ADD COLUMN IF NOT EXISTS posicion_principal VARCHAR(100),
ADD COLUMN IF NOT EXISTS foto_url TEXT,
ADD COLUMN IF NOT EXISTS telefono VARCHAR(20),
ADD COLUMN IF NOT EXISTS fecha_nacimiento DATE,
ADD COLUMN IF NOT EXISTS altura VARCHAR(10),
ADD COLUMN IF NOT EXISTS peso VARCHAR(10),
ADD COLUMN IF NOT EXISTS estado VARCHAR(20) DEFAULT 'activo' CHECK (estado IN ('activo', 'inactivo', 'lesionado')),
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;

-- Verificar que activo existe (debería existir)
ALTER TABLE jugadores 
ADD COLUMN IF NOT EXISTS activo BOOLEAN DEFAULT true;

-- Verificar que liga_id existe (debería existir)
ALTER TABLE jugadores 
ADD COLUMN IF NOT EXISTS liga_id UUID REFERENCES ligas(id) ON DELETE CASCADE;

-- ======================================================================
-- PASO 2: ACTUALIZAR CAMPOS EXISTENTES
-- ======================================================================

-- Si nombre no es NOT NULL, lo hacemos opcional por ahora
-- (se puede hacer NOT NULL después de migrar datos)
-- ALTER TABLE jugadores ALTER COLUMN nombre SET NOT NULL; -- Comentado hasta migrar datos

-- Hacer numero_casaca opcional para permitir flexibilidad
ALTER TABLE jugadores ALTER COLUMN numero_casaca DROP NOT NULL;

-- ======================================================================
-- PASO 3: AGREGAR ÍNDICES PARA RENDIMIENTO
-- ======================================================================

-- Índices para búsquedas frecuentes
CREATE INDEX IF NOT EXISTS idx_jugadores_liga_id ON jugadores(liga_id);
CREATE INDEX IF NOT EXISTS idx_jugadores_equipo_id ON jugadores(equipo_id);
CREATE INDEX IF NOT EXISTS idx_jugadores_usuario_id ON jugadores(usuario_id);
CREATE INDEX IF NOT EXISTS idx_jugadores_email ON jugadores(email);
CREATE INDEX IF NOT EXISTS idx_jugadores_activo ON jugadores(activo);
CREATE INDEX IF NOT EXISTS idx_jugadores_numero_casaca_equipo ON jugadores(equipo_id, numero_casaca);

-- ======================================================================
-- PASO 4: AGREGAR CONSTRAINTS ÚNICOS
-- ======================================================================

-- Constraint único para número de casaca por equipo (solo si no existe)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'jugadores_equipo_numero_casaca_unique'
    ) THEN
        ALTER TABLE jugadores 
        ADD CONSTRAINT jugadores_equipo_numero_casaca_unique 
        UNIQUE(equipo_id, numero_casaca);
    END IF;
END $$;

-- ======================================================================
-- PASO 5: ACTUALIZAR TRIGGER PARA updated_at
-- ======================================================================

-- Función para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger para jugadores (recrear si existe)
DROP TRIGGER IF EXISTS update_jugadores_updated_at ON jugadores;
CREATE TRIGGER update_jugadores_updated_at
  BEFORE UPDATE ON jugadores
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ======================================================================
-- PASO 6: ACTUALIZAR POLÍTICAS RLS
-- ======================================================================

-- Eliminar políticas existentes
DROP POLICY IF EXISTS "Ver jugadores de la liga" ON jugadores;
DROP POLICY IF EXISTS "Admins pueden gestionar jugadores" ON jugadores;
DROP POLICY IF EXISTS "Admins pueden crear jugadores" ON jugadores;
DROP POLICY IF EXISTS "Admins pueden actualizar jugadores" ON jugadores;
DROP POLICY IF EXISTS "Admins pueden eliminar jugadores" ON jugadores;

-- Política SELECT: Permitir ver jugadores de la misma liga
CREATE POLICY "Ver jugadores de la liga" ON jugadores
  FOR SELECT 
  USING (
    auth.uid() IS NOT NULL AND
    EXISTS (
      SELECT 1 FROM usuarios u 
      WHERE u.id = auth.uid() 
      AND u.liga_id = jugadores.liga_id
    )
  );

-- Política INSERT: Permitir a admins crear jugadores
CREATE POLICY "Admins pueden crear jugadores" ON jugadores
  FOR INSERT 
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM usuarios u 
      WHERE u.id = auth.uid() 
      AND u.role = 'admin' 
      AND u.liga_id = jugadores.liga_id
    )
  );

-- Política UPDATE: Permitir a admins actualizar jugadores de su liga
CREATE POLICY "Admins pueden actualizar jugadores" ON jugadores
  FOR UPDATE 
  USING (
    EXISTS (
      SELECT 1 FROM usuarios u 
      WHERE u.id = auth.uid() 
      AND u.role = 'admin' 
      AND u.liga_id = jugadores.liga_id
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM usuarios u 
      WHERE u.id = auth.uid() 
      AND u.role = 'admin' 
      AND u.liga_id = jugadores.liga_id
    )
  );

-- Política DELETE: Permitir a admins eliminar jugadores de su liga
CREATE POLICY "Admins pueden eliminar jugadores" ON jugadores
  FOR DELETE 
  USING (
    EXISTS (
      SELECT 1 FROM usuarios u 
      WHERE u.id = auth.uid() 
      AND u.role = 'admin' 
      AND u.liga_id = jugadores.liga_id
    )
  );

-- ======================================================================
-- PASO 7: MIGRAR DATOS EXISTENTES (SI LOS HAY)
-- ======================================================================

-- Si hay registros en jugadores que solo tienen campos de auth,
-- podemos intentar migrar algunos datos básicos desde usuarios si existe relación

-- Esto es opcional y dependería de tener una tabla usuarios con más información
-- UPDATE jugadores 
-- SET nombre = u.nombre, 
--     email = u.email,
--     telefono = u.telefono
-- FROM usuarios u 
-- WHERE jugadores.email = u.email 
-- AND jugadores.nombre IS NULL;

-- ======================================================================
-- PASO 8: COMENTARIOS PARA DOCUMENTACIÓN
-- ======================================================================

COMMENT ON TABLE jugadores IS 'Tabla de jugadores de béisbol con información completa del perfil deportivo';
COMMENT ON COLUMN jugadores.numero_casaca IS 'Número de camiseta del jugador (único por equipo)';
COMMENT ON COLUMN jugadores.posicion IS 'Posición principal del jugador en el campo';
COMMENT ON COLUMN jugadores.posicion_principal IS 'Posición principal detallada del jugador';
COMMENT ON COLUMN jugadores.estado IS 'Estado actual del jugador: activo, inactivo, lesionado';
COMMENT ON COLUMN jugadores.equipo_id IS 'Equipo al que pertenece actualmente el jugador';
COMMENT ON COLUMN jugadores.usuario_id IS 'Referencia al usuario del sistema (opcional)';
COMMENT ON COLUMN jugadores.liga_id IS 'Liga a la que pertenece el jugador';

-- ======================================================================
-- CONFIRMACIÓN
-- ======================================================================

-- Verificar que la tabla tiene todas las columnas necesarias
DO $$
DECLARE
    missing_columns TEXT[];
    col RECORD;
BEGIN
    -- Lista de columnas requeridas
    FOR col IN 
        SELECT unnest(ARRAY['nombre', 'apellido', 'numero_casaca', 'equipo_id', 'usuario_id', 'posicion', 'foto_url', 'liga_id', 'activo', 'created_at', 'updated_at']) AS column_name
    LOOP
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'jugadores' 
            AND column_name = col.column_name 
            AND table_schema = 'public'
        ) THEN
            missing_columns := array_append(missing_columns, col.column_name);
        END IF;
    END LOOP;
    
    IF array_length(missing_columns, 1) > 0 THEN
        RAISE NOTICE 'Columnas faltantes en jugadores: %', array_to_string(missing_columns, ', ');
    ELSE
        RAISE NOTICE '✅ Tabla jugadores tiene todas las columnas necesarias';
    END IF;
END $$;