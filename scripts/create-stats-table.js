require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { persistSession: false }
});

async function createStatsTable() {
  console.log('🚀 Creating estadisticas_jugador table...');

  try {
    // Create the table directly with SQL
    const createTableSQL = `
      CREATE TABLE IF NOT EXISTS estadisticas_jugador (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        jugador_id UUID REFERENCES jugadores(id) ON DELETE CASCADE,
        temporada VARCHAR(10) NOT NULL,
        juegos_jugados INTEGER DEFAULT 0,
        turnos_al_bate INTEGER DEFAULT 0,
        hits INTEGER DEFAULT 0,
        carreras_anotadas INTEGER DEFAULT 0,
        carreras_impulsadas INTEGER DEFAULT 0,
        home_runs INTEGER DEFAULT 0,
        dobles INTEGER DEFAULT 0,
        triples INTEGER DEFAULT 0,
        bases_robadas INTEGER DEFAULT 0,
        ponches INTEGER DEFAULT 0,
        bases_por_bolas INTEGER DEFAULT 0,
        errores INTEGER DEFAULT 0,
        promedio_bateo DECIMAL(4,3) DEFAULT 0.000,
        porcentaje_embase DECIMAL(4,3) DEFAULT 0.000,
        porcentaje_slugging DECIMAL(4,3) DEFAULT 0.000,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(jugador_id, temporada)
      );
    `;

    // Try to execute via REST API
    const { data, error } = await supabase.rpc('sql', { 
      query: createTableSQL 
    });

    if (error) {
      console.error('❌ Error creating table via RPC:', error.message);
      
      // Alternative: try to create a test record first to see if table exists
      const { error: testError } = await supabase
        .from('estadisticas_jugador')
        .select('id')
        .limit(1);
        
      if (testError && testError.code === '42P01') {
        console.log('📝 Table does not exist. Manual creation needed.');
        console.log('⚠️  Please run this SQL in your Supabase dashboard:');
        console.log('\n' + createTableSQL + '\n');
        console.log('🔗 Go to: https://supabase.com/dashboard/project/kjvfogqgwydysngozdmk/sql');
      } else {
        console.log('✅ Table might already exist or there is another issue');
      }
    } else {
      console.log('✅ Table created successfully!');
    }

    // Enable RLS
    const enableRLSSQL = `ALTER TABLE estadisticas_jugador ENABLE ROW LEVEL SECURITY;`;
    await supabase.rpc('sql', { query: enableRLSSQL });
    console.log('🔐 RLS enabled for estadisticas_jugador');

  } catch (error) {
    console.error('❌ Script error:', error.message);
    console.log('\n📋 Manual SQL to execute in Supabase Dashboard:');
    console.log('🔗 Go to: https://supabase.com/dashboard/project/kjvfogqgwydysngozdmk/sql');
    console.log('\nCREATE TABLE IF NOT EXISTS estadisticas_jugador (');
    console.log('  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),');
    console.log('  jugador_id UUID REFERENCES jugadores(id) ON DELETE CASCADE,');
    console.log('  temporada VARCHAR(10) NOT NULL,');
    console.log('  juegos_jugados INTEGER DEFAULT 0,');
    console.log('  turnos_al_bate INTEGER DEFAULT 0,');
    console.log('  hits INTEGER DEFAULT 0,');
    console.log('  carreras_anotadas INTEGER DEFAULT 0,');
    console.log('  carreras_impulsadas INTEGER DEFAULT 0,');
    console.log('  home_runs INTEGER DEFAULT 0,');
    console.log('  dobles INTEGER DEFAULT 0,');
    console.log('  triples INTEGER DEFAULT 0,');
    console.log('  bases_robadas INTEGER DEFAULT 0,');
    console.log('  ponches INTEGER DEFAULT 0,');
    console.log('  bases_por_bolas INTEGER DEFAULT 0,');
    console.log('  errores INTEGER DEFAULT 0,');
    console.log('  promedio_bateo DECIMAL(4,3) DEFAULT 0.000,');
    console.log('  porcentaje_embase DECIMAL(4,3) DEFAULT 0.000,');
    console.log('  porcentaje_slugging DECIMAL(4,3) DEFAULT 0.000,');
    console.log('  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,');
    console.log('  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,');
    console.log('  UNIQUE(jugador_id, temporada)');
    console.log(');');
    console.log('\nALTER TABLE estadisticas_jugador ENABLE ROW LEVEL SECURITY;');
  }
}

createStatsTable();