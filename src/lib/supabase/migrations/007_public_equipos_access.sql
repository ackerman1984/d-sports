-- Permitir acceso público de solo lectura a equipos para registro
-- Fecha: 2025-08-14

-- ======================================================================
-- POLÍTICA PARA ACCESO PÚBLICO A EQUIPOS
-- ======================================================================

-- Crear política adicional para permitir acceso público de lectura a equipos activos
-- Esto es necesario para que usuarios no autenticados puedan ver equipos durante el registro
CREATE POLICY "Acceso público a equipos activos" ON equipos
  FOR SELECT 
  USING (
    activo = true
  );

-- ======================================================================
-- COMENTARIOS PARA DOCUMENTACIÓN  
-- ======================================================================

COMMENT ON POLICY "Acceso público a equipos activos" ON equipos IS 'Permite acceso público de solo lectura a equipos activos para el proceso de registro';