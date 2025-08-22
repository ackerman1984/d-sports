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

async function debugFotoPerfil() {
  loadEnvFile();
  
  console.log('🔍 DIAGNÓSTICO DE FOTO DE PERFIL\n');
  
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false }
  });
  
  try {
    // 1. Verificar jugadores existentes
    console.log('📋 1. Verificando jugadores existentes...');
    
    const { data: jugadores, error: jugadoresError } = await supabase
      .from('jugadores')
      .select('id, nombre, email, foto_url, telefono')
      .order('created_at', { ascending: false });
    
    if (jugadoresError) {
      console.log('❌ Error:', jugadoresError.message);
      return;
    }
    
    if (jugadores && jugadores.length > 0) {
      console.log(`✅ Encontrados ${jugadores.length} jugadores`);
      
      jugadores.forEach((jugador, index) => {
        console.log(`\n👤 Jugador ${index + 1}:`);
        console.log(`   Nombre: ${jugador.nombre}`);
        console.log(`   Email: ${jugador.email}`);
        console.log(`   Foto URL: ${jugador.foto_url || 'NO TIENE FOTO'}`);
        console.log(`   Teléfono: ${jugador.telefono || 'NO TIENE TELÉFONO'}`);
        
        if (jugador.foto_url) {
          // Verificar formato de URL
          if (jugador.foto_url.startsWith('http')) {
            console.log('   📸 Formato URL: Válido (HTTP/HTTPS)');
          } else if (jugador.foto_url.startsWith('data:')) {
            console.log('   📸 Formato URL: Data URL (Base64)');
            console.log(`   📏 Tamaño: ${jugador.foto_url.length} caracteres`);
          } else {
            console.log('   📸 Formato URL: Desconocido');
          }
        }
      });
      
      // Estadísticas
      const conFoto = jugadores.filter(j => j.foto_url).length;
      const sinFoto = jugadores.filter(j => !j.foto_url).length;
      const conTelefono = jugadores.filter(j => j.telefono).length;
      
      console.log('\n📊 Estadísticas:');
      console.log(`   Jugadores con foto: ${conFoto}/${jugadores.length}`);
      console.log(`   Jugadores sin foto: ${sinFoto}/${jugadores.length}`);
      console.log(`   Jugadores con teléfono: ${conTelefono}/${jugadores.length}`);
      
    } else {
      console.log('📊 No hay jugadores en la base de datos');
    }
    
    // 2. Simular API de perfil
    if (jugadores && jugadores.length > 0) {
      const primerJugador = jugadores[0];
      console.log(`\n🔧 2. Simulando API de perfil para: ${primerJugador.nombre}`);
      
      // Simular la consulta que hace el API
      const { data: usuario } = await supabase
        .from('usuarios')
        .select('*')
        .eq('id', primerJugador.id)
        .single();
      
      const { data: jugadorDetalle } = await supabase
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
        .eq('id', primerJugador.id)
        .maybeSingle();
      
      if (usuario && jugadorDetalle) {
        const profile = {
          id: usuario.id,
          nombre: usuario.nombre,
          email: usuario.email,
          telefono: jugadorDetalle?.telefono || '',
          numeroCasaca: jugadorDetalle?.numero_casaca || null,
          fechaNacimiento: jugadorDetalle?.fecha_nacimiento || null,
          posicion: jugadorDetalle?.posicion || 'No especificada',
          fotoUrl: jugadorDetalle?.foto_url || '',
          equipoId: jugadorDetalle?.equipo_id || null,
          ligaId: usuario.liga_id,
          role: usuario.role,
          equipo: jugadorDetalle?.equipo || null
        };
        
        console.log('✅ Profile API response simulado:');
        console.log('   Nombre:', profile.nombre);
        console.log('   Email:', profile.email);
        console.log('   Teléfono:', profile.telefono || 'VACÍO');
        console.log('   Foto URL:', profile.fotoUrl || 'VACÍO');
        console.log('   Número Casaca:', profile.numeroCasaca || 'VACÍO');
        console.log('   Equipo:', profile.equipo?.nombre || 'Sin equipo');
        
        // Diagnóstico específico de foto
        console.log('\n🔍 Diagnóstico de foto:');
        if (profile.fotoUrl) {
          console.log('✅ El perfil tiene fotoUrl');
          console.log('📱 El frontend debería mostrar la imagen');
          
          if (profile.fotoUrl.startsWith('data:image/')) {
            console.log('📸 Tipo: Base64 - Debería funcionar en el frontend');
          } else if (profile.fotoUrl.startsWith('http')) {
            console.log('📸 Tipo: URL externa - Verificar accesibilidad');
          } else {
            console.log('⚠️ Tipo: Formato no reconocido');
          }
        } else {
          console.log('❌ El perfil NO tiene fotoUrl');
          console.log('📱 El frontend mostrará avatar con inicial del nombre');
        }
        
      } else {
        console.log('❌ Error simulando API de perfil');
      }
    }
    
    // 3. Consejos de resolución
    console.log('\n💡 CONSEJOS PARA RESOLVER:');
    console.log('   1. Verificar que el jugador haya subido una foto');
    console.log('   2. Verificar que el campo foto_url se guarde en la base de datos');
    console.log('   3. Verificar que el API de perfil incluya foto_url en la respuesta');
    console.log('   4. Verificar que el frontend reciba y use correctamente fotoUrl');
    
    console.log('\n🛠️ PASOS PARA PROBAR:');
    console.log('   1. Editar perfil del jugador y subir una foto');
    console.log('   2. Verificar en Supabase que se guardó en jugadores.foto_url');
    console.log('   3. Recargar la página del jugador');
    console.log('   4. Verificar en DevTools que el API retorna fotoUrl');
    
  } catch (error) {
    console.log('💥 Error:', error.message);
  }
}

debugFotoPerfil();