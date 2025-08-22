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

async function verifyDatabaseStructure() {
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
    console.log('🔍 Verificando estructura de base de datos...\n');
    
    // Verificar tabla usuarios
    console.log('📋 Tabla USUARIOS:');
    try {
      const { data: usuarios, error: usuariosError } = await supabase
        .from('usuarios')
        .select('*')
        .limit(1);
      
      if (usuariosError && usuariosError.code !== 'PGRST116') {
        console.log('❌ Error:', usuariosError.message);
      } else {
        console.log('✅ Tabla usuarios existe');
        if (usuarios && usuarios.length > 0) {
          console.log('📊 Campos:', Object.keys(usuarios[0]).join(', '));
        } else {
          console.log('📊 Tabla vacía - estructura esperada: id, email, nombre, role, liga_id, created_at, activo');
        }
      }
    } catch (error) {
      console.log('❌ Error verificando usuarios:', error.message);
    }
    
    console.log('\n📋 Tabla ADMINISTRADORES:');
    try {
      const { data: admins, error: adminsError } = await supabase
        .from('administradores')
        .select('*')
        .limit(1);
      
      if (adminsError && adminsError.code !== 'PGRST116') {
        console.log('❌ Error:', adminsError.message);
      } else {
        console.log('✅ Tabla administradores existe');
        if (admins && admins.length > 0) {
          console.log('📊 Campos:', Object.keys(admins[0]).join(', '));
        } else {
          console.log('📊 Tabla vacía - estructura esperada: id, nombre, email, activo, liga_id, created_at');
        }
      }
    } catch (error) {
      console.log('❌ Error verificando administradores:', error.message);
    }
    
    console.log('\n📋 Tabla ANOTADORES:');
    try {
      const { data: anotadores, error: anotadoresError } = await supabase
        .from('anotadores')
        .select('*')
        .limit(1);
      
      if (anotadoresError && anotadoresError.code !== 'PGRST116') {
        console.log('❌ Error:', anotadoresError.message);
      } else {
        console.log('✅ Tabla anotadores existe');
        if (anotadores && anotadores.length > 0) {
          console.log('📊 Campos:', Object.keys(anotadores[0]).join(', '));
        } else {
          console.log('📊 Tabla vacía - estructura esperada: id, email, nombre, codigo_acceso, foto_url, liga_id, created_by, activo, created_at, updated_at');
        }
      }
    } catch (error) {
      console.log('❌ Error verificando anotadores:', error.message);
    }
    
    console.log('\n📋 Tabla JUGADORES:');
    try {
      const { data: jugadores, error: jugadoresError } = await supabase
        .from('jugadores')
        .select('*')
        .limit(1);
      
      if (jugadoresError && jugadoresError.code !== 'PGRST116') {
        console.log('❌ Error:', jugadoresError.message);
      } else {
        console.log('✅ Tabla jugadores existe');
        if (jugadores && jugadores.length > 0) {
          console.log('📊 Campos:', Object.keys(jugadores[0]).join(', '));
        } else {
          console.log('📊 Tabla vacía - estructura esperada: id, email, nombre, foto_url, equipo_id, liga_id, numero_casaca, posicion, fecha_nacimiento, estado, activo, created_by, created_at, updated_at');
        }
      }
    } catch (error) {
      console.log('❌ Error verificando jugadores:', error.message);
    }
    
    // Verificar otras tablas importantes
    console.log('\n📋 Tabla LIGAS:');
    try {
      const { data: ligas, error: ligasError } = await supabase
        .from('ligas')
        .select('*')
        .limit(1);
      
      if (ligasError && ligasError.code !== 'PGRST116') {
        console.log('❌ Error:', ligasError.message);
      } else {
        console.log('✅ Tabla ligas existe');
        if (ligas && ligas.length > 0) {
          console.log('📊 Campos:', Object.keys(ligas[0]).join(', '));
          console.log('📊 Ligas disponibles:', ligas.length);
        }
      }
    } catch (error) {
      console.log('❌ Error verificando ligas:', error.message);
    }
    
    console.log('\n📋 Tabla EQUIPOS:');
    try {
      const { data: equipos, error: equiposError } = await supabase
        .from('equipos')
        .select('*')
        .limit(1);
      
      if (equiposError && equiposError.code !== 'PGRST116') {
        console.log('❌ Error:', equiposError.message);
      } else {
        console.log('✅ Tabla equipos existe');
        if (equipos && equipos.length > 0) {
          console.log('📊 Campos:', Object.keys(equipos[0]).join(', '));
          console.log('📊 Equipos disponibles:', equipos.length);
        }
      }
    } catch (error) {
      console.log('❌ Error verificando equipos:', error.message);
    }
    
    // Verificar relaciones
    console.log('\n🔗 Verificando relaciones:');
    try {
      // Probar JOIN entre usuarios y administradores
      const { data: adminJoin, error: adminJoinError } = await supabase
        .from('usuarios')
        .select(`
          id,
          email,
          nombre,
          role,
          administradores!inner(
            id,
            nombre
          )
        `)
        .eq('role', 'admin')
        .limit(1);
      
      if (!adminJoinError) {
        console.log('✅ Relación usuarios-administradores funciona');
      } else {
        console.log('⚠️ Relación usuarios-administradores:', adminJoinError.message);
      }
    } catch (error) {
      console.log('⚠️ Error probando relación usuarios-administradores:', error.message);
    }
    
    try {
      // Probar JOIN entre jugadores y equipos
      const { data: jugadorEquipo, error: jugadorEquipoError } = await supabase
        .from('jugadores')
        .select(`
          id,
          nombre,
          equipos(
            id,
            nombre
          )
        `)
        .limit(1);
      
      if (!jugadorEquipoError) {
        console.log('✅ Relación jugadores-equipos funciona');
      } else {
        console.log('⚠️ Relación jugadores-equipos:', jugadorEquipoError.message);
      }
    } catch (error) {
      console.log('⚠️ Error probando relación jugadores-equipos:', error.message);
    }
    
    console.log('\n🎉 Verificación de estructura completada!');
    
  } catch (error) {
    console.error('💥 Error en verificación:', error);
    process.exit(1);
  }
}

verifyDatabaseStructure();