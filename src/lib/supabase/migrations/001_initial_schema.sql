-- Habilitar extensiones necesarias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Tabla de ligas
CREATE TABLE ligas (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nombre VARCHAR(255) NOT NULL,
  codigo VARCHAR(20) UNIQUE NOT NULL,
  subdominio VARCHAR(50) UNIQUE NOT NULL,
  activa BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Tabla de usuarios con roles
CREATE TABLE usuarios (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email VARCHAR(255) UNIQUE NOT NULL,
  nombre VARCHAR(255) NOT NULL,
  telefono VARCHAR(20),
  role VARCHAR(20) NOT NULL CHECK (role IN ('admin', 'anotador', 'jugador')),
  liga_id UUID REFERENCES ligas(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Tabla de temporadas
CREATE TABLE temporadas (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  liga_id UUID REFERENCES ligas(id) ON DELETE CASCADE,
  nombre VARCHAR(255) NOT NULL,
  fecha_inicio DATE NOT NULL,
  fecha_fin DATE NOT NULL,
  activa BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Tabla de equipos
CREATE TABLE equipos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  liga_id UUID REFERENCES ligas(id) ON DELETE CASCADE,
  nombre VARCHAR(255) NOT NULL,
  color VARCHAR(7) DEFAULT '#000000',
  logo_url TEXT,
  activo BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Tabla de jugadores
CREATE TABLE jugadores (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  equipo_id UUID REFERENCES equipos(id) ON DELETE CASCADE,
  usuario_id UUID REFERENCES usuarios(id) ON DELETE SET NULL,
  nombre VARCHAR(255) NOT NULL,
  numero_casaca INTEGER NOT NULL,
  posicion VARCHAR(50),
  foto_url TEXT,
  activo BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(equipo_id, numero_casaca)
);

-- Habilitar Row Level Security
ALTER TABLE ligas ENABLE ROW LEVEL SECURITY;
ALTER TABLE usuarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE temporadas ENABLE ROW LEVEL SECURITY;
ALTER TABLE equipos ENABLE ROW LEVEL SECURITY;
ALTER TABLE jugadores ENABLE ROW LEVEL SECURITY;