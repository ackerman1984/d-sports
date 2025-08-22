-- Crear tabla de anotadores
-- Fecha: 2025-08-14

-- ======================================================================
-- CREAR TABLA ANOTADORES
-- ======================================================================

CREATE TABLE IF NOT EXISTS anotadores (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre VARCHAR(255) NOT NULL,
    telefono VARCHAR(50) NOT NULL,
    email VARCHAR(255) NOT NULL,
    foto_url TEXT,
    codigo_acceso VARCHAR(20) NOT NULL UNIQUE,
    liga_id UUID NOT NULL REFERENCES ligas(id) ON DELETE CASCADE,
    created_by UUID REFERENCES usuarios(id),
    activo BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ======================================================================
-- CREAR ÍNDICES
-- ======================================================================

CREATE INDEX IF NOT EXISTS idx_anotadores_liga_id ON anotadores(liga_id);
CREATE INDEX IF NOT EXISTS idx_anotadores_codigo_acceso ON anotadores(codigo_acceso);
CREATE INDEX IF NOT EXISTS idx_anotadores_email_liga ON anotadores(email, liga_id);
CREATE INDEX IF NOT EXISTS idx_anotadores_activo ON anotadores(activo);

-- ======================================================================
-- CREAR TABLA HISTORIAL DE ANOTACIONES (para tracking)
-- ======================================================================

CREATE TABLE IF NOT EXISTS anotador_juegos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    anotador_id UUID NOT NULL REFERENCES anotadores(id) ON DELETE CASCADE,
    juego_id UUID NOT NULL REFERENCES partidos_calendario(id) ON DELETE CASCADE,
    fecha_asignacion TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    fecha_completado TIMESTAMP WITH TIME ZONE,
    notas TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Un anotador por juego
    UNIQUE(juego_id)
);

-- ======================================================================
-- CREAR ÍNDICES PARA HISTORIAL
-- ======================================================================

CREATE INDEX IF NOT EXISTS idx_anotador_juegos_anotador ON anotador_juegos(anotador_id);
CREATE INDEX IF NOT EXISTS idx_anotador_juegos_juego ON anotador_juegos(juego_id);
CREATE INDEX IF NOT EXISTS idx_anotador_juegos_fecha ON anotador_juegos(fecha_asignacion);

-- ======================================================================
-- POLÍTICAS RLS
-- ======================================================================

-- Habilitar RLS
ALTER TABLE anotadores ENABLE ROW LEVEL SECURITY;
ALTER TABLE anotador_juegos ENABLE ROW LEVEL SECURITY;

-- Políticas para anotadores
CREATE POLICY "anotadores_admin_full_access" ON anotadores
    FOR ALL 
    USING (
        auth.uid() IS NOT NULL AND
        EXISTS (
            SELECT 1 FROM usuarios u 
            WHERE u.id = auth.uid() 
            AND u.role = 'admin' 
            AND u.liga_id = anotadores.liga_id
        )
    );

-- Políticas para anotador_juegos
CREATE POLICY "anotador_juegos_admin_access" ON anotador_juegos
    FOR ALL 
    USING (
        auth.uid() IS NOT NULL AND
        EXISTS (
            SELECT 1 FROM usuarios u 
            WHERE u.id = auth.uid() 
            AND u.role = 'admin'
            AND EXISTS (
                SELECT 1 FROM anotadores a 
                WHERE a.id = anotador_juegos.anotador_id 
                AND a.liga_id = u.liga_id
            )
        )
    );

-- Política para que anotadores vean sus propias asignaciones
CREATE POLICY "anotador_juegos_own_access" ON anotador_juegos
    FOR SELECT 
    USING (
        EXISTS (
            SELECT 1 FROM anotadores a 
            WHERE a.id = anotador_juegos.anotador_id 
            AND a.email = auth.jwt() ->> 'email'
        )
    );

-- ======================================================================
-- COMENTARIOS
-- ======================================================================

COMMENT ON TABLE anotadores IS 'Anotadores registrados por los administradores de liga';
COMMENT ON TABLE anotador_juegos IS 'Historial de asignaciones de anotadores a juegos';
COMMENT ON COLUMN anotadores.codigo_acceso IS 'Código único para acceso del anotador';
COMMENT ON COLUMN anotador_juegos.fecha_completado IS 'Fecha cuando el anotador completó la anotación del juego';