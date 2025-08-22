const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Load environment variables
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });

async function applyActivoMigration() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  
  if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Variables de entorno de Supabase no encontradas');
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, supabaseKey);
  
  console.log('🚀 Aplicando migración del campo activo...');
  
  try {
    // Leer el archivo SQL
    const migrationPath = path.join(__dirname, 'add-activo-temporadas.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    // Dividir en comandos individuales
    const commands = migrationSQL
      .split(';')
      .map(cmd => cmd.trim())
      .filter(cmd => cmd.length > 0 && !cmd.startsWith('--'));
    
    console.log(`📝 Ejecutando ${commands.length} comandos SQL...`);
    
    for (const command of commands) {
      if (command.trim()) {
        console.log(`🔄 Ejecutando: ${command.substring(0, 50)}...`);
        
        const { error } = await supabase.rpc('exec_sql', { sql: command });
        
        if (error && !error.message.includes('already exists')) {
          console.error('❌ Error ejecutando comando:', error);
          console.error('📝 Comando:', command);
          // No salir, continuar con el siguiente comando
        } else {
          console.log('✅ Comando ejecutado exitosamente');
        }
      }
    }
    
    console.log('✅ Migración completada');
    console.log('✨ Campo activo agregado a configuracion_temporada');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

applyActivoMigration();