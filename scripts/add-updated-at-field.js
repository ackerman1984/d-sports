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

async function addUpdatedAtField() {
  loadEnvFile();
  
  console.log('🔧 AGREGANDO CAMPO updated_at A TABLA usuarios\n');
  
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false }
  });
  
  try {
    // Intentar una inserción que incluya updated_at para ver si funciona
    console.log('🧪 Probando inserción con updated_at...');
    
    const testId = '99999999-9999-9999-9999-999999999999';
    const testEmail = `test-updated-at-${Date.now()}@example.com`;
    
    const { data, error } = await supabase
      .from('usuarios')
      .upsert({
        id: testId,
        email: testEmail,
        nombre: 'Test Updated At',
        role: 'admin',
        liga_id: null,
        activo: true,
        updated_at: new Date().toISOString()
      })
      .select();
    
    if (error) {
      if (error.message.includes('updated_at')) {
        console.log('❌ Campo updated_at no existe en tabla usuarios');
        console.log('📝 NECESITAS EJECUTAR EN SUPABASE DASHBOARD:');
        console.log('   ALTER TABLE usuarios ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();');
        console.log('   UPDATE usuarios SET updated_at = created_at WHERE updated_at IS NULL;');
        console.log('\n💡 También disponible en: scripts/fix-usuarios-table.sql');
      } else {
        console.log('❌ Error diferente:', error.message);
      }
    } else {
      console.log('✅ Campo updated_at ya existe y funciona correctamente');
      console.log('📊 Datos insertados:', data);
      
      // Limpiar
      await supabase.from('usuarios').delete().eq('id', testId);
      console.log('🧹 Datos de prueba eliminados');
    }
    
  } catch (error) {
    console.log('💥 Error:', error.message);
  }
}

addUpdatedAtField();