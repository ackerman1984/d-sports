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

async function checkTriggers() {
  loadEnvFile();
  
  console.log('🔍 VERIFICANDO TRIGGERS DE BASE DE DATOS\n');
  
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false }
  });
  
  try {
    // Crear un usuario de prueba y ver qué pasa
    const testEmail = `trigger-test-${Date.now()}@example.com`;
    
    console.log('📧 Creando usuario de prueba:', testEmail);
    
    // 1. Crear usuario en auth
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: testEmail,
      password: 'testpassword123',
      email_confirm: true,
    });
    
    if (authError) {
      console.log('❌ Error creando usuario auth:', authError.message);
      return;
    }
    
    console.log('✅ Usuario auth creado:', authData.user.id);
    
    // 2. Verificar si automáticamente se creó en tabla usuarios
    console.log('\n🔍 Verificando si se creó automáticamente en tabla usuarios...');
    
    const { data: usuarioData, error: usuarioError } = await supabase
      .from('usuarios')
      .select('*')
      .eq('id', authData.user.id)
      .single();
    
    if (usuarioError && usuarioError.code === 'PGRST116') {
      console.log('✅ NO hay trigger automático - tabla usuarios vacía');
      console.log('   Esto es correcto para nuestra arquitectura');
    } else if (usuarioData) {
      console.log('⚠️ ¡TRIGGER DETECTADO! Usuario creado automáticamente en tabla usuarios:');
      console.log('   ID:', usuarioData.id);
      console.log('   Email:', usuarioData.email);
      console.log('   Nombre:', usuarioData.nombre || 'null');
      console.log('   Role:', usuarioData.role || 'null');
      console.log('   Liga ID:', usuarioData.liga_id || 'null');
      console.log('   Campos completos:', Object.keys(usuarioData).join(', '));
      
      console.log('\n🔧 SOLUCIÓN NECESARIA:');
      console.log('   El trigger está creando usuarios automáticamente con datos incompletos.');
      console.log('   Opciones:');
      console.log('   1. Usar UPSERT en lugar de INSERT en el API');
      console.log('   2. Desactivar el trigger (si no es necesario)');
      console.log('   3. Modificar el trigger para ser compatible');
      
    } else {
      console.log('❌ Error inesperado:', usuarioError?.message);
    }
    
    // 3. Limpiar
    console.log('\n🧹 Limpiando usuario de prueba...');
    if (usuarioData) {
      await supabase.from('usuarios').delete().eq('id', authData.user.id);
    }
    await supabase.auth.admin.deleteUser(authData.user.id);
    console.log('✅ Limpieza completada');
    
  } catch (error) {
    console.log('💥 Error:', error.message);
  }
}

checkTriggers();