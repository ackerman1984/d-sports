-- Agregar campos faltantes a la tabla usuarios
ALTER TABLE usuarios 
ADD COLUMN IF NOT EXISTS foto_url TEXT,
ADD COLUMN IF NOT EXISTS numero_casaca INTEGER,
ADD COLUMN IF NOT EXISTS equipo_id UUID REFERENCES equipos(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS posicion VARCHAR(50),
ADD COLUMN IF NOT EXISTS activo BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS ultimo_login TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;

-- Crear índices para mejorar performance
CREATE INDEX IF NOT EXISTS idx_usuarios_equipo_id ON usuarios(equipo_id);
CREATE INDEX IF NOT EXISTS idx_usuarios_liga_id ON usuarios(liga_id);
CREATE INDEX IF NOT EXISTS idx_jugadores_usuario_id ON jugadores(usuario_id);
CREATE INDEX IF NOT EXISTS idx_jugadores_equipo_id ON jugadores(equipo_id);

-- Actualizar función para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Crear triggers para actualizar updated_at
CREATE TRIGGER update_usuarios_updated_at 
    BEFORE UPDATE ON usuarios 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_equipos_updated_at 
    BEFORE UPDATE ON equipos 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_jugadores_updated_at 
    BEFORE UPDATE ON jugadores 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();