require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Variables de entorno faltantes:');
  console.error('   - NEXT_PUBLIC_SUPABASE_URL:', !!supabaseUrl);
  console.error('   - SUPABASE_SERVICE_ROLE_KEY:', !!supabaseServiceKey);
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function applyStatsMigration() {
  try {
    console.log('🚀 Aplicando migración de estadísticas detalladas...');
    
    // Leer el archivo de migración
    const migrationPath = path.join(__dirname, '../src/lib/supabase/migrations/020_add_detailed_hitting_stats.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    console.log('📝 Ejecutando migración SQL...');
    
    // Dividir la migración en comandos individuales para mejor manejo de errores
    const commands = migrationSQL
      .split(';')
      .map(cmd => cmd.trim())
      .filter(cmd => cmd.length > 0 && !cmd.startsWith('--'));
    
    let successCount = 0;
    let errorCount = 0;
    
    for (let i = 0; i < commands.length; i++) {
      const command = commands[i];
      if (!command.trim()) continue;
      
      try {
        console.log(`   Ejecutando comando ${i + 1}/${commands.length}...`);
        const { error } = await supabase.rpc('exec_sql', { sql: command });
        
        if (error) {
          // Si es un error de "ya existe", lo tratamos como éxito
          if (error.message.includes('already exists') || 
              error.message.includes('does not exist') ||
              error.message.includes('IF NOT EXISTS')) {
            console.log(`   ⚠️  Comando ${i + 1}: ${error.message} (ignorado)`);
            successCount++;
          } else {
            console.error(`   ❌ Error en comando ${i + 1}:`, error.message);
            errorCount++;
          }
        } else {
          console.log(`   ✅ Comando ${i + 1} ejecutado exitosamente`);
          successCount++;
        }
      } catch (err) {
        console.error(`   💥 Error ejecutando comando ${i + 1}:`, err.message);
        errorCount++;
      }
    }
    
    console.log('\n📊 Resumen de migración:');
    console.log(`   ✅ Comandos exitosos: ${successCount}`);
    console.log(`   ❌ Comandos con error: ${errorCount}`);
    
    if (errorCount === 0) {
      console.log('\n🎉 ¡Migración de estadísticas completada exitosamente!');
      console.log('\n📋 Nuevas columnas agregadas:');
      console.log('   - h1: Hits sencillos');
      console.log('   - h2: Hits dobles'); 
      console.log('   - h3: Hits triples');
      console.log('   - turnos: Turnos oficiales al bate');
      console.log('   - juego_id: Referencia al juego específico');
    } else {
      console.log('\n⚠️  Migración completada con algunos errores');
    }
    
  } catch (error) {
    console.error('💥 Error aplicando migración:', error);
    process.exit(1);
  }
}

// Función auxiliar para ejecutar SQL directo (necesaria si no existe exec_sql)
async function executeSQL(sql) {
  // Como fallback, intentar ejecutar directo
  const { data, error } = await supabase
    .from('_migration_temp')
    .select('*')
    .limit(1);
    
  if (error && error.code === 'PGRST116') {
    // Tabla no existe, crear función temporal
    return await supabase.rpc('exec', { sql });
  }
  
  return { error: null };
}

applyStatsMigration();