const { createClient } = require('@supabase/supabase-js');

async function checkActivoField() {
  console.log('🔍 Verificando campo activo en configuracion_temporada...');
  
  // Usar credenciales desde variables de entorno (necesitas configurarlas)
  const supabaseUrl = 'tu_supabase_url_aqui';
  const supabaseKey = 'tu_supabase_key_aqui';
  
  console.log('⚠️  IMPORTANTE: Edita este archivo y agrega tus credenciales de Supabase');
  console.log('O mejor aún, ejecuta esto directamente en tu dashboard de Supabase:');
  console.log('');
  console.log('-- Verificar si existe el campo activo');
  console.log('SELECT column_name, data_type, is_nullable, column_default');
  console.log('FROM information_schema.columns');
  console.log('WHERE table_name = \'configuracion_temporada\'');
  console.log('  AND column_name = \'activo\';');
  console.log('');
  console.log('-- Si no existe, ejecutar:');
  console.log('ALTER TABLE configuracion_temporada ADD COLUMN IF NOT EXISTS activo BOOLEAN DEFAULT true;');
  console.log('');
  console.log('-- Luego actualizar temporadas existentes:');
  console.log('UPDATE configuracion_temporada SET activo = true WHERE activo IS NULL;');
  console.log('');
  console.log('-- Verificar temporadas:');
  console.log('SELECT id, nombre, activo FROM configuracion_temporada;');
}

checkActivoField();