const { createClient } = require('@supabase/supabase-js');

// Leer variables de entorno
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Variables de entorno de Supabase no encontradas');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function applyPitcherMigration() {
  try {
    console.log('⚾ Creando tabla de estadísticas de pitcher...\n');

    // 1. Crear tabla estadisticas_pitcher
    console.log('📝 Paso 1: Creando tabla estadisticas_pitcher...');
    
    const { error: createTableError } = await supabase.rpc('exec_sql', {
      query: `
        CREATE TABLE IF NOT EXISTS estadisticas_pitcher (
          id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
          juego_id UUID NOT NULL REFERENCES partidos_calendario(id) ON DELETE CASCADE,
          jugador_id UUID NOT NULL REFERENCES jugadores(id) ON DELETE CASCADE,
          liga_id UUID NOT NULL REFERENCES ligas(id) ON DELETE CASCADE,
          
          -- Estadísticas de pitcheo
          lanzamientos INTEGER DEFAULT 0,
          strikes INTEGER DEFAULT 0,
          bolas INTEGER DEFAULT 0,
          ponches INTEGER DEFAULT 0,           -- Ponches dados
          bases_por_bolas INTEGER DEFAULT 0,   -- Bases por bolas otorgadas
          golpes_bateador INTEGER DEFAULT 0,   -- Hit by pitch
          balk INTEGER DEFAULT 0,              -- Balks cometidos
          carreras_permitidas INTEGER DEFAULT 0, -- Carreras permitidas
          hits_permitidos INTEGER DEFAULT 0,   -- Hits permitidos
          innings_lanzados DECIMAL DEFAULT 0,  -- Innings lanzados (ej: 5.2 = 5 y 2/3)
          
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          
          -- Constraint para evitar duplicados por juego/jugador
          UNIQUE(juego_id, jugador_id)
        );
      `
    });

    if (createTableError) {
      console.log('⚠️ Error creando tabla (puede ya existir):', createTableError.message);
    } else {
      console.log('✅ Tabla estadisticas_pitcher creada');
    }

    // 2. Crear índices
    console.log('📝 Paso 2: Creando índices...');
    
    const indices = [
      'CREATE INDEX IF NOT EXISTS idx_estadisticas_pitcher_juego ON estadisticas_pitcher(juego_id);',
      'CREATE INDEX IF NOT EXISTS idx_estadisticas_pitcher_jugador ON estadisticas_pitcher(jugador_id);',
      'CREATE INDEX IF NOT EXISTS idx_estadisticas_pitcher_liga ON estadisticas_pitcher(liga_id);'
    ];

    for (const indexSQL of indices) {
      const { error: indexError } = await supabase.rpc('exec_sql', { query: indexSQL });
      if (indexError) {
        console.log('⚠️ Error creando índice:', indexError.message);
      }
    }
    
    console.log('✅ Índices creados');

    // 3. Habilitar RLS y políticas
    console.log('📝 Paso 3: Configurando seguridad...');
    
    const { error: rlsError } = await supabase.rpc('exec_sql', {
      query: 'ALTER TABLE estadisticas_pitcher ENABLE ROW LEVEL SECURITY;'
    });

    if (rlsError) {
      console.log('⚠️ Error habilitando RLS:', rlsError.message);
    } else {
      console.log('✅ RLS habilitado');
    }

    // 4. Verificar tabla creada
    console.log('📝 Paso 4: Verificando tabla...');
    
    const { data: verifyData, error: verifyError } = await supabase
      .from('estadisticas_pitcher')
      .select('count(*)')
      .limit(1);

    if (verifyError) {
      console.error('❌ Error verificando tabla:', verifyError.message);
    } else {
      console.log('✅ Tabla estadisticas_pitcher verificada correctamente');
    }

    console.log('\n🎉 ¡Migración completada exitosamente!');
    console.log('📊 La tabla estadisticas_pitcher está lista para usar');

  } catch (error) {
    console.error('💥 Error durante la migración:', error);
    process.exit(1);
  }
}

applyPitcherMigration();