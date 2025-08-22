-- Migración para corregir referencias de tabla anotador_juegos
-- Fecha: 2025-08-17

-- Primero eliminar la tabla anotador_juegos existente si tiene referencias incorrectas
DROP TABLE IF EXISTS anotador_juegos CASCADE;

-- Crear nuevamente la tabla anotador_juegos con la referencia correcta
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

-- Crear índices
CREATE INDEX IF NOT EXISTS idx_anotador_juegos_anotador ON anotador_juegos(anotador_id);
CREATE INDEX IF NOT EXISTS idx_anotador_juegos_juego ON anotador_juegos(juego_id);
CREATE INDEX IF NOT EXISTS idx_anotador_juegos_fecha ON anotador_juegos(fecha_asignacion);

-- Habilitar RLS
ALTER TABLE anotador_juegos ENABLE ROW LEVEL SECURITY;

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

COMMENT ON TABLE anotador_juegos IS 'Historial de asignaciones de anotadores a juegos (corregido)';