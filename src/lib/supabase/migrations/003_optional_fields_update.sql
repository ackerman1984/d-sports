-- Migración para hacer opcionales algunos campos y mejorar la experiencia de usuario
-- Fecha: 2025-08-05

-- Hacer el código de liga opcional (se genera automáticamente)
ALTER TABLE ligas ALTER COLUMN codigo DROP NOT NULL;

-- Hacer el subdominio opcional (se genera automáticamente)  
ALTER TABLE ligas ALTER COLUMN subdominio DROP NOT NULL;

-- Hacer la foto opcional en usuarios (se sube después del registro)
ALTER TABLE usuarios ALTER COLUMN foto_url DROP NOT NULL;

-- Hacer el teléfono opcional en usuarios
ALTER TABLE usuarios ALTER COLUMN telefono DROP NOT NULL;

-- Hacer el equipo_id opcional en usuarios (jugadores pueden registrarse sin equipo inicialmente)
ALTER TABLE usuarios ALTER COLUMN equipo_id DROP NOT NULL;

-- Hacer el numero_casaca opcional en usuarios (se puede asignar después)
ALTER TABLE usuarios ALTER COLUMN numero_casaca DROP NOT NULL;

-- Actualizar constraint UNIQUE para codigo - permitir NULL
ALTER TABLE ligas DROP CONSTRAINT IF EXISTS ligas_codigo_key;
CREATE UNIQUE INDEX ligas_codigo_unique ON ligas (codigo) WHERE codigo IS NOT NULL;

-- Actualizar constraint UNIQUE para subdominio - permitir NULL  
ALTER TABLE ligas DROP CONSTRAINT IF EXISTS ligas_subdominio_key;
CREATE UNIQUE INDEX ligas_subdominio_unique ON ligas (subdominio) WHERE subdominio IS NOT NULL;

-- Agregar índice para búsquedas frecuentes
CREATE INDEX IF NOT EXISTS idx_usuarios_email ON usuarios(email);
CREATE INDEX IF NOT EXISTS idx_ligas_nombre ON ligas(nombre);
CREATE INDEX IF NOT EXISTS idx_equipos_nombre ON equipos(nombre);

-- Comentarios para documentar los cambios
COMMENT ON COLUMN ligas.codigo IS 'Código de liga generado automáticamente, opcional';
COMMENT ON COLUMN ligas.subdominio IS 'Subdominio generado automáticamente, opcional';
COMMENT ON COLUMN usuarios.foto_url IS 'URL de foto del usuario, se puede subir después del registro';
COMMENT ON COLUMN usuarios.equipo_id IS 'ID del equipo, opcional para usuarios que no son jugadores';
COMMENT ON COLUMN usuarios.numero_casaca IS 'Número de camiseta, opcional, se puede asignar después';