const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function debugEquipos() {
  console.log('🔍 Verificando equipos existentes...\n');

  try {
    // Buscar todos los equipos
    const { data: equipos, error: equiposError } = await supabase
      .from('equipos')
      .select('*')
      .order('nombre');

    if (equiposError) {
      console.log('❌ Error:', equiposError.message);
      return;
    }

    console.log(`📋 Total equipos: ${equipos?.length || 0}`);
    
    if (equipos && equipos.length > 0) {
      equipos.forEach(equipo => {
        console.log(`   - ${equipo.nombre} (ID: ${equipo.id}) | Liga: ${equipo.liga_id} | Activo: ${equipo.activo}`);
      });
    }

  } catch (error) {
    console.error('💥 Error:', error);
  }
}

debugEquipos();