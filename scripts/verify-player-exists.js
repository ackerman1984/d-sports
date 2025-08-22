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

async function verifyPlayerExists() {
  loadEnvFile();
  
  console.log('🔍 VERIFICANDO SI EL JUGADOR EXISTE\n');
  
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false }
  });
  
  const targetId = '4e0e1f19-78f9-4002-96f9-1ffec19530a0';
  
  try {
    console.log('🆔 Buscando jugador con ID:', targetId);
    
    // 1. Buscar en tabla jugadores
    const { data: jugador, error: jugadorError } = await supabase
      .from('jugadores')
      .select('*')
      .eq('id', targetId)
      .maybeSingle();
    
    console.log('\n📊 Resultado en tabla jugadores:');
    if (jugadorError) {
      console.log('❌ Error:', jugadorError);
    } else if (jugador) {
      console.log('✅ Jugador encontrado:');
      console.log('   Nombre:', jugador.nombre);
      console.log('   Email:', jugador.email);
      console.log('   Fecha nacimiento:', jugador.fecha_nacimiento);
      console.log('   Posición:', jugador.posicion);
      console.log('   Número casaca:', jugador.numero_casaca);
      console.log('   Equipo ID:', jugador.equipo_id);
      console.log('   Liga ID:', jugador.liga_id);
      console.log('   Created at:', jugador.created_at);
      console.log('   Updated at:', jugador.updated_at);
    } else {
      console.log('❌ NO SE ENCONTRÓ jugador con ese ID');
    }
    
    // 2. Buscar en tabla usuarios
    const { data: usuario, error: usuarioError } = await supabase
      .from('usuarios')
      .select('*')
      .eq('id', targetId)
      .maybeSingle();
    
    console.log('\n📊 Resultado en tabla usuarios:');
    if (usuarioError) {
      console.log('❌ Error:', usuarioError);
    } else if (usuario) {
      console.log('✅ Usuario encontrado:');
      console.log('   Nombre:', usuario.nombre);
      console.log('   Email:', usuario.email);
      console.log('   Role:', usuario.role);
      console.log('   Liga ID:', usuario.liga_id);
    } else {
      console.log('❌ NO SE ENCONTRÓ usuario con ese ID');
    }
    
    // 3. Buscar todos los jugadores para ver qué IDs existen
    const { data: todosJugadores } = await supabase
      .from('jugadores')
      .select('id, nombre, email')
      .limit(10);
    
    console.log('\n📋 Todos los jugadores en la BD:');
    todosJugadores?.forEach((j, index) => {
      console.log(`   ${index + 1}. ID: ${j.id}`);
      console.log(`      Nombre: ${j.nombre}`);
      console.log(`      Email: ${j.email}`);
      console.log('');
    });
    
    // 4. Intentar actualización directa
    if (jugador) {
      console.log('🧪 Intentando actualización directa...');
      const { data: updateTest, error: updateError } = await supabase
        .from('jugadores')
        .update({
          posicion: 'Test Update',
          updated_at: new Date().toISOString()
        })
        .eq('id', targetId)
        .select();
      
      console.log('Resultado:', {
        data: updateTest,
        error: updateError,
        affected: updateTest?.length || 0
      });
    }
    
  } catch (error) {
    console.log('💥 Error:', error.message);
  }
}

verifyPlayerExists();