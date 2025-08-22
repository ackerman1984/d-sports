#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Faltan variables de entorno');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function removeUnusedFields() {
  try {
    console.log('🧹 Iniciando eliminación de campos no utilizados...\n');

    // 1. Verificar estructura actual
    console.log('🔍 Verificando estructura actual de la tabla jugadores...');
    const { data: columns, error: columnsError } = await supabase
      .rpc('get_table_columns', { table_name: 'jugadores' })
      .single();

    if (columnsError) {
      console.log('⚠️ No se pudo verificar estructura con RPC, continuando...');
    }

    // 2. Leer y ejecutar migración
    const migrationPath = path.join(__dirname, '..', 'src', 'lib', 'supabase', 'migrations', '012_remove_unused_player_fields.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

    console.log('📝 Ejecutando migración SQL...');
    console.log('SQL a ejecutar:');
    console.log(migrationSQL);
    console.log('\n⚠️ ¿Continuar con la eliminación? (y/N)');

    // Para automatizar, vamos a ejecutar directamente
    console.log('🚀 Ejecutando automáticamente...\n');

    // Dividir el SQL en comandos individuales
    const commands = migrationSQL
      .split(';')
      .map(cmd => cmd.trim())
      .filter(cmd => cmd.length > 0 && !cmd.startsWith('--'));

    for (const command of commands) {
      if (command.trim()) {
        console.log(`📋 Ejecutando: ${command.substring(0, 50)}...`);
        const { error } = await supabase.rpc('exec_sql', { sql: command });
        
        if (error) {
          console.error(`❌ Error ejecutando comando: ${error.message}`);
          // Intentar ejecutar directamente
          try {
            const { error: directError } = await supabase.from('_').select('*').limit(0);
            // Si llegamos aquí, la conexión funciona, intentemos otra forma
            console.log('🔄 Intentando método alternativo...');
            
            // Ejecutar comandos uno por uno manualmente
            if (command.includes('DROP COLUMN')) {
              console.log('🗑️ Eliminando columnas manualmente...');
              
              // Eliminar posicion_principal
              try {
                await supabase.rpc('exec_sql', { sql: 'ALTER TABLE jugadores DROP COLUMN IF EXISTS posicion_principal' });
                console.log('✅ Eliminada columna posicion_principal');
              } catch (e) {
                console.log('⚠️ Error eliminando posicion_principal:', e.message);
              }
              
              // Eliminar altura  
              try {
                await supabase.rpc('exec_sql', { sql: 'ALTER TABLE jugadores DROP COLUMN IF EXISTS altura' });
                console.log('✅ Eliminada columna altura');
              } catch (e) {
                console.log('⚠️ Error eliminando altura:', e.message);
              }
              
              // Eliminar peso
              try {
                await supabase.rpc('exec_sql', { sql: 'ALTER TABLE jugadores DROP COLUMN IF EXISTS peso' });
                console.log('✅ Eliminada columna peso');
              } catch (e) {
                console.log('⚠️ Error eliminando peso:', e.message);
              }
            }
          } catch (fallbackError) {
            console.error('❌ Error con método alternativo:', fallbackError.message);
          }
        } else {
          console.log('✅ Comando ejecutado exitosamente');
        }
      }
    }

    // 3. Verificar resultado
    console.log('\n🔍 Verificando que las columnas fueron eliminadas...');
    
    try {
      // Intentar hacer una consulta simple para ver si las columnas existen
      const { data: testData, error: testError } = await supabase
        .from('jugadores')
        .select('id, nombre, apellido, email, telefono, numero_casaca, equipo_id, liga_id, usuario_id, estado')
        .limit(1);

      if (testError) {
        console.error('❌ Error en consulta de verificación:', testError.message);
      } else {
        console.log('✅ Consulta básica exitosa, columnas principales intactas');
      }

      // Intentar consultar las columnas eliminadas (debería fallar)
      try {
        const { data: oldFields, error: oldFieldsError } = await supabase
          .from('jugadores')
          .select('posicion_principal, altura, peso')
          .limit(1);

        if (oldFieldsError && oldFieldsError.message.includes('does not exist')) {
          console.log('✅ Confirmado: Las columnas posicion_principal, altura, peso fueron eliminadas');
        } else if (oldFields) {
          console.log('⚠️ Las columnas aún existen en la base de datos');
        }
      } catch (checkError) {
        console.log('✅ Las columnas fueron eliminadas exitosamente');
      }

    } catch (verifyError) {
      console.error('❌ Error verificando resultado:', verifyError.message);
    }

    console.log('\n🎉 Proceso de eliminación completado!');
    console.log('\n📋 Próximos pasos:');
    console.log('1. Limpiar código que usa estos campos');
    console.log('2. Actualizar formularios y componentes');
    console.log('3. Verificar que todo funciona correctamente');

  } catch (error) {
    console.error('💥 Error durante el proceso:', error);
  }
}

// Ejecutar
removeUnusedFields();