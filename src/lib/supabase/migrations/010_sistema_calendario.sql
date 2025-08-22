-- ======================================================================
-- SISTEMA DE CALENDARIO AUTOMÁTICO - FASE 1: LIGA BÁSICA
-- ======================================================================
-- Fecha: 2025-08-15
-- Descripción: Sistema completo de generación automática de calendarios

-- ======================================================================
-- 1. CONFIGURACIÓN DE TEMPORADA
-- ======================================================================

CREATE TABLE IF NOT EXISTS configuracion_temporada (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    liga_id UUID NOT NULL REFERENCES ligas(id) ON DELETE CASCADE,
    nombre VARCHAR(255) NOT NULL, -- "Temporada 2025"
    fecha_inicio DATE NOT NULL, -- Primer sábado
    fecha_fin DATE NOT NULL, -- Último sábado regular
    playoffs_inicio DATE, -- Inicio de playoffs
    max_juegos_por_sabado INTEGER DEFAULT 5,
    vueltas_programadas INTEGER DEFAULT 2, -- Cuántas vueltas
    estado VARCHAR(20) DEFAULT 'configuracion' CHECK (estado IN ('configuracion', 'activa', 'cerrada', 'playoffs')),
    auto_generar BOOLEAN DEFAULT true, -- Generar automáticamente al cerrar registro
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(liga_id, nombre)
);

-- ======================================================================
-- 2. CAMPOS DE JUEGO DINÁMICOS
-- ======================================================================

CREATE TABLE IF NOT EXISTS campos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    liga_id UUID NOT NULL REFERENCES ligas(id) ON DELETE CASCADE,
    nombre VARCHAR(100) NOT NULL, -- Campo1, Campo2, Campo3
    descripcion TEXT,
    ubicacion TEXT,
    activo BOOLEAN DEFAULT true,
    orden INTEGER DEFAULT 1, -- Para rotar campos
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(liga_id, nombre)
);

-- ======================================================================
-- 3. HORARIOS CONFIGURABLES
-- ======================================================================

CREATE TABLE IF NOT EXISTS horarios (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    liga_id UUID NOT NULL REFERENCES ligas(id) ON DELETE CASCADE,
    nombre VARCHAR(50) NOT NULL, -- M1, M2, T1
    hora_inicio TIME NOT NULL, -- 08:00, 12:00, 15:00
    hora_fin TIME NOT NULL, -- 11:30, 14:30, 17:30
    activo_por_defecto BOOLEAN DEFAULT true, -- T1 = false (solo overflow)
    orden INTEGER DEFAULT 1,
    descripcion TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(liga_id, nombre)
);

-- ======================================================================
-- 4. SÁBADOS ESPECIALES (FERIADOS, FLEX)
-- ======================================================================

CREATE TABLE IF NOT EXISTS sabados_especiales (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    liga_id UUID NOT NULL REFERENCES ligas(id) ON DELETE CASCADE,
    temporada_id UUID REFERENCES configuracion_temporada(id) ON DELETE CASCADE,
    fecha DATE NOT NULL,
    tipo VARCHAR(20) NOT NULL CHECK (tipo IN ('feriado', 'flex', 'mantenimiento')),
    descripcion TEXT,
    activo BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(liga_id, fecha)
);

-- ======================================================================
-- 5. JORNADAS (SÁBADOS DEL CALENDARIO)
-- ======================================================================

CREATE TABLE IF NOT EXISTS jornadas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    temporada_id UUID NOT NULL REFERENCES configuracion_temporada(id) ON DELETE CASCADE,
    numero_jornada INTEGER NOT NULL,
    fecha DATE NOT NULL, -- Sábado
    vuelta INTEGER NOT NULL, -- 1, 2, 3...
    ronda INTEGER, -- Dentro de la vuelta (opcional)
    tipo VARCHAR(20) DEFAULT 'regular' CHECK (tipo IN ('regular', 'flex', 'playoffs')),
    estado VARCHAR(20) DEFAULT 'programada' CHECK (estado IN ('programada', 'en_progreso', 'completada', 'suspendida')),
    capacidad_maxima INTEGER DEFAULT 5, -- Calculada automáticamente
    partidos_programados INTEGER DEFAULT 0,
    notas TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(temporada_id, numero_jornada),
    UNIQUE(temporada_id, fecha)
);

