-- Script para crear un usuario administrador
-- Ejecuta este script en tu Supabase SQL Editor

-- Primero, obtener el liga_id (reemplaza con tu liga actual)
-- SELECT id FROM ligas WHERE subdominio = 'tu-subdominio';

-- Crear usuario admin (ajusta el email y la liga_id según tu configuración)
INSERT INTO usuarios (
  id,
  email, 
  nombre, 
  role, 
  liga_id,
  activo,
  created_at
) VALUES (
  '00000000-0000-0000-0000-000000000001'::uuid,  -- ID fijo para admin
  'admin@example.com',                            -- Cambia por tu email
  'Administrador',
  'admin',
  '424db42f-8d4a-4caf-9788-203513f133bb'::uuid, -- Tu liga_id actual
  true,
  NOW()
) ON CONFLICT (email) DO UPDATE SET
  role = 'admin',
  liga_id = '424db42f-8d4a-4caf-9788-203513f133bb'::uuid,
  activo = true;

-- Crear usuario en Supabase Auth (ajusta el email y password)
-- NOTA: Este paso puede requerir configuración adicional de Supabase Auth
-- o puedes usar el dashboard de Supabase Authentication para crear el usuario

-- Verificar que el usuario fue creado
SELECT id, email, nombre, role, liga_id, activo 
FROM usuarios 
WHERE email = 'admin@example.com';