-- Migración para mejorar el esquema de jugadores y estadísticas
-- Fecha: 2025-08-11

-- ======================================================================
-- ACTUALIZAR TABLA JUGADORES
-- ======================================================================

-- Agregar nuevas columnas a la tabla jugadores
ALTER TABLE jugadores 
ADD COLUMN IF NOT EXISTS apellido VARCHAR(255),
ADD COLUMN IF NOT EXISTS email VARCHAR(255),
ADD COLUMN IF NOT EXISTS telefono VARCHAR(20),
ADD COLUMN IF NOT EXISTS fecha_nacimiento DATE,
ADD COLUMN IF NOT EXISTS posicion_principal VARCHAR(100),
ADD COLUMN IF NOT EXISTS estado VARCHAR(20) DEFAULT 'activo' CHECK (estado IN ('activo', 'inactivo', 'lesionado')),
ADD COLUMN IF NOT EXISTS altura VARCHAR(10),
ADD COLUMN IF NOT EXISTS peso VARCHAR(10),
ADD COLUMN IF NOT EXISTS liga_id UUID REFERENCES ligas(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;

-- Actualizar campos existentes
ALTER TABLE jugadores 
ALTER COLUMN nombre SET NOT NULL,
ALTER COLUMN numero_casaca DROP NOT NULL; -- Hacer opcional

-- Agregar índices para mejor rendimiento
CREATE INDEX IF NOT EXISTS idx_jugadores_liga_id ON jugadores(liga_id);
CREATE INDEX IF NOT EXISTS idx_jugadores_equipo_id ON jugadores(equipo_id);
CREATE INDEX IF NOT EXISTS idx_jugadores_email ON jugadores(email);

-- ======================================================================
-- CREAR TABLA DE ESTADÍSTICAS DE JUGADORES
-- ======================================================================

CREATE TABLE IF NOT EXISTS estadisticas_jugador (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  jugador_id UUID REFERENCES jugadores(id) ON DELETE CASCADE,
  temporada VARCHAR(10) NOT NULL,
  juegos_jugados INTEGER DEFAULT 0,
  turnos_al_bate INTEGER DEFAULT 0,
  hits INTEGER DEFAULT 0,
  carreras_anotadas INTEGER DEFAULT 0,
  carreras_impulsadas INTEGER DEFAULT 0,
  home_runs INTEGER DEFAULT 0,
  dobles INTEGER DEFAULT 0,
  triples INTEGER DEFAULT 0,
  bases_robadas INTEGER DEFAULT 0,
  ponches INTEGER DEFAULT 0,
  bases_por_bolas INTEGER DEFAULT 0,
  errores INTEGER DEFAULT 0,
  promedio_bateo DECIMAL(4,3) DEFAULT 0.000,
  porcentaje_embase DECIMAL(4,3) DEFAULT 0.000,
  porcentaje_slugging DECIMAL(4,3) DEFAULT 0.000,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(jugador_id, temporada)
);

-- Habilitar RLS para la tabla de estadísticas
ALTER TABLE estadisticas_jugador ENABLE ROW LEVEL SECURITY;

-- Índices para estadísticas
CREATE INDEX IF NOT EXISTS idx_estadisticas_jugador_id ON estadisticas_jugador(jugador_id);
CREATE INDEX IF NOT EXISTS idx_estadisticas_temporada ON estadisticas_jugador(temporada);

-- ======================================================================
-- POLÍTICAS RLS PARA JUGADORES
-- ======================================================================

-- Eliminar políticas existentes si las hay
DROP POLICY IF EXISTS "Ver jugadores de la liga" ON jugadores;
DROP POLICY IF EXISTS "Admins pueden gestionar jugadores" ON jugadores;

-- SELECT: Permitir ver jugadores de la misma liga
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

-- INSERT: Permitir a admins crear jugadores
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

-- UPDATE: Permitir a admins actualizar jugadores de su liga
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

-- DELETE: Permitir a admins eliminar jugadores de su liga
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
-- POLÍTICAS RLS PARA ESTADÍSTICAS
-- ======================================================================

-- SELECT: Permitir ver estadísticas de jugadores de la misma liga
CREATE POLICY "Ver estadísticas de la liga" ON estadisticas_jugador
  FOR SELECT 
  USING (
    auth.uid() IS NOT NULL AND
    EXISTS (
      SELECT 1 FROM usuarios u 
      JOIN jugadores j ON j.liga_id = u.liga_id
      WHERE u.id = auth.uid() 
      AND j.id = estadisticas_jugador.jugador_id
    )
  );

-- INSERT: Permitir a admins y anotadores crear/actualizar estadísticas
CREATE POLICY "Staff puede crear estadísticas" ON estadisticas_jugador
  FOR INSERT 
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM usuarios u 
      JOIN jugadores j ON j.liga_id = u.liga_id
      WHERE u.id = auth.uid() 
      AND u.role IN ('admin', 'anotador')
      AND j.id = estadisticas_jugador.jugador_id
    )
  );

-- UPDATE: Permitir a admins y anotadores actualizar estadísticas
CREATE POLICY "Staff puede actualizar estadísticas" ON estadisticas_jugador
  FOR UPDATE 
  USING (
    EXISTS (
      SELECT 1 FROM usuarios u 
      JOIN jugadores j ON j.liga_id = u.liga_id
      WHERE u.id = auth.uid() 
      AND u.role IN ('admin', 'anotador')
      AND j.id = estadisticas_jugador.jugador_id
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM usuarios u 
      JOIN jugadores j ON j.liga_id = u.liga_id
      WHERE u.id = auth.uid() 
      AND u.role IN ('admin', 'anotador')
      AND j.id = estadisticas_jugador.jugador_id
    )
  );

-- DELETE: Solo admins pueden eliminar estadísticas
CREATE POLICY "Admins pueden eliminar estadísticas" ON estadisticas_jugador
  FOR DELETE 
  USING (
    EXISTS (
      SELECT 1 FROM usuarios u 
      JOIN jugadores j ON j.liga_id = u.liga_id
      WHERE u.id = auth.uid() 
      AND u.role = 'admin'
      AND j.id = estadisticas_jugador.jugador_id
    )
  );

-- ======================================================================
-- FUNCIONES TRIGGER PARA AUTOMATIZACIÓN
-- ======================================================================

-- Función para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger para jugadores
DROP TRIGGER IF EXISTS update_jugadores_updated_at ON jugadores;
CREATE TRIGGER update_jugadores_updated_at
  BEFORE UPDATE ON jugadores
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Trigger para estadísticas
DROP TRIGGER IF EXISTS update_estadisticas_updated_at ON estadisticas_jugador;
CREATE TRIGGER update_estadisticas_updated_at
  BEFORE UPDATE ON estadisticas_jugador
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ======================================================================
-- FUNCIÓN PARA CALCULAR PROMEDIOS AUTOMÁTICAMENTE
-- ======================================================================

CREATE OR REPLACE FUNCTION calcular_promedios_bateo()
RETURNS TRIGGER AS $$
BEGIN
  -- Calcular promedio de bateo
  IF NEW.turnos_al_bate > 0 THEN
    NEW.promedio_bateo = ROUND(CAST(NEW.hits AS DECIMAL) / NEW.turnos_al_bate, 3);
  ELSE
    NEW.promedio_bateo = 0.000;
  END IF;
  
  -- Calcular porcentaje de embase (OBP)
  IF (NEW.turnos_al_bate + NEW.bases_por_bolas) > 0 THEN
    NEW.porcentaje_embase = ROUND(CAST(NEW.hits + NEW.bases_por_bolas AS DECIMAL) / (NEW.turnos_al_bate + NEW.bases_por_bolas), 3);
  ELSE
    NEW.porcentaje_embase = 0.000;
  END IF;
  
  -- Calcular porcentaje de slugging (bases totales / turnos al bate)
  IF NEW.turnos_al_bate > 0 THEN
    NEW.porcentaje_slugging = ROUND(
      CAST(
        (NEW.hits - NEW.dobles - NEW.triples - NEW.home_runs) + -- Sencillos
        (NEW.dobles * 2) + 
        (NEW.triples * 3) + 
        (NEW.home_runs * 4)
        AS DECIMAL
      ) / NEW.turnos_al_bate, 3
    );
  ELSE
    NEW.porcentaje_slugging = 0.000;
  END IF;
  
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger para calcular promedios automáticamente
DROP TRIGGER IF EXISTS calcular_promedios_trigger ON estadisticas_jugador;
CREATE TRIGGER calcular_promedios_trigger
  BEFORE INSERT OR UPDATE ON estadisticas_jugador
  FOR EACH ROW
  EXECUTE FUNCTION calcular_promedios_bateo();

-- ======================================================================
-- COMENTARIOS PARA DOCUMENTACIÓN
-- ======================================================================

COMMENT ON TABLE estadisticas_jugador IS 'Estadísticas detalladas de cada jugador por temporada';
COMMENT ON COLUMN jugadores.estado IS 'Estado del jugador: activo, inactivo, lesionado';
COMMENT ON COLUMN jugadores.liga_id IS 'Liga a la que pertenece el jugador (puede ser diferente al equipo)';

COMMENT ON POLICY "Ver jugadores de la liga" ON jugadores IS 'Permite ver jugadores de la misma liga que el usuario';
COMMENT ON POLICY "Staff puede crear estadísticas" ON estadisticas_jugador IS 'Admins y anotadores pueden crear estadísticas';
COMMENT ON POLICY "Staff puede actualizar estadísticas" ON estadisticas_jugador IS 'Admins y anotadores pueden actualizar estadísticas';