-- ======================================================================
-- 6. PARTIDOS DEL CALENDARIO
-- ======================================================================

CREATE TABLE IF NOT EXISTS partidos_calendario (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    jornada_id UUID NOT NULL REFERENCES jornadas(id) ON DELETE CASCADE,
    temporada_id UUID NOT NULL REFERENCES configuracion_temporada(id) ON DELETE CASCADE,
    equipo_local_id UUID REFERENCES equipos(id) ON DELETE CASCADE,
    equipo_visitante_id UUID REFERENCES equipos(id) ON DELETE CASCADE,
    campo_id UUID REFERENCES campos(id) ON DELETE SET NULL,
    horario_id UUID REFERENCES horarios(id) ON DELETE SET NULL,
    
    -- Información del partido
    numero_partido INTEGER, -- Dentro de la jornada
    vuelta INTEGER NOT NULL,
    es_bye BOOLEAN DEFAULT false, -- Para equipos impares
    
    -- Estado y gestión
    estado VARCHAR(20) DEFAULT 'programado' CHECK (estado IN ('programado', 'confirmado', 'en_progreso', 'finalizado', 'pospuesto', 'cancelado')),
    fecha_programada DATE, -- Fecha original (puede diferir de jornada.fecha si se reprograma)
    hora_programada TIME, -- Hora específica calculada
    
    -- Reprogramaciones
    reprogramado_desde UUID REFERENCES partidos_calendario(id),
    motivo_reprogramacion TEXT,
    fecha_reprogramacion TIMESTAMP WITH TIME ZONE,
    
    -- Resultado (cuando se juega)
    marcador_local INTEGER,
    marcador_visitante INTEGER,
    
    -- Metadatos
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Restricciones
    CHECK (NOT (equipo_local_id IS NULL AND equipo_visitante_id IS NULL AND es_bye = false)),
    CHECK (es_bye = false OR (equipo_local_id IS NOT NULL AND equipo_visitante_id IS NULL))
);

-- ======================================================================
-- 7. CONTROL DE DESCANSOS 5+1
-- ======================================================================

CREATE TABLE IF NOT EXISTS contador_descansos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    equipo_id UUID NOT NULL REFERENCES equipos(id) ON DELETE CASCADE,
    temporada_id UUID NOT NULL REFERENCES configuracion_temporada(id) ON DELETE CASCADE,
    juegos_jugados INTEGER DEFAULT 0,
    juegos_programados INTEGER DEFAULT 0, -- Incluye futuros
    necesita_descanso BOOLEAN DEFAULT false,
    proximo_descanso_jornada INTEGER, -- Número de jornada del próximo descanso
    ultimo_descanso_fecha DATE,
    ultimo_juego_fecha DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(equipo_id, temporada_id)
);

-- ======================================================================
-- 8. LOG DE GENERACIÓN (AUDITORÍA)
-- ======================================================================

