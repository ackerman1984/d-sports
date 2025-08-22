const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

function loadEnvFile() {
  try {
    const envPath = path.join(__dirname, '..', '.env.local');
    const envContent = fs.readFileSync(envPath, 'utf8');
    
    envContent.split('\n').forEach(line => {
      const trimmedLine = line.trim();
      if (trimmedLine && !trimmedLine.startsWith('#')) {
        const [key, ...valueParts] = trimmedLine.split('=');
        if (key && valueParts.length > 0) {
          process.env[key.trim()] = valueParts.join('=').trim();
        }
      }
    });
  } catch (error) {
    console.log('Warning: Could not load .env.local file');
  }
}

async function checkDatabaseSchema() {
  loadEnvFile();
  
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    console.error('❌ Missing Supabase credentials');
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey);

  console.log('🔍 Checking current database schema...\n');

  try {
    // Check jugadores table structure
    console.log('📋 Jugadores table structure:');
    const { data: jugadores, error: jugadoresError } = await supabase
      .from('jugadores')
      .select('*')
      .limit(1);

    if (jugadoresError) {
      console.error('❌ Error accessing jugadores table:', jugadoresError.message);
    } else {
      if (jugadores.length > 0) {
        console.log('✅ Jugadores table exists with columns:', Object.keys(jugadores[0]));
      } else {
        console.log('⚠️ Jugadores table exists but is empty');
        // Try to get table info differently
        const { data: sampleData, error } = await supabase
          .from('jugadores')
          .insert([{
            nombre: 'Test',
            numero_casaca: 99,
            activo: true
          }])
          .select('*')
          .single();
        
        if (sampleData) {
          console.log('Available columns:', Object.keys(sampleData));
          // Clean up test data
          await supabase.from('jugadores').delete().eq('id', sampleData.id);
        }
      }
    }

    // Check estadisticas_jugador table
    console.log('\n📊 Estadisticas_jugador table:');
    const { data: stats, error: statsError } = await supabase
      .from('estadisticas_jugador')
      .select('*')
      .limit(1);

    if (statsError) {
      console.error('❌ Estadisticas_jugador table does not exist:', statsError.message);
    } else {
      console.log('✅ Estadisticas_jugador table exists');
    }

    // Check equipos table
    console.log('\n👥 Checking equipos:');
    const { data: equipos, error: equiposError } = await supabase
      .from('equipos')
      .select('*');

    if (equiposError) {
      console.error('❌ Error accessing equipos:', equiposError.message);
    } else {
      console.log(`✅ Found ${equipos.length} equipos:`);
      equipos.forEach(equipo => {
        console.log(`   - ${equipo.nombre} (ID: ${equipo.id})`);
      });
    }

  } catch (error) {
    console.error('❌ Database check failed:', error);
  }
}

checkDatabaseSchema();