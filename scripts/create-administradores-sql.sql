-- Crear tabla administradores
CREATE TABLE IF NOT EXISTS administradores (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nombre TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  activo BOOLEAN DEFAULT true,
  liga_id UUID REFERENCES ligas(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Crear índices
CREATE INDEX IF NOT EXISTS administradores_liga_id_idx ON administradores(liga_id);
CREATE INDEX IF NOT EXISTS administradores_email_idx ON administradores(email);
CREATE INDEX IF NOT EXISTS administradores_activo_idx ON administradores(activo);

-- Habilitar Row Level Security
ALTER TABLE administradores ENABLE ROW LEVEL SECURITY;

-- Crear políticas RLS
CREATE POLICY IF NOT EXISTS "Users can read their own admin profile" ON administradores
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY IF NOT EXISTS "Users can update their own admin profile" ON administradores
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY IF NOT EXISTS "Service role has full access to administradores" ON administradores
  FOR ALL USING (current_setting('role') = 'service_role');