CREATE TABLE IF NOT EXISTS log_generacion_calendario (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    temporada_id UUID NOT NULL REFERENCES configuracion_temporada(id) ON DELETE CASCADE,
    usuario_id UUID REFERENCES usuarios(id) ON DELETE SET NULL,
    accion VARCHAR(50) NOT NULL, -- 'generar', 'regenerar', 'reprogramar'
    parametros JSONB, -- Configuración usada
    resultado JSONB, -- Estadísticas del resultado
    tiempo_procesamiento INTEGER, -- Milisegundos
    errores TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ======================================================================
-- ÍNDICES PARA PERFORMANCE
-- ======================================================================

-- Configuración temporada
CREATE INDEX IF NOT EXISTS idx_config_temporada_liga ON configuracion_temporada(liga_id);
CREATE INDEX IF NOT EXISTS idx_config_temporada_estado ON configuracion_temporada(estado);
CREATE INDEX IF NOT EXISTS idx_config_temporada_fechas ON configuracion_temporada(fecha_inicio, fecha_fin);

-- Campos y horarios
CREATE INDEX IF NOT EXISTS idx_campos_liga_activo ON campos(liga_id, activo);
CREATE INDEX IF NOT EXISTS idx_horarios_liga_activo ON horarios(liga_id, activo_por_defecto);

-- Sábados especiales
CREATE INDEX IF NOT EXISTS idx_sabados_especiales_fecha ON sabados_especiales(liga_id, fecha);
CREATE INDEX IF NOT EXISTS idx_sabados_especiales_tipo ON sabados_especiales(tipo, activo);

-- Jornadas
CREATE INDEX IF NOT EXISTS idx_jornadas_temporada ON jornadas(temporada_id);
CREATE INDEX IF NOT EXISTS idx_jornadas_fecha ON jornadas(fecha);
CREATE INDEX IF NOT EXISTS idx_jornadas_vuelta ON jornadas(temporada_id, vuelta);

-- Partidos calendario
CREATE INDEX IF NOT EXISTS idx_partidos_jornada ON partidos_calendario(jornada_id);
CREATE INDEX IF NOT EXISTS idx_partidos_temporada ON partidos_calendario(temporada_id);
CREATE INDEX IF NOT EXISTS idx_partidos_equipos ON partidos_calendario(equipo_local_id, equipo_visitante_id);
CREATE INDEX IF NOT EXISTS idx_partidos_fecha ON partidos_calendario(fecha_programada);
CREATE INDEX IF NOT EXISTS idx_partidos_estado ON partidos_calendario(estado);

-- Contador descansos
CREATE INDEX IF NOT EXISTS idx_contador_equipo_temporada ON contador_descansos(equipo_id, temporada_id);
CREATE INDEX IF NOT EXISTS idx_contador_necesita_descanso ON contador_descansos(temporada_id, necesita_descanso);

-- Log generación
CREATE INDEX IF NOT EXISTS idx_log_generacion_temporada ON log_generacion_calendario(temporada_id);
CREATE INDEX IF NOT EXISTS idx_log_generacion_fecha ON log_generacion_calendario(created_at);

-- ======================================================================
-- POLÍTICAS RLS (ROW LEVEL SECURITY)
-- ======================================================================

-- Configuración temporada
ALTER TABLE configuracion_temporada ENABLE ROW LEVEL SECURITY;
CREATE POLICY "config_temporada_liga_access" ON configuracion_temporada
    FOR ALL USING (
        liga_id IN (
            SELECT liga_id FROM usuarios WHERE id = auth.uid()
        )
    );

-- Campos
ALTER TABLE campos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "campos_liga_access" ON campos
    FOR ALL USING (
        liga_id IN (
            SELECT liga_id FROM usuarios WHERE id = auth.uid()
        )
    );

-- Horarios
ALTER TABLE horarios ENABLE ROW LEVEL SECURITY;
CREATE POLICY "horarios_liga_access" ON horarios
    FOR ALL USING (
        liga_id IN (
            SELECT liga_id FROM usuarios WHERE id = auth.uid()
        )
    );

-- Sábados especiales
ALTER TABLE sabados_especiales ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sabados_especiales_liga_access" ON sabados_especiales
    FOR ALL USING (
        liga_id IN (
            SELECT liga_id FROM usuarios WHERE id = auth.uid()
        )
    );

-- Jornadas
ALTER TABLE jornadas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "jornadas_temporada_access" ON jornadas
    FOR ALL USING (
        temporada_id IN (
            SELECT ct.id FROM configuracion_temporada ct
            JOIN usuarios u ON u.liga_id = ct.liga_id
            WHERE u.id = auth.uid()
        )
    );

-- Partidos calendario
ALTER TABLE partidos_calendario ENABLE ROW LEVEL SECURITY;
CREATE POLICY "partidos_calendario_access" ON partidos_calendario
    FOR ALL USING (
        temporada_id IN (
            SELECT ct.id FROM configuracion_temporada ct
            JOIN usuarios u ON u.liga_id = ct.liga_id
            WHERE u.id = auth.uid()
        )
    );

-- Contador descansos
ALTER TABLE contador_descansos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "contador_descansos_access" ON contador_descansos
    FOR ALL USING (
        temporada_id IN (
            SELECT ct.id FROM configuracion_temporada ct
            JOIN usuarios u ON u.liga_id = ct.liga_id
            WHERE u.id = auth.uid()
        )
    );

-- Log generación (solo lectura para admins)
ALTER TABLE log_generacion_calendario ENABLE ROW LEVEL SECURITY;
CREATE POLICY "log_generacion_admin_access" ON log_generacion_calendario
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM usuarios u
            WHERE u.id = auth.uid()
            AND u.role = 'admin'
            AND u.liga_id IN (
                SELECT ct.liga_id FROM configuracion_temporada ct
                WHERE ct.id = log_generacion_calendario.temporada_id
            )
        )
    );

-- ======================================================================
-- COMENTARIOS PARA DOCUMENTACIÓN
-- ======================================================================

COMMENT ON TABLE configuracion_temporada IS 'Configuración principal de cada temporada de la liga';
COMMENT ON TABLE campos IS 'Campos de juego disponibles por liga (configurables)';
COMMENT ON TABLE horarios IS 'Horarios de juego configurables por liga';
COMMENT ON TABLE sabados_especiales IS 'Sábados marcados como feriados, flex o mantenimiento';
COMMENT ON TABLE jornadas IS 'Sábados programados con partidos (jornadas del calendario)';
COMMENT ON TABLE partidos_calendario IS 'Partidos generados automáticamente por el sistema';
COMMENT ON TABLE contador_descansos IS 'Control de la regla 5+1 (descanso cada 5 juegos)';
COMMENT ON TABLE log_generacion_calendario IS 'Auditoría de generaciones y cambios del calendario';

COMMENT ON COLUMN configuracion_temporada.auto_generar IS 'Si debe generar automáticamente al cerrar registro de equipos';
COMMENT ON COLUMN partidos_calendario.es_bye IS 'Indica si es un BYE (equipo descansa) para ligas con número impar de equipos';
COMMENT ON COLUMN contador_descansos.proximo_descanso_jornada IS 'Jornada calculada para el próximo descanso del equipo';

-- ======================================================================
-- DATOS INICIALES (CAMPOS Y HORARIOS POR DEFECTO)
-- ======================================================================

-- Función para crear campos y horarios por defecto cuando se crea una liga
CREATE OR REPLACE FUNCTION crear_configuracion_default_liga(p_liga_id UUID)
RETURNS VOID AS $$
BEGIN
    -- Crear campos por defecto
    INSERT INTO campos (liga_id, nombre, descripcion, orden) VALUES
    (p_liga_id, 'Campo 1', 'Campo principal de juego', 1),
    (p_liga_id, 'Campo 2', 'Campo secundario de juego', 2)
    ON CONFLICT (liga_id, nombre) DO NOTHING;
    
    -- Crear horarios por defecto
    INSERT INTO horarios (liga_id, nombre, hora_inicio, hora_fin, activo_por_defecto, orden, descripcion) VALUES
    (p_liga_id, 'M1', '08:00', '11:30', true, 1, 'Matutino temprano'),
    (p_liga_id, 'M2', '12:00', '14:30', true, 2, 'Matutino tardío'),
    (p_liga_id, 'T1', '15:00', '17:30', false, 3, 'Vespertino (solo overflow)')
    ON CONFLICT (liga_id, nombre) DO NOTHING;
END;
$$ LANGUAGE plpgsql;

-- ======================================================================
-- FIN DE MIGRACIÓN
-- ======================================================================