const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Load environment variables manually
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

async function insertTestData() {
  loadEnvFile();
  
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    console.error('Missing required environment variables');
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });

  try {
    console.log('🏗️ Insertando datos de prueba...\n');
    
    // 1. Crear liga de prueba
    console.log('1. Creando liga de prueba...');
    
    // Primero verificar si ya existe
    const { data: existingLiga } = await supabase
      .from('ligas')
      .select('*')
      .eq('id', '11111111-1111-1111-1111-111111111111')
      .single();
    
    let liga;
    if (existingLiga) {
      liga = existingLiga;
      console.log('✅ Liga ya existe:', liga.nombre);
    } else {
      const { data: newLiga, error: ligaError } = await supabase
        .from('ligas')
        .insert({
          id: '11111111-1111-1111-1111-111111111111',
          nombre: 'Liga de Prueba',
          codigo: 'TEST',
          subdominio: 'test',
          activa: true
        })
        .select()
        .single();

      if (ligaError) {
        console.error('❌ Error creando liga:', ligaError);
        return;
      }
      liga = newLiga;
      console.log('✅ Liga creada:', liga.nombre);
    }

    // 2. Crear equipos de prueba
    console.log('\n2. Creando equipos de prueba...');
    const equipos = [
      {
        id: '22222222-2222-2222-2222-222222222222',
        nombre: 'Tigres del Norte',
        color: '#FF6B35',
        liga_id: liga.id
      },
      {
        id: '33333333-3333-3333-3333-333333333333',
        nombre: 'Águilas del Sur',
        color: '#004E89',
        liga_id: liga.id
      }
    ];

    for (const equipo of equipos) {
      // Verificar si ya existe
      const { data: existingEquipo } = await supabase
        .from('equipos')
        .select('id')
        .eq('id', equipo.id)
        .single();
      
      if (existingEquipo) {
        console.log('✅ Equipo ya existe:', equipo.nombre);
      } else {
        const { error: equipoError } = await supabase
          .from('equipos')
          .insert(equipo);
        
        if (equipoError) {
          console.error('❌ Error creando equipo:', equipoError);
        } else {
          console.log('✅ Equipo creado:', equipo.nombre);
        }
      }
    }

    // 3. Crear usuario administrador de prueba
    console.log('\n3. Creando usuario administrador de prueba...');
    const adminUser = {
      id: '44444444-4444-4444-4444-444444444444',
      email: 'admin@test.com',
      nombre: 'Admin Prueba',
      role: 'admin',
      liga_id: liga.id,
      activo: true
    };

    const { error: adminUserError } = await supabase
      .from('usuarios')
      .upsert(adminUser);

    if (adminUserError) {
      console.error('❌ Error creando usuario admin:', adminUserError);
    } else {
      console.log('✅ Usuario admin creado');
      
      // Crear perfil de administrador (requiere auth.users)
      console.log('⚠️ Perfil admin no creado (requiere usuario en auth.users)');
    }

    // 4. Crear usuario anotador de prueba
    console.log('\n4. Creando usuario anotador de prueba...');
    const anotadorUser = {
      id: '55555555-5555-5555-5555-555555555555',
      email: 'anotador@test.com',
      nombre: 'Anotador Prueba',
      role: 'anotador',
      liga_id: liga.id,
      activo: true
    };

    const { error: anotadorUserError } = await supabase
      .from('usuarios')
      .upsert(anotadorUser);

    if (anotadorUserError) {
      console.error('❌ Error creando usuario anotador:', anotadorUserError);
    } else {
      console.log('✅ Usuario anotador creado');
      
      // Crear perfil de anotador
      const { error: anotadorProfileError } = await supabase
        .from('anotadores')
        .upsert({
          id: anotadorUser.id,
          email: anotadorUser.email,
          nombre: anotadorUser.nombre,
          codigo_acceso: 'ANOT123',
          liga_id: liga.id,
          activo: true
        });

      if (anotadorProfileError) {
        console.error('❌ Error creando perfil anotador:', anotadorProfileError);
      } else {
        console.log('✅ Perfil anotador creado');
      }
    }

    // 5. Crear usuario jugador de prueba
    console.log('\n5. Creando usuario jugador de prueba...');
    const jugadorUser = {
      id: '66666666-6666-6666-6666-666666666666',
      email: 'jugador@test.com',
      nombre: 'Jugador Prueba',
      role: 'jugador',
      liga_id: liga.id,
      activo: true
    };

    const { error: jugadorUserError } = await supabase
      .from('usuarios')
      .upsert(jugadorUser);

    if (jugadorUserError) {
      console.error('❌ Error creando usuario jugador:', jugadorUserError);
    } else {
      console.log('✅ Usuario jugador creado');
      
      // Crear perfil de jugador
      const { error: jugadorProfileError } = await supabase
        .from('jugadores')
        .upsert({
          id: jugadorUser.id,
          email: jugadorUser.email,
          nombre: jugadorUser.nombre,
          equipo_id: equipos[0].id,
          liga_id: liga.id,
          numero_casaca: 10,
          posicion: 'SS',
          fecha_nacimiento: '1995-05-15',
          estado: 'activo',
          activo: true
        });

      if (jugadorProfileError) {
        console.error('❌ Error creando perfil jugador:', jugadorProfileError);
      } else {
        console.log('✅ Perfil jugador creado');
      }
    }

    // 6. Verificar datos insertados
    console.log('\n6. Verificando datos insertados...');
    
    const { count: usuariosCount } = await supabase
      .from('usuarios')
      .select('*', { count: 'exact', head: true });
    
    const { count: jugadoresCount } = await supabase
      .from('jugadores')
      .select('*', { count: 'exact', head: true });
    
    const { count: anotadoresCount } = await supabase
      .from('anotadores')
      .select('*', { count: 'exact', head: true });
    
    const { count: administradoresCount } = await supabase
      .from('administradores')
      .select('*', { count: 'exact', head: true });

    console.log(`📊 Usuarios: ${usuariosCount}`);
    console.log(`📊 Jugadores: ${jugadoresCount}`);
    console.log(`📊 Anotadores: ${anotadoresCount}`);
    console.log(`📊 Administradores: ${administradoresCount}`);

    console.log('\n🎉 Datos de prueba insertados exitosamente!');
    console.log('\n📝 Credenciales de prueba:');
    console.log('- Admin: admin@test.com');
    console.log('- Anotador: anotador@test.com (código: ANOT123)');
    console.log('- Jugador: jugador@test.com');
    
  } catch (error) {
    console.error('💥 Error insertando datos de prueba:', error);
    process.exit(1);
  }
}

insertTestData();