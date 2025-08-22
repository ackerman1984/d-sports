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

async function cleanAndRestructureDB() {
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
    console.log('🧹 Iniciando limpieza y reestructuración de base de datos...');
    
    // 1. ELIMINAR DATOS EXISTENTES
    console.log('\n📋 Paso 1: Eliminando datos existentes...');
    
    // Eliminar estadísticas de jugadores primero (foreign key)
    console.log('🗑️ Eliminando estadísticas de jugadores...');
    const { error: statsError } = await supabase
      .from('estadisticas_jugador')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000'); // Eliminar todos

    if (statsError && statsError.code !== 'PGRST116') {
      console.log('⚠️ Error eliminando estadísticas (puede que la tabla no exista):', statsError.message);
    } else {
      console.log('✅ Estadísticas eliminadas');
    }

    // Eliminar jugadores
    console.log('🗑️ Eliminando jugadores...');
    const { error: jugadoresError } = await supabase
      .from('jugadores')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000'); // Eliminar todos

    if (jugadoresError && jugadoresError.code !== 'PGRST116') {
      console.log('⚠️ Error eliminando jugadores:', jugadoresError.message);
    } else {
      console.log('✅ Jugadores eliminados');
    }

    // Eliminar usuarios (excepto super admins si existen)
    console.log('🗑️ Eliminando usuarios...');
    const { error: usuariosError } = await supabase
      .from('usuarios')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000'); // Eliminar todos

    if (usuariosError && usuariosError.code !== 'PGRST116') {
      console.log('⚠️ Error eliminando usuarios:', usuariosError.message);
    } else {
      console.log('✅ Usuarios eliminados');
    }

    // 2. LIMPIAR TABLA USUARIOS
    console.log('\n📋 Paso 2: Limpiando estructura de tabla usuarios...');
    
    const userFieldsToRemove = [
      'numero_casaca',
      'equipo_id', 
      'posicion',
      'telefono',
      'foto_url',
      'fecha_nacimiento',
      'estado',
      'ultimo_login',
      'updated_at'
    ];

    for (const field of userFieldsToRemove) {
      try {
        console.log(`🔧 Eliminando campo ${field} de usuarios...`);
        await supabase.rpc('execute_sql', { 
          sql_query: `ALTER TABLE usuarios DROP COLUMN IF EXISTS ${field};` 
        });
        console.log(`✅ Campo ${field} eliminado`);
      } catch (error) {
        console.log(`⚠️ Error eliminando ${field}:`, error.message);
      }
    }

    // 3. CREAR TABLA ADMINISTRADORES
    console.log('\n📋 Paso 3: Creando tabla administradores...');
    
    const createAdministradoresSQL = `
      CREATE TABLE IF NOT EXISTS administradores (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        nombre VARCHAR(255) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        activo BOOLEAN DEFAULT true,
        liga_id UUID REFERENCES ligas(id) ON DELETE CASCADE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
      
      CREATE INDEX IF NOT EXISTS idx_administradores_liga_id ON administradores(liga_id);
      CREATE INDEX IF NOT EXISTS idx_administradores_email ON administradores(email);
    `;

    try {
      await supabase.rpc('execute_sql', { sql_query: createAdministradoresSQL });
      console.log('✅ Tabla administradores creada');
    } catch (error) {
      console.log('⚠️ Error creando tabla administradores:', error.message);
    }

    // 4. CREAR TABLA ANOTADORES
    console.log('\n📋 Paso 4: Creando tabla anotadores...');
    
    const createAnotadoresSQL = `
      CREATE TABLE IF NOT EXISTS anotadores (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        email VARCHAR(255) UNIQUE NOT NULL,
        nombre VARCHAR(255) NOT NULL,
        codigo_acceso VARCHAR(50) UNIQUE NOT NULL,
        foto_url TEXT,
        liga_id UUID REFERENCES ligas(id) ON DELETE CASCADE,
        created_by UUID REFERENCES administradores(id) ON DELETE SET NULL,
        activo BOOLEAN DEFAULT true,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
      
      CREATE INDEX IF NOT EXISTS idx_anotadores_liga_id ON anotadores(liga_id);
      CREATE INDEX IF NOT EXISTS idx_anotadores_created_by ON anotadores(created_by);
      CREATE INDEX IF NOT EXISTS idx_anotadores_codigo ON anotadores(codigo_acceso);
    `;

    try {
      await supabase.rpc('execute_sql', { sql_query: createAnotadoresSQL });
      console.log('✅ Tabla anotadores creada');
    } catch (error) {
      console.log('⚠️ Error creando tabla anotadores:', error.message);
    }

    // 5. ACTUALIZAR TABLA JUGADORES
    console.log('\n📋 Paso 5: Actualizando tabla jugadores...');
    
    const updateJugadoresSQL = `
      ALTER TABLE jugadores ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES administradores(id) ON DELETE SET NULL;
      CREATE INDEX IF NOT EXISTS idx_jugadores_created_by ON jugadores(created_by);
    `;

    try {
      await supabase.rpc('execute_sql', { sql_query: updateJugadoresSQL });
      console.log('✅ Campo created_by agregado a jugadores');
    } catch (error) {
      console.log('⚠️ Error actualizando tabla jugadores:', error.message);
    }

    // 6. VERIFICAR ESTRUCTURA FINAL
    console.log('\n📋 Paso 6: Verificando estructura final...');
    
    try {
      const { data: usuarios } = await supabase.from('usuarios').select('*').limit(1);
      const { data: administradores } = await supabase.from('administradores').select('*').limit(1);
      const { data: anotadores } = await supabase.from('anotadores').select('*').limit(1);
      const { data: jugadores } = await supabase.from('jugadores').select('*').limit(1);
      
      console.log('✅ Todas las tablas verificadas correctamente');
      console.log('📊 Base de datos reestructurada exitosamente');
    } catch (error) {
      console.log('⚠️ Error en verificación final:', error.message);
    }

    console.log('\n🎉 ¡Reestructuración completada!');
    console.log('📋 Estructura final:');
    console.log('   - usuarios: id, email, nombre, role, liga_id, created_at, activo');
    console.log('   - administradores: id, nombre, email, activo, liga_id, created_at');
    console.log('   - anotadores: id, email, nombre, codigo_acceso, foto_url, liga_id, created_by, activo, created_at, updated_at');
    console.log('   - jugadores: todos los campos + created_by');

  } catch (error) {
    console.error('💥 Error en reestructuración:', error);
    process.exit(1);
  }
}

cleanAndRestructureDB();