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

  console.log('🚀 Aplicando migración para corregir políticas RLS de equipos...\n');

  try {
    // Read the migration file
    const migrationPath = path.join(__dirname, '..', 'src', 'lib', 'supabase', 'migrations', '005_fix_equipos_rls.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    console.log('📝 Ejecutando migración 005_fix_equipos_rls.sql...');
    
    const { data, error } = await supabase.rpc('exec', {
      sql: migrationSQL
    });

    if (error) {
      console.error('❌ Error ejecutando migración:', error);
      console.log('');
      console.log('📋 Instrucciones manuales:');
      console.log('1. Ve a: https://supabase.com/dashboard/project/[tu-project-id]');
      console.log('2. Ve a SQL Editor');
      console.log('3. Ejecuta el contenido de:');
      console.log('   src/lib/supabase/migrations/005_fix_equipos_rls.sql');
      return;
    }

    console.log('✅ Migración aplicada exitosamente!');
    console.log('');
    console.log('🎯 Políticas RLS de equipos actualizadas:');
    console.log('   - Admins pueden crear equipos en su liga');
    console.log('   - Admins pueden ver/editar/eliminar equipos de su liga');
    console.log('');
    console.log('✨ Ya puedes crear equipos desde el panel de administración!');

  } catch (error) {
    console.error('❌ Error:', error);
    console.log('');
    console.log('💡 Aplicar manualmente la migración en Supabase Dashboard');
  }
}

applyMigration();