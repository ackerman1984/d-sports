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

async function revertUsuariosFields() {
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
    console.log('🔧 Revirtiendo campos específicos de jugador de tabla usuarios...');
    
    // Campos específicos de jugador que no deben estar en usuarios
    const fieldsToRemove = [
      'numero_casaca',
      'equipo_id',
      'posicion'
    ];
    
    console.log('🗑️ Eliminando campos específicos de jugador...');
    
    for (const field of fieldsToRemove) {
      try {
        const command = `ALTER TABLE usuarios DROP COLUMN IF EXISTS ${field};`;
        await supabase.rpc('execute_sql', { sql_query: command });
        console.log(`✅ Eliminado: ${field}`);
      } catch (error) {
        console.log(`⚠️ Error eliminando ${field}:`, error.message);
      }
    }
    
    // Verificar estructura final
    console.log('🔍 Verificando estructura final de usuarios...');
    const { data, error: verifyError } = await supabase
      .from('usuarios')
      .select('*')
      .limit(1);
    
    if (verifyError) {
      console.error('❌ Error verificando tabla:', verifyError);
    } else {
      console.log('✅ Tabla usuarios verificada');
      if (data && data.length > 0) {
        console.log('📋 Campos finales:', Object.keys(data[0]));
      }
    }
    
  } catch (error) {
    console.error('💥 Error revirtiendo cambios:', error);
    process.exit(1);
  }
}

revertUsuariosFields();