const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Cargar variables de entorno
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Variables de entorno de Supabase no encontradas');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function runMigration() {
  try {
    const migrationPath = path.join(__dirname, '..', 'src', 'lib', 'supabase', 'migrations', '021_add_juegos_jugados_column.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    console.log('🚀 Ejecutando migración 021_add_juegos_jugados_column.sql...');
    
    // Ejecutar cada comando por separado
    const commands = migrationSQL.split(';').filter(cmd => cmd.trim());
    
    for (const command of commands) {
      if (command.trim()) {
        console.log('📄 Ejecutando comando:', command.trim().substring(0, 50) + '...');
        const { error } = await supabase.rpc('exec_sql', { sql: command.trim() + ';' });
        
        if (error) {
          console.error('❌ Error ejecutando comando:', error);
          if (!error.message.includes('already exists')) {
            throw error;
          } else {
            console.log('ℹ️ Comando ya aplicado, continuando...');
          }
        }
      }
    }
    
    console.log('✅ Migración ejecutada exitosamente');
  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  }
}

runMigration();