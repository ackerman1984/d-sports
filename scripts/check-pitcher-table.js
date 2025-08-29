const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkPitcherTable() {
  console.log('⚾ Verificando tabla estadisticas_pitcher...');
  
  try {
    // Intentar leer datos
    const { data, error } = await supabase
      .from('estadisticas_pitcher')
      .select('*')
      .limit(1);
      
    if (error) {
      console.log('❌ Tabla estadisticas_pitcher no existe');
      console.log('Error:', error.message);
      
      console.log('\n📝 Para crear la tabla, ejecuta este SQL en Supabase Dashboard:');
      console.log(`
CREATE TABLE estadisticas_pitcher (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  juego_id UUID NOT NULL REFERENCES partidos_calendario(id) ON DELETE CASCADE,
  jugador_id UUID NOT NULL REFERENCES jugadores(id) ON DELETE CASCADE,
  liga_id UUID NOT NULL REFERENCES ligas(id) ON DELETE CASCADE,
  lanzamientos INTEGER DEFAULT 0,
  strikes INTEGER DEFAULT 0,
  bolas INTEGER DEFAULT 0,
  ponches INTEGER DEFAULT 0,
  bases_por_bolas INTEGER DEFAULT 0,
  golpes_bateador INTEGER DEFAULT 0,
  balk INTEGER DEFAULT 0,
  carreras_permitidas INTEGER DEFAULT 0,
  hits_permitidos INTEGER DEFAULT 0,
  innings_lanzados DECIMAL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(juego_id, jugador_id)
);

ALTER TABLE estadisticas_pitcher ENABLE ROW LEVEL SECURITY;
      `);
      return false;
    } else {
      console.log('✅ Tabla estadisticas_pitcher existe');
      console.log('Registros encontrados:', data?.length || 0);
      return true;
    }
  } catch (e) {
    console.error('💥 Error verificando tabla:', e);
    return false;
  }
}

checkPitcherTable();