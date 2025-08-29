const { createClient } = require('@supabase/supabase-js');

// Cargar variables de entorno
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Variables de entorno de Supabase no encontradas');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkAndAddColumn() {
  try {
    console.log('🔍 Verificando estructura de la tabla estadisticas_jugadores...');
    
    // Verificar si la columna juegos_jugados ya existe
    const { data: columns, error: columnError } = await supabase
      .from('information_schema.columns')
      .select('column_name')
      .eq('table_name', 'estadisticas_jugadores')
      .eq('column_name', 'juegos_jugados');
    
    if (columnError) {
      console.error('❌ Error verificando columnas:', columnError);
      return;
    }
    
    if (columns && columns.length > 0) {
      console.log('✅ La columna juegos_jugados ya existe');
      return;
    }
    
    console.log('⚠️ La columna juegos_jugados no existe. Necesita ser agregada manualmente.');
    console.log('');
    console.log('🔧 Ejecuta este SQL en el editor de Supabase:');
    console.log('');
    console.log('ALTER TABLE estadisticas_jugadores ADD COLUMN IF NOT EXISTS juegos_jugados INTEGER DEFAULT 1;');
    console.log('');
    console.log('📝 También puedes ejecutar la migración completa:');
    console.log('   src/lib/supabase/migrations/021_add_juegos_jugados_column.sql');
    
  } catch (err) {
    console.error('❌ Error:', err.message);
  }
}

checkAndAddColumn();