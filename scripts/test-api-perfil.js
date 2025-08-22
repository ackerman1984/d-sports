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

async function testAPIProfile() {
  loadEnvFile();
  
  console.log('🧪 PROBANDO API DE PERFIL SIMULADO\n');
  
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false }
  });
  
  try {
    // Obtener el jugador con foto
    const { data: jugadorConFoto } = await supabase
      .from('jugadores')
      .select('id, nombre, email, foto_url')
      .not('foto_url', 'is', null)
      .limit(1)
      .single();
    
    if (!jugadorConFoto) {
      console.log('❌ No hay jugadores con foto en la base de datos');
      return;
    }
    
    console.log(`👤 Probando API para: ${jugadorConFoto.nombre}`);
    console.log(`📧 Email: ${jugadorConFoto.email}`);
    console.log(`🆔 ID: ${jugadorConFoto.id}`);
    
    // Simular exactamente lo que hace el API /api/jugador/profile
    console.log('\n🔧 Simulando API /api/jugador/profile...');
    
    // 1. Obtener datos del usuario
    const { data: usuario, error: usuarioError } = await supabase
      .from('usuarios')
      .select('*')
      .eq('id', jugadorConFoto.id)
      .single();
    
    if (usuarioError) {
      console.log('❌ Error obteniendo usuario:', usuarioError.message);
      return;
    }
    
    console.log('✅ Paso 1: Usuario obtenido');
    
    // 2. Obtener datos del jugador (como en el API actual)
    const { data: jugador, error: jugadorError } = await supabase
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
      .eq('id', jugadorConFoto.id)
      .maybeSingle();
    
    if (jugadorError) {
      console.log('❌ Error obteniendo jugador:', jugadorError.message);
      return;
    }
    
    console.log('✅ Paso 2: Datos de jugador obtenidos');
    
    // 3. Combinar datos (como en el API actual)
    const profile = {
      id: usuario.id,
      nombre: usuario.nombre,
      email: usuario.email,
      telefono: jugador?.telefono || '',
      numeroCasaca: jugador?.numero_casaca || null,
      fechaNacimiento: jugador?.fecha_nacimiento || null,
      posicion: jugador?.posicion || 'No especificada',
      fotoUrl: jugador?.foto_url || '',
      equipoId: jugador?.equipo_id || null,
      ligaId: usuario.liga_id,
      role: usuario.role,
      equipo: jugador?.equipo || null
    };
    
    console.log('✅ Paso 3: Profile combinado creado');
    
    // 4. Mostrar resultado del API
    console.log('\n📋 RESPUESTA SIMULADA DEL API:');
    console.log('   Nombre:', profile.nombre);
    console.log('   Email:', profile.email);
    console.log('   Teléfono:', profile.telefono || 'VACÍO');
    console.log('   Número Casaca:', profile.numeroCasaca || 'VACÍO');
    console.log('   Posición:', profile.posicion);
    console.log('   Equipo:', profile.equipo?.nombre || 'Sin equipo');
    
    // 5. Analizar la foto específicamente
    console.log('\n🔍 ANÁLISIS DE FOTO:');
    if (profile.fotoUrl) {
      console.log('✅ fotoUrl está presente en la respuesta');
      console.log('📏 Longitud:', profile.fotoUrl.length, 'caracteres');
      
      if (profile.fotoUrl.startsWith('data:image/')) {
        console.log('📸 Formato: Base64 válido');
        console.log('🎨 Tipo MIME:', profile.fotoUrl.substring(5, profile.fotoUrl.indexOf(';')));
      } else {
        console.log('⚠️ Formato no reconocido');
      }
      
      // Mostrar primeros caracteres
      console.log('🔤 Inicio:', profile.fotoUrl.substring(0, 50) + '...');
      
    } else {
      console.log('❌ fotoUrl está VACÍO en la respuesta del API');
      console.log('🔍 Verificando datos raw:');
      console.log('   jugador.foto_url:', jugador?.foto_url ? 'PRESENTE' : 'VACÍO');
    }
    
    // 6. Simular lo que debería ver el frontend
    console.log('\n📱 LO QUE DEBERÍA VER EL FRONTEND:');
    if (profile.fotoUrl) {
      console.log('✅ Debería mostrar la imagen usando:');
      console.log('   <Image src={profile.fotoUrl} alt={profile.nombre} />');
      console.log('📸 La imagen debería renderizarse correctamente');
    } else {
      console.log('❌ Debería mostrar avatar con inicial:');
      console.log(`   Inicial: ${profile.nombre?.charAt(0).toUpperCase() || 'J'}`);
    }
    
    // 7. Conclusión
    console.log('\n🎯 CONCLUSIÓN:');
    if (profile.fotoUrl) {
      console.log('✅ El API está funcionando correctamente');
      console.log('📱 El problema está en el FRONTEND');
      console.log('🔧 Soluciones posibles:');
      console.log('   1. Verificar que el fetch() en el frontend obtiene fotoUrl');
      console.log('   2. Verificar que el componente Image está recibiendo la URL');
      console.log('   3. Verificar que no hay errores de CORS o CSP');
      console.log('   4. Abrir DevTools y verificar la respuesta del API');
    } else {
      console.log('❌ El API NO está retornando fotoUrl');
      console.log('🔧 Necesita corregirse el API de perfil');
    }
    
  } catch (error) {
    console.log('💥 Error:', error.message);
  }
}

testAPIProfile();