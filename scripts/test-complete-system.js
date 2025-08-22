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

async function testCompleteSystem() {
  loadEnvFile();
  
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    console.error('❌ Missing Supabase credentials');
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });

  console.log('🔍 Testing complete player registration system...\n');

  try {
    // 1. Verificar tablas
    console.log('📋 Step 1: Checking database tables...');
    
    const { data: ligas } = await supabase.from('ligas').select('*').limit(1);
    const { data: equipos } = await supabase.from('equipos').select('*').limit(1);
    const { data: jugadores } = await supabase.from('jugadores').select('*').limit(1);
    const { data: estadisticas } = await supabase.from('estadisticas_jugador').select('*').limit(1);
    
    console.log('✅ Tables exist:');
    console.log(`   - ligas: ${ligas ? 'OK' : 'MISSING'}`);
    console.log(`   - equipos: ${equipos ? 'OK' : 'MISSING'}`);
    console.log(`   - jugadores: ${jugadores ? 'OK' : 'MISSING'}`);
    console.log(`   - estadisticas_jugador: ${estadisticas ? 'OK' : 'MISSING'}\n`);

    // 2. Verificar liga de prueba
    console.log('🏟️ Step 2: Checking test league...');
    
    let { data: testLiga } = await supabase
      .from('ligas')
      .select('*')
      .eq('codigo', 'POLI')
      .single();

    if (!testLiga) {
      console.log('Creating test league...');
      const { data: newLiga, error } = await supabase
        .from('ligas')
        .insert([{
          nombre: 'Liga Poli',
          codigo: 'POLI',
          subdominio: 'poli',
          activa: true
        }])
        .select('*')
        .single();
      
      if (error) throw error;
      testLiga = newLiga;
      console.log('✅ Test league created');
    } else {
      console.log('✅ Test league exists');
    }
    console.log(`   Liga ID: ${testLiga.id}\n`);

    // 3. Verificar/crear equipos
    console.log('👥 Step 3: Checking teams...');
    
    let { data: existingTeams } = await supabase
      .from('equipos')
      .select('*')
      .eq('liga_id', testLiga.id);

    if (!existingTeams || existingTeams.length === 0) {
      console.log('Creating test teams...');
      const teamsData = [
        {
          nombre: 'Equipo Blanco',
          color: '#FFFFFF',
          liga_id: testLiga.id,
          activo: true
        },
        {
          nombre: 'Equipo Negro',
          color: '#000000',
          liga_id: testLiga.id,
          activo: true
        }
      ];

      const { data: newTeams, error } = await supabase
        .from('equipos')
        .insert(teamsData)
        .select('*');
      
      if (error) throw error;
      existingTeams = newTeams;
      console.log('✅ Test teams created');
    } else {
      console.log('✅ Teams already exist');
    }
    
    existingTeams.forEach(team => {
      console.log(`   - ${team.nombre} (ID: ${team.id})`);
    });
    console.log('');

    // 4. Verificar usuario administrador
    console.log('👨‍💼 Step 4: Checking admin user...');
    
    let { data: adminUser } = await supabase
      .from('usuarios')
      .select('*')
      .eq('liga_id', testLiga.id)
      .eq('role', 'admin')
      .limit(1)
      .single();

    if (!adminUser) {
      console.log('Creating test admin user...');
      const { data: newAdmin, error } = await supabase
        .from('usuarios')
        .insert([{
          email: 'admin@poli.com',
          nombre: 'Admin Poli',
          role: 'admin',
          liga_id: testLiga.id
        }])
        .select('*')
        .single();
      
      if (error) throw error;
      adminUser = newAdmin;
      console.log('✅ Test admin user created');
    } else {
      console.log('✅ Admin user exists');
    }
    console.log(`   Email: ${adminUser.email}\n`);

    // 5. Crear jugador de prueba
    console.log('🏃‍♂️ Step 5: Testing player creation...');
    
    const testPlayerData = {
      nombre: 'Juan',
      apellido: 'Pérez',
      email: 'juan.perez@test.com',
      telefono: '555-1234',
      numero_casaca: 10,
      posicion_principal: 'Shortstop (SS)',
      equipo_id: existingTeams[0].id,
      liga_id: testLiga.id,
      estado: 'activo'
    };

    // Eliminar si ya existe
    await supabase
      .from('jugadores')
      .delete()
      .eq('email', testPlayerData.email);

    const { data: newPlayer, error: playerError } = await supabase
      .from('jugadores')
      .insert([testPlayerData])
      .select('*')
      .single();

    if (playerError) throw playerError;
    console.log('✅ Test player created');
    console.log(`   Player ID: ${newPlayer.id}`);

    // 6. Crear estadísticas iniciales
    const { data: newStats, error: statsError } = await supabase
      .from('estadisticas_jugador')
      .insert([{
        jugador_id: newPlayer.id,
        temporada: '2025',
        juegos_jugados: 0,
        turnos_al_bate: 0,
        hits: 0,
        carreras_anotadas: 0,
        carreras_impulsadas: 0,
        home_runs: 0,
        dobles: 0,
        triples: 0,
        bases_robadas: 0,
        ponches: 0,
        bases_por_bolas: 0,
        errores: 0,
        promedio_bateo: 0.000,
        porcentaje_embase: 0.000,
        porcentaje_slugging: 0.000
      }])
      .select('*')
      .single();

    if (statsError) throw statsError;
    console.log('✅ Player statistics created\n');

    // 7. Verificar que todo se puede consultar
    console.log('🔍 Step 6: Testing API queries...');
    
    const { data: allPlayers, error: queryError } = await supabase
      .from('jugadores')
      .select(`
        *,
        equipo:equipos(*),
        estadisticas:estadisticas_jugador(*)
      `)
      .eq('liga_id', testLiga.id);

    if (queryError) throw queryError;
    console.log('✅ Player queries working');
    console.log(`   Total players found: ${allPlayers.length}\n`);

    // Mostrar resumen
    console.log('🎉 SYSTEM TEST COMPLETE!\n');
    console.log('📊 Summary:');
    console.log(`   Liga: ${testLiga.nombre} (${testLiga.codigo})`);
    console.log(`   Admin: ${adminUser.email}`);
    console.log(`   Teams: ${existingTeams.length}`);
    console.log(`   Players: ${allPlayers.length}`);
    console.log('');
    console.log('🚀 Ready to test:');
    console.log('   1. Start server: npm run dev');
    console.log('   2. Login as admin: http://localhost:3000/login');
    console.log('   3. Go to: http://localhost:3000/admin/jugadores');
    console.log('   4. Register new player and check if appears in admin interface');
    console.log('');
    console.log('💡 Test credentials:');
    console.log(`   Liga subdomain: ${testLiga.subdominio}`);
    console.log(`   Admin email: ${adminUser.email}`);
    console.log('   Create password in Supabase Auth if needed');

  } catch (error) {
    console.error('❌ System test failed:', error);
    console.log('\n💡 Please fix the errors above and run the test again');
    process.exit(1);
  }
}

testCompleteSystem();