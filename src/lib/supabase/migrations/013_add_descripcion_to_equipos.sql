-- Agregar columna descripcion a la tabla equipos
ALTER TABLE equipos 
ADD COLUMN descripcion TEXT;

-- Agregar comentario para documentar el cambio
COMMENT ON COLUMN equipos.descripcion IS 'Descripción opcional del equipo';