-- Sistema de Control Maestro - Super Admin
-- Permite al creador controlar el acceso de administradores de liga
-- Fecha: 2025-08-05

-- ======================================================================
-- AGREGAR CAMPOS DE CONTROL A LIGAS
-- ======================================================================

-- Estado de autorización de la liga
ALTER TABLE ligas ADD COLUMN IF NOT EXISTS authorized BOOLEAN DEFAULT false;
ALTER TABLE ligas ADD COLUMN IF NOT EXISTS authorization_code VARCHAR(50);
ALTER TABLE ligas ADD COLUMN IF NOT EXISTS authorized_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE ligas ADD COLUMN IF NOT EXISTS authorized_by VARCHAR(255);
ALTER TABLE ligas ADD COLUMN IF NOT EXISTS suspended_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE ligas ADD COLUMN IF NOT EXISTS suspension_reason TEXT;

-- ======================================================================
-- TABLA DE SUPER ADMINISTRADORES
-- ======================================================================

CREATE TABLE IF NOT EXISTS super_admins (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  master_code VARCHAR(100) NOT NULL,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ======================================================================
-- TABLA DE CÓDIGOS DE AUTORIZACIÓN
-- ======================================================================

CREATE TABLE IF NOT EXISTS authorization_codes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code VARCHAR(50) UNIQUE NOT NULL,
  liga_id UUID REFERENCES ligas(id) ON DELETE CASCADE,
  created_by VARCHAR(255) NOT NULL, -- Email del super admin
  used_at TIMESTAMP WITH TIME ZONE,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ======================================================================
-- TABLA DE LOGS DE ACCESO
-- ======================================================================

CREATE TABLE IF NOT EXISTS access_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  liga_id UUID REFERENCES ligas(id) ON DELETE CASCADE,
  admin_email VARCHAR(255) NOT NULL,
  action VARCHAR(50) NOT NULL, -- 'authorized', 'suspended', 'reactivated'
  performed_by VARCHAR(255) NOT NULL, -- Email del super admin
  reason TEXT,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ======================================================================
-- INSERTAR SUPER ADMIN INICIAL
-- ======================================================================

-- Insertar el creador como super admin inicial
INSERT INTO super_admins (email, name, master_code, active) 
VALUES (
  'creator@baseball-saas.com', -- CAMBIAR POR TU EMAIL
  'Creator',
  'MASTER-2024-BASEBALL', -- CAMBIAR POR TU CÓDIGO MAESTRO
  true
) ON CONFLICT (email) DO NOTHING;

-- ======================================================================
-- FUNCIONES DE UTILIDAD
-- ======================================================================

-- Función para generar códigos de autorización únicos
CREATE OR REPLACE FUNCTION generate_authorization_code()
RETURNS VARCHAR(50) AS $$
DECLARE
  new_code VARCHAR(50);
  code_exists BOOLEAN;
BEGIN
  LOOP
    -- Generar código de 12 caracteres: AUTH-XXXXXXXX
    new_code := 'AUTH-' || upper(substring(md5(random()::text) from 1 for 8));
    
    -- Verificar si el código ya existe
    SELECT EXISTS(SELECT 1 FROM authorization_codes WHERE code = new_code) INTO code_exists;
    
    -- Si no existe, salir del loop
    IF NOT code_exists THEN
      EXIT;
    END IF;
  END LOOP;
  
  RETURN new_code;
END;
$$ LANGUAGE plpgsql;

-- Función para verificar si una liga está autorizada
CREATE OR REPLACE FUNCTION is_league_authorized(league_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM ligas 
    WHERE id = league_id 
    AND authorized = true 
    AND suspended_at IS NULL
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función para verificar si un email es super admin
CREATE OR REPLACE FUNCTION is_super_admin(email_address VARCHAR)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM super_admins 
    WHERE email = email_address 
    AND active = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ======================================================================
-- ACTUALIZAR POLÍTICAS RLS
-- ======================================================================

-- Las ligas solo pueden ser vistas si están autorizadas (excepto por super admins)
DROP POLICY IF EXISTS "Usuarios autenticados pueden ver ligas" ON ligas;
CREATE POLICY "Ver ligas autorizadas" ON ligas
  FOR SELECT 
  USING (
    authorized = true AND suspended_at IS NULL
  );

-- Super admins pueden ver todas las ligas
CREATE POLICY "Super admins ven todas las ligas" ON ligas
  FOR ALL 
  USING (
    is_super_admin((SELECT email FROM usuarios WHERE id = auth.uid()))
  );

-- Los usuarios solo pueden acceder si su liga está autorizada
DROP POLICY IF EXISTS "Ver usuarios de la misma liga" ON usuarios;
CREATE POLICY "Ver usuarios de liga autorizada" ON usuarios
  FOR SELECT 
  USING (
    auth.uid() IS NOT NULL AND (
      id = auth.uid() OR  
      (liga_id = (SELECT liga_id FROM usuarios WHERE id = auth.uid()) 
       AND is_league_authorized(liga_id))
    )
  );

-- ======================================================================
-- HABILITAR RLS EN NUEVAS TABLAS
-- ======================================================================

ALTER TABLE super_admins ENABLE ROW LEVEL SECURITY;
ALTER TABLE authorization_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE access_logs ENABLE ROW LEVEL SECURITY;

-- Políticas para super_admins (solo ellos pueden verse)
CREATE POLICY "Super admins se ven a sí mismos" ON super_admins
  FOR ALL 
  USING (email = (SELECT email FROM usuarios WHERE id = auth.uid()));

-- Políticas para authorization_codes (solo super admins)
CREATE POLICY "Super admins gestionan códigos" ON authorization_codes
  FOR ALL 
  USING (is_super_admin((SELECT email FROM usuarios WHERE id = auth.uid())));

-- Políticas para access_logs (solo super admins)
CREATE POLICY "Super admins ven logs" ON access_logs
  FOR ALL 
  USING (is_super_admin((SELECT email FROM usuarios WHERE id = auth.uid())));

-- ======================================================================
-- ÍNDICES PARA RENDIMIENTO
-- ======================================================================

CREATE INDEX IF NOT EXISTS idx_ligas_authorized ON ligas(authorized, suspended_at);
CREATE INDEX IF NOT EXISTS idx_super_admins_email ON super_admins(email);
CREATE INDEX IF NOT EXISTS idx_super_admins_active ON super_admins(active);
CREATE INDEX IF NOT EXISTS idx_authorization_codes_code ON authorization_codes(code);
CREATE INDEX IF NOT EXISTS idx_authorization_codes_active ON authorization_codes(active);
CREATE INDEX IF NOT EXISTS idx_access_logs_liga ON access_logs(liga_id);
CREATE INDEX IF NOT EXISTS idx_access_logs_created ON access_logs(created_at);

-- ======================================================================
-- TRIGGERS PARA LOGGING AUTOMÁTICO
-- ======================================================================

-- Trigger para loggear cambios en autorización de ligas
CREATE OR REPLACE FUNCTION log_league_authorization_change()
RETURNS TRIGGER AS $$
BEGIN
  -- Solo loggear si cambió el estado de autorización
  IF OLD.authorized IS DISTINCT FROM NEW.authorized OR 
     OLD.suspended_at IS DISTINCT FROM NEW.suspended_at THEN
    
    INSERT INTO access_logs (
      liga_id, 
      admin_email, 
      action, 
      performed_by,
      reason
    ) VALUES (
      NEW.id,
      (SELECT email FROM usuarios WHERE liga_id = NEW.id AND role = 'admin' LIMIT 1),
      CASE 
        WHEN NEW.authorized = true AND OLD.authorized = false THEN 'authorized'
        WHEN NEW.suspended_at IS NOT NULL AND OLD.suspended_at IS NULL THEN 'suspended'
        WHEN NEW.suspended_at IS NULL AND OLD.suspended_at IS NOT NULL THEN 'reactivated'
        ELSE 'modified'
      END,
      COALESCE(NEW.authorized_by, 'system'),
      NEW.suspension_reason
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Aplicar trigger
DROP TRIGGER IF EXISTS league_authorization_log ON ligas;
CREATE TRIGGER league_authorization_log
  AFTER UPDATE ON ligas
  FOR EACH ROW
  EXECUTE FUNCTION log_league_authorization_change();

-- ======================================================================
-- GRANTS Y PERMISOS
-- ======================================================================

GRANT EXECUTE ON FUNCTION generate_authorization_code TO authenticated;
GRANT EXECUTE ON FUNCTION is_league_authorized TO authenticated;
GRANT EXECUTE ON FUNCTION is_super_admin TO authenticated;

-- ======================================================================
-- COMENTARIOS DE DOCUMENTACIÓN
-- ======================================================================

COMMENT ON TABLE super_admins IS 'Tabla de super administradores que controlan el acceso a las ligas';
COMMENT ON TABLE authorization_codes IS 'Códigos de autorización para activar ligas';
COMMENT ON TABLE access_logs IS 'Registro de todas las acciones de autorización/suspensión';

COMMENT ON COLUMN ligas.authorized IS 'Indica si la liga está autorizada para operar';
COMMENT ON COLUMN ligas.authorization_code IS 'Código usado para autorizar la liga';
COMMENT ON COLUMN ligas.authorized_at IS 'Fecha y hora de autorización';
COMMENT ON COLUMN ligas.authorized_by IS 'Email del super admin que autorizó';
COMMENT ON COLUMN ligas.suspended_at IS 'Fecha y hora de suspensión (NULL si activa)';
COMMENT ON COLUMN ligas.suspension_reason IS 'Razón de la suspensión';

COMMENT ON FUNCTION generate_authorization_code IS 'Genera códigos únicos de autorización';
COMMENT ON FUNCTION is_league_authorized IS 'Verifica si una liga está autorizada y activa';
COMMENT ON FUNCTION is_super_admin IS 'Verifica si un email pertenece a un super admin';