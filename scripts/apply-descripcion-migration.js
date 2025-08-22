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

async function applyMigration() {
  loadEnvFile();
  
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    console.error('Missing Supabase credentials in .env.local');
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });

  console.log('🚀 Aplicando migración para agregar columna descripcion a equipos...\n');

  try {
    // Read the migration file
    const migrationPath = path.join(__dirname, '..', 'src', 'lib', 'supabase', 'migrations', '013_add_descripcion_to_equipos.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    console.log('⚠️  Esta migración debe aplicarse manualmente en Supabase Dashboard');
    console.log('');
    console.log('📋 Instrucciones:');
    console.log('1. Ve a: https://supabase.com/dashboard/project/[tu-project-id]');
    console.log('2. Ve a SQL Editor');
    console.log('3. Ejecuta el siguiente SQL:');
    console.log('');
    console.log('═══════════════════════════════════════════════════════════');
    console.log(migrationSQL);
    console.log('═══════════════════════════════════════════════════════════');
    console.log('');
    console.log('🎯 Este cambio agregará:');
    console.log('   - Columna "descripcion" (TEXT) a la tabla equipos');
    console.log('   - La columna es opcional (permite NULL)');
    console.log('');
    console.log('✨ Después de aplicar la migración, podrás agregar descripciones a los equipos!');

  } catch (error) {
    console.error('❌ Error leyendo el archivo de migración:', error);
  }
}

applyMigration();