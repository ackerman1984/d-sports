-- Agregar campo password_temporal para controlar contraseñas temporales de jugadores
-- Esta migración es parte del flujo de seguridad donde los jugadores deben cambiar
-- su contraseña temporal en el primer login

-- Agregar campo a tabla usuarios
ALTER TABLE usuarios 
ADD COLUMN IF NOT EXISTS password_temporal BOOLEAN DEFAULT false;

-- Agregar campo a tabla jugadores para consistencia
ALTER TABLE jugadores 
ADD COLUMN IF NOT EXISTS password_temporal BOOLEAN DEFAULT false;

-- Crear índice para consultas eficientes
CREATE INDEX IF NOT EXISTS idx_usuarios_password_temporal 
ON usuarios(password_temporal) 
WHERE password_temporal = true;

CREATE INDEX IF NOT EXISTS idx_jugadores_password_temporal 
ON jugadores(password_temporal) 
WHERE password_temporal = true;

-- Comentarios para documentación
COMMENT ON COLUMN usuarios.password_temporal IS 'Indica si el usuario tiene una contraseña temporal que debe cambiar en el primer login';
COMMENT ON COLUMN jugadores.password_temporal IS 'Indica si el jugador tiene una contraseña temporal que debe cambiar en el primer login';