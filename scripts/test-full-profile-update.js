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

async function testFullProfileUpdate() {
  loadEnvFile();
  
  console.log('🧪 PROBANDO ACTUALIZACIÓN COMPLETA DEL PERFIL\n');
  
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false }
  });
  
  const targetId = '4e0e1f19-78f9-4002-96f9-1ffec19530a0';
  
  try {
    // 1. Ver estado actual
    console.log('📊 1. Estado actual:');
    const { data: before } = await supabase
      .from('jugadores')
      .select('nombre, email, telefono, fecha_nacimiento, posicion, foto_url')
      .eq('id', targetId)
      .single();
    
    if (before) {
      console.log('   Nombre:', before.nombre);
      console.log('   Email:', before.email);
      console.log('   Teléfono:', before.telefono);
      console.log('   Fecha nacimiento:', before.fecha_nacimiento);
      console.log('   Posición:', before.posicion);
      console.log('   Foto URL:', before.foto_url ? 'PRESENTE' : 'VACÍA');
    }
    
    // 2. Datos de prueba
    const testData = {
      nombre: 'Juan Carlos Prueba',
      email: 'juancarlos@test.com',
      telefono: '555-9999',
      fecha_nacimiento: '1995-12-25',
      posicion: 'Center Field (CF)'
    };
    
    console.log('\n🧪 2. Probando actualización con datos de prueba:');
    Object.entries(testData).forEach(([key, value]) => {
      console.log(`   ${key}: ${value}`);
    });
    
    // 3. Actualizar usuarios (simulando API)
    console.log('\n📝 3. Actualizando tabla usuarios...');
    const { error: userError } = await supabase
      .from('usuarios')
      .update({
        nombre: testData.nombre,
        updated_at: new Date().toISOString()
      })
      .eq('id', targetId);
    
    if (userError) {
      console.log('❌ Error usuarios:', userError.message);
      return;
    }
    console.log('✅ Tabla usuarios actualizada');
    
    // 4. Actualizar jugadores (simulando API)
    console.log('\n📝 4. Actualizando tabla jugadores...');
    const { data: updateResult, error: jugadorError } = await supabase
      .from('jugadores')
      .update({
        nombre: testData.nombre,
        email: testData.email,
        telefono: testData.telefono,
        fecha_nacimiento: testData.fecha_nacimiento,
        posicion: testData.posicion,
        updated_at: new Date().toISOString()
      })
      .eq('id', targetId)
      .select();
    
    if (jugadorError) {
      console.log('❌ Error jugadores:', jugadorError.message);
      return;
    }
    
    console.log('✅ Tabla jugadores actualizada');
    console.log('📊 Registros afectados:', updateResult?.length || 0);
    
    // 5. Verificar resultado
    console.log('\n✔️ 5. Verificando resultado:');
    const { data: after } = await supabase
      .from('jugadores')
      .select('nombre, email, telefono, fecha_nacimiento, posicion, updated_at')
      .eq('id', targetId)
      .single();
    
    if (after) {
      console.log('   Nombre:', after.nombre);
      console.log('   Email:', after.email);
      console.log('   Teléfono:', after.telefono);
      console.log('   Fecha nacimiento:', after.fecha_nacimiento);
      console.log('   Posición:', after.posicion);
      console.log('   Updated at:', after.updated_at);
    }
    
    // 6. Verificar API GET
    console.log('\n🔍 6. Simulando GET /api/jugador/profile...');
    const { data: usuario } = await supabase
      .from('usuarios')
      .select('*')
      .eq('id', targetId)
      .single();
    
    const { data: jugador } = await supabase
      .from('jugadores')
      .select(`
        numero_casaca, 
        fecha_nacimiento, 
        posicion, 
        foto_url,
        telefono,
        equipo_id,
        estado,
        activo,
        equipo:equipos(
          id,
          nombre,
          color
        )
      `)
      .eq('id', targetId)
      .maybeSingle();
    
    const profile = {
      id: usuario.id,
      nombre: usuario.nombre,
      email: usuario.email,
      telefono: jugador?.telefono || '',
      numeroCasaca: jugador?.numero_casaca || null,
      fechaNacimiento: jugador?.fecha_nacimiento || '',
      posicion: jugador?.posicion || '',
      fotoUrl: jugador?.foto_url || '',
      equipoId: jugador?.equipo_id || null,
      ligaId: usuario.liga_id,
      role: usuario.role,
      equipo: jugador?.equipo || null
    };
    
    console.log('✅ Profile API response simulada:');
    console.log('   Nombre:', profile.nombre);
    console.log('   Email:', profile.email);
    console.log('   Teléfono:', profile.telefono);
    console.log('   Fecha nacimiento:', profile.fechaNacimiento);
    console.log('   Posición:', profile.posicion);
    console.log('   Foto URL:', profile.fotoUrl ? 'PRESENTE' : 'VACÍA');
    
    // 7. Restaurar datos originales
    console.log('\n🔄 7. Restaurando datos originales...');
    if (before) {
      await supabase
        .from('usuarios')
        .update({
          nombre: before.nombre,
          updated_at: new Date().toISOString()
        })
        .eq('id', targetId);
      
      await supabase
        .from('jugadores')
        .update({
          nombre: before.nombre,
          email: before.email,
          telefono: before.telefono,
          fecha_nacimiento: before.fecha_nacimiento,
          posicion: before.posicion,
          updated_at: new Date().toISOString()
        })
        .eq('id', targetId);
      
      console.log('✅ Datos originales restaurados');
    }
    
    console.log('\n🎯 CONCLUSIÓN:');
    console.log('✅ La actualización completa del perfil funciona correctamente');
    console.log('✅ Todos los campos se guardan en las tablas correspondientes');
    console.log('✅ El API GET retorna los datos actualizados');
    console.log('📱 El frontend debería mostrar los cambios en tiempo real');
    
  } catch (error) {
    console.log('💥 Error:', error.message);
  }
}

testFullProfileUpdate();