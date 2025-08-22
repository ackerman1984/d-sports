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

async function diagnoseAuthError() {
  loadEnvFile();
  
  console.log('🔍 DIAGNÓSTICO DE ERROR DE AUTENTICACIÓN\n');
  
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  
  // 1. Verificar variables de entorno
  console.log('📋 1. Variables de entorno:');
  console.log('   NEXT_PUBLIC_SUPABASE_URL:', supabaseUrl ? '✅ Configurada' : '❌ Faltante');
  console.log('   SUPABASE_SERVICE_ROLE_KEY:', serviceRoleKey ? '✅ Configurada' : '❌ Faltante');
  console.log('   NEXT_PUBLIC_SUPABASE_ANON_KEY:', anonKey ? '✅ Configurada' : '❌ Faltante');
  
  if (!supabaseUrl || !serviceRoleKey) {
    console.log('\n❌ Variables de entorno faltantes. Verifica tu archivo .env.local');
    return;
  }
  
  // 2. Verificar conectividad básica
  console.log('\n🔗 2. Verificando conectividad básica...');
  try {
    const anonClient = createClient(supabaseUrl, anonKey);
    const { data, error } = await anonClient.from('usuarios').select('count').limit(1);
    
    if (error && error.code !== 'PGRST116') {
      console.log('⚠️ Conectividad con problema:', error.message);
    } else {
      console.log('✅ Conectividad básica OK');
    }
  } catch (e) {
    console.log('❌ Error de conectividad:', e.message);
  }
  
  // 3. Verificar service role key
  console.log('\n🔑 3. Verificando service role key...');
  try {
    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    });
    
    // Probar una operación simple con admin client
    const { data, error } = await adminClient.from('usuarios').select('count').limit(1);
    
    if (error) {
      console.log('❌ Service role key inválida o problema RLS:', error.message);
    } else {
      console.log('✅ Service role key funciona correctamente');
    }
  } catch (e) {
    console.log('❌ Error con service role:', e.message);
  }
  
  // 4. Probar creación de usuario con información detallada
  console.log('\n👤 4. Probando creación de usuario de prueba...');
  try {
    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    });
    
    const testEmail = `test-${Date.now()}@example.com`;
    const testPassword = 'testpassword123';
    
    console.log('   Email de prueba:', testEmail);
    console.log('   Intentando crear usuario...');
    
    const { data: authData, error: authError } = await adminClient.auth.admin.createUser({
      email: testEmail,
      password: testPassword,
      email_confirm: true,
    });
    
    if (authError) {
      console.log('❌ ERROR DETALLADO en creación de usuario:');
      console.log('   Código:', authError.code || 'N/A');
      console.log('   Mensaje:', authError.message);
      console.log('   Status:', authError.status || 'N/A');
      console.log('   Detalles completos:', JSON.stringify(authError, null, 2));
      
      // Diagnósticos específicos según el error
      if (authError.message.includes('email')) {
        console.log('\n💡 POSIBLES CAUSAS (email):');
        console.log('   - Email ya existe en el proyecto');
        console.log('   - Formato de email inválido');
        console.log('   - Restricciones de dominio en Supabase');
      }
      
      if (authError.message.includes('password')) {
        console.log('\n💡 POSIBLES CAUSAS (password):');
        console.log('   - Password no cumple requisitos mínimos');
        console.log('   - Configuración de seguridad muy estricta');
      }
      
      if (authError.message.includes('rate limit') || authError.message.includes('limit')) {
        console.log('\n💡 POSIBLES CAUSAS (límites):');
        console.log('   - Límite de usuarios alcanzado');
        console.log('   - Rate limiting activo');
        console.log('   - Plan de Supabase con restricciones');
      }
      
      if (authError.message.includes('database') || authError.message.includes('Database')) {
        console.log('\n💡 POSIBLES CAUSAS (base de datos):');
        console.log('   - Triggers de base de datos fallando');
        console.log('   - Tabla auth.users con problemas');
        console.log('   - RLS policies muy restrictivas');
        console.log('   - Constraints violados');
      }
      
    } else if (authData?.user) {
      console.log('✅ Usuario creado exitosamente');
      console.log('   ID:', authData.user.id);
      console.log('   Email:', authData.user.email);
      
      // Limpiar el usuario de prueba
      console.log('   Eliminando usuario de prueba...');
      await adminClient.auth.admin.deleteUser(authData.user.id);
      console.log('✅ Usuario de prueba eliminado');
      
    } else {
      console.log('❌ Sin error pero sin datos de usuario');
    }
    
  } catch (e) {
    console.log('💥 Excepción en prueba de usuario:', e.message);
    console.log('   Stack:', e.stack);
  }
  
  // 5. Verificar configuración del proyecto Supabase
  console.log('\n⚙️ 5. Recomendaciones para verificar en Supabase Dashboard:');
  console.log('   📧 Authentication > Settings > Email Auth habilitado');
  console.log('   🔒 Authentication > Settings > Enable email confirmations');
  console.log('   👥 Authentication > Users > Verificar límites');
  console.log('   🔑 Settings > API > Service Role Key válida');
  console.log('   📊 Settings > Database > Triggers funcionando');
  
  console.log('\n📝 SIGUIENTE PASO:');
  console.log('   Revisa el error detallado arriba y verifica la configuración');
  console.log('   correspondiente en tu proyecto de Supabase.');
}

diagnoseAuthError();