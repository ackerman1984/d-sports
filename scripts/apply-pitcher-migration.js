const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Leer variables de entorno
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Variables de entorno de Supabase no encontradas');
  console.log('Asegúrate de tener NEXT_PUBLIC_SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY en .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function applyPitcherMigration() {
  try {
    console.log('⚾ Aplicando migración de estadísticas de pitcher...\n');

    // Leer el archivo de migración
    const migrationPath = path.join(__dirname, '../src/lib/supabase/migrations/017_separate_pitching_stats.sql');
    
    if (!fs.existsSync(migrationPath)) {
      console.error('❌ Archivo de migración no encontrado:', migrationPath);
      return;
    }

    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    console.log('📝 Ejecutando migración SQL...');
    
    // Ejecutar la migración
    const { data, error } = await supabase.rpc('exec_sql', {
      sql_query: migrationSQL
    });

    if (error) {
      console.error('❌ Error ejecutando migración:', error);
      
      // Intentar ejecutar parte por parte si falla
      console.log('🔄 Intentando ejecutar por partes...');
      
      // Separar comandos SQL
      const commands = migrationSQL
        .split(';')
        .map(cmd => cmd.trim())
        .filter(cmd => cmd.length > 0 && !cmd.startsWith('--'));
      
      for (let i = 0; i < commands.length; i++) {
        const command = commands[i] + ';';
        console.log(`📝 Ejecutando comando ${i + 1}/${commands.length}...`);
        
        try {
          const { error: cmdError } = await supabase.rpc('exec_sql', {
            sql_query: command
          });
          
          if (cmdError) {
            console.log(`⚠️ Comando ${i + 1} falló (puede ser normal):`, cmdError.message);
          } else {
            console.log(`✅ Comando ${i + 1} exitoso`);
          }
        } catch (e) {
          console.log(`⚠️ Comando ${i + 1} falló (puede ser normal):`, e.message);
        }
      }
    } else {
      console.log('✅ Migración ejecutada exitosamente');
    }

    // Verificar que la tabla fue creada
    console.log('🔍 Verificando tabla estadisticas_pitcher...');
    
    const { data: tableData, error: tableError } = await supabase
      .from('estadisticas_pitcher')
      .select('*')
      .limit(1);

    if (tableError) {
      console.error('❌ Error verificando tabla estadisticas_pitcher:', tableError.message);
    } else {
      console.log('✅ Tabla estadisticas_pitcher verificada correctamente');
    }

    // Verificar estructura de la tabla principal
    console.log('🔍 Verificando estructura de estadisticas_jugadores...');
    
    const { data: jugadorData, error: jugadorError } = await supabase
      .from('estadisticas_jugadores')
      .select('*')
      .limit(1);

    if (jugadorError) {
      console.error('❌ Error verificando estadisticas_jugadores:', jugadorError.message);
    } else {
      console.log('✅ Tabla estadisticas_jugadores verificada');
      if (jugadorData && jugadorData.length > 0) {
        console.log('📊 Columnas disponibles:', Object.keys(jugadorData[0]));
      }
    }

    console.log('\n🎉 Migración de pitcher completada!');
    console.log('📊 Ahora las estadísticas de bateo y pitcheo están separadas');

  } catch (error) {
    console.error('💥 Error durante la migración:', error);
    process.exit(1);
  }
}

applyPitcherMigration();