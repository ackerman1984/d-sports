-- Migración para añadir campo activo a configuracion_temporada
-- Permite activar/desactivar temporadas

-- Añadir campo activo (por defecto true para temporadas existentes)
ALTER TABLE configuracion_temporada 
ADD COLUMN IF NOT EXISTS activo BOOLEAN DEFAULT true;

-- Actualizar todas las temporadas existentes para que estén activas
UPDATE configuracion_temporada 
SET activo = true 
WHERE activo IS NULL;

-- Crear índice para mejorar consultas por temporadas activas
CREATE INDEX IF NOT EXISTS idx_configuracion_temporada_activo 
ON configuracion_temporada(liga_id, activo);

-- Comentarios para documentación
COMMENT ON COLUMN configuracion_temporada.activo IS 'Indica si la temporada está activa (visible) o inactiva (oculta)';