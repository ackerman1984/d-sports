const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Load environment variables
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

async function debugTeams() {
  loadEnvFile();
  
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    console.error('❌ Missing Supabase credentials in .env.local');
    console.log('Needed:');
    console.log('- NEXT_PUBLIC_SUPABASE_URL');
    console.log('- SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });

  console.log('🔍 Verificando estado de la base de datos...\n');

  try {
    // 1. Verificar tabla equipos existe
    console.log('1️⃣ Verificando tabla equipos...');
    const { data: equiposExists, error: equiposError } = await supabase
      .from('equipos')
      .select('id')
      .limit(1);
    
    if (equiposError) {
      console.log('❌ Error con tabla equipos:', equiposError.message);
      return;
    }
    console.log('✅ Tabla equipos existe');

    // 2. Verificar políticas RLS - Simplificado
    console.log('\n2️⃣ Verificando políticas RLS...');
    console.log('   (Necesitas aplicar manualmente la migración 005_fix_equipos_rls.sql)');

    // 3. Verificar ligas existentes
    console.log('\n3️⃣ Verificando ligas existentes...');
    const { data: ligas, error: ligasError } = await supabase
      .from('ligas')
      .select('id, nombre, codigo')
      .limit(5);
    
    if (ligasError) {
      console.log('❌ Error cargando ligas:', ligasError.message);
    } else {
      console.log('✅ Ligas encontradas:', ligas?.length || 0);
      if (ligas && ligas.length > 0) {
        ligas.forEach(liga => {
          console.log(`   - ${liga.nombre} (${liga.codigo}) - ID: ${liga.id}`);
        });
      }
    }

    // 4. Verificar usuarios admin
    console.log('\n4️⃣ Verificando usuarios admin...');
    const { data: admins, error: adminsError } = await supabase
      .from('usuarios')
      .select('id, nombre, email, role, liga_id')
      .eq('role', 'admin')
      .limit(5);
    
    if (adminsError) {
      console.log('❌ Error cargando admins:', adminsError.message);
    } else {
      console.log('✅ Admins encontrados:', admins?.length || 0);
      if (admins && admins.length > 0) {
        admins.forEach(admin => {
          console.log(`   - ${admin.nombre} (${admin.email}) - Liga ID: ${admin.liga_id}`);
        });
      }
    }

    console.log('\n🎯 SIGUIENTE PASO:');
    console.log('1. Asegúrate de aplicar la migración 005_fix_equipos_rls.sql');
    console.log('2. Verifica que tu usuario esté logueado como admin');
    console.log('3. Revisa la consola del navegador para ver logs detallados');

  } catch (error) {
    console.error('❌ Error general:', error);
  }
}

debugTeams();