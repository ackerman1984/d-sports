-- Migración para mejorar el sistema de roles y registro de usuarios
-- Fecha: 2025-08-05

-- Actualizar tabla usuarios para mejor soporte de roles
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS foto_url TEXT;
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS numero_casaca INTEGER;
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS equipo_id UUID REFERENCES equipos(id) ON DELETE SET NULL;
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS activo BOOLEAN DEFAULT true;
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS ultimo_login TIMESTAMP WITH TIME ZONE;

-- Tabla para asignación de anotadores a juegos
CREATE TABLE IF NOT EXISTS anotador_juegos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  anotador_id UUID REFERENCES usuarios(id) ON DELETE CASCADE,
  juego_id UUID REFERENCES partidos_calendario(id) ON DELETE CASCADE,
  asignado_por UUID REFERENCES usuarios(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(anotador_id, juego_id)
);

-- Tabla de juegos (si no existe)
CREATE TABLE IF NOT EXISTS juegos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  temporada_id UUID REFERENCES temporadas(id) ON DELETE CASCADE,
  equipo_local_id UUID REFERENCES equipos(id) ON DELETE CASCADE,  
  equipo_visitante_id UUID REFERENCES equipos(id) ON DELETE CASCADE,
  fecha TIMESTAMP WITH TIME ZONE NOT NULL,
  estado VARCHAR(20) DEFAULT 'programado' CHECK (estado IN ('programado', 'en_progreso', 'finalizado', 'suspendido')),
  marcador_local INTEGER DEFAULT 0,
  marcador_visitante INTEGER DEFAULT 0,
  anotador_id UUID REFERENCES usuarios(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Tabla de estadísticas de jugador por juego
CREATE TABLE IF NOT EXISTS estadisticas_jugador (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  jugador_id UUID REFERENCES jugadores(id) ON DELETE CASCADE,
  juego_id UUID REFERENCES partidos_calendario(id) ON DELETE CASCADE,
  turnos INTEGER DEFAULT 0,
  hits INTEGER DEFAULT 0,
  carreras INTEGER DEFAULT 0,
  impulsadas INTEGER DEFAULT 0,
  home_runs INTEGER DEFAULT 0,
  bases_robadas INTEGER DEFAULT 0,
  ponches INTEGER DEFAULT 0,
  base_por_bolas INTEGER DEFAULT 0,
  errores INTEGER DEFAULT 0,
  registrado_por UUID REFERENCES usuarios(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(jugador_id, juego_id)
);

-- Índices para mejorar performance
CREATE INDEX IF NOT EXISTS idx_usuarios_role ON usuarios(role);
CREATE INDEX IF NOT EXISTS idx_usuarios_liga_id ON usuarios(liga_id);
CREATE INDEX IF NOT EXISTS idx_usuarios_equipo_id ON usuarios(equipo_id);
CREATE INDEX IF NOT EXISTS idx_anotador_juegos_anotador ON anotador_juegos(anotador_id);
CREATE INDEX IF NOT EXISTS idx_juegos_fecha ON juegos(fecha);
CREATE INDEX IF NOT EXISTS idx_juegos_estado ON juegos(estado);

-- Políticas RLS para usuarios
DROP POLICY IF EXISTS "Usuarios pueden ver usuarios de su liga" ON usuarios;
CREATE POLICY "Usuarios pueden ver usuarios de su liga" ON usuarios
  FOR SELECT USING (liga_id = (SELECT liga_id FROM usuarios WHERE id = auth.uid()));

DROP POLICY IF EXISTS "Usuarios pueden actualizar su propio perfil" ON usuarios;
CREATE POLICY "Usuarios pueden actualizar su propio perfil" ON usuarios
  FOR UPDATE USING (id = auth.uid());

DROP POLICY IF EXISTS "Admins pueden gestionar usuarios de su liga" ON usuarios;
CREATE POLICY "Admins pueden gestionar usuarios de su liga" ON usuarios
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM usuarios u 
      WHERE u.id = auth.uid() 
      AND u.role = 'admin' 
      AND u.liga_id = usuarios.liga_id
    )
  );

-- Políticas RLS para anotador_juegos
ALTER TABLE anotador_juegos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anotadores pueden ver sus asignaciones" ON anotador_juegos
  FOR SELECT USING (anotador_id = auth.uid());

CREATE POLICY "Admins pueden gestionar asignaciones de anotadores" ON anotador_juegos
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM usuarios u 
      WHERE u.id = auth.uid() 
      AND u.role = 'admin'
    )
  );

-- Políticas RLS para juegos
ALTER TABLE juegos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuarios pueden ver juegos de su liga" ON juegos
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM usuarios u, temporadas t
      WHERE u.id = auth.uid() 
      AND t.id = juegos.temporada_id
      AND t.liga_id = u.liga_id
    )
  );

CREATE POLICY "Anotadores pueden actualizar juegos asignados" ON juegos
  FOR UPDATE USING (
    anotador_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM anotador_juegos aj
      WHERE aj.juego_id = juegos.id 
      AND aj.anotador_id = auth.uid()
    )
  );

-- Políticas RLS para estadísticas
ALTER TABLE estadisticas_jugador ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuarios pueden ver estadísticas de su liga" ON estadisticas_jugador
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM usuarios u, jugadores j, equipos e
      WHERE u.id = auth.uid() 
      AND j.id = estadisticas_jugador.jugador_id
      AND e.id = j.equipo_id
      AND e.liga_id = u.liga_id
    )
  );

CREATE POLICY "Anotadores pueden registrar estadísticas" ON estadisticas_jugador
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM usuarios u
      WHERE u.id = auth.uid() 
      AND u.role IN ('admin', 'anotador')
    )
  );

CREATE POLICY "Anotadores pueden actualizar estadísticas que registraron" ON estadisticas_jugador
  FOR UPDATE USING (
    registrado_por = auth.uid() OR
    EXISTS (
      SELECT 1 FROM usuarios u
      WHERE u.id = auth.uid() 
      AND u.role = 'admin'
    )
  );

-- Función para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger para actualizar updated_at en estadísticas
DROP TRIGGER IF EXISTS update_estadisticas_updated_at ON estadisticas_jugador;
CREATE TRIGGER update_estadisticas_updated_at
    BEFORE UPDATE ON estadisticas_jugador
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Trigger para actualizar updated_at en ligas
DROP TRIGGER IF EXISTS update_ligas_updated_at ON ligas;
CREATE TRIGGER update_ligas_updated_at
    BEFORE UPDATE ON ligas
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();