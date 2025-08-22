#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Faltan variables de entorno');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function removeColumnsDirectly() {
  try {
    console.log('🗑️ Eliminando columnas directamente usando SQL...\n');

    // 1. Verificar qué columnas existen actualmente
    console.log('🔍 Verificando columnas existentes...');
    try {
      const { data: currentData, error: currentError } = await supabase
        .from('jugadores')
        .select('*')
        .limit(1);

      if (currentData && currentData.length > 0) {
        console.log('📋 Columnas actuales en la tabla jugadores:');
        Object.keys(currentData[0]).forEach(col => {
          const status = ['posicion_principal', 'altura', 'peso'].includes(col) ? ' ❌ (A ELIMINAR)' : ' ✅';
          console.log(`   - ${col}${status}`);
        });
      }
    } catch (error) {
      console.log('⚠️ Error obteniendo estructura actual:', error.message);
    }

    console.log('\n🚀 Ejecutando comandos SQL para eliminar columnas...\n');

    // 2. Eliminar columna posicion_principal
    console.log('1️⃣ Eliminando columna posicion_principal...');
    try {
      // Usar una consulta SQL directa a través de RPC o SQL
      const { error: error1 } = await supabase.rpc('exec_sql', { 
        sql: 'ALTER TABLE jugadores DROP COLUMN IF EXISTS posicion_principal;' 
      });
      
      if (error1) {
        console.log('⚠️ Error con RPC, intentando método alternativo...');
        // Si RPC no funciona, necesitamos hacerlo manualmente en Supabase Dashboard
        console.log('📝 SQL MANUAL: ALTER TABLE jugadores DROP COLUMN IF EXISTS posicion_principal;');
      } else {
        console.log('✅ Columna posicion_principal eliminada');
      }
    } catch (e) {
      console.log('📝 SQL MANUAL: ALTER TABLE jugadores DROP COLUMN IF EXISTS posicion_principal;');
    }

    // 3. Eliminar columna altura
    console.log('\n2️⃣ Eliminando columna altura...');
    try {
      const { error: error2 } = await supabase.rpc('exec_sql', { 
        sql: 'ALTER TABLE jugadores DROP COLUMN IF EXISTS altura;' 
      });
      
      if (error2) {
        console.log('📝 SQL MANUAL: ALTER TABLE jugadores DROP COLUMN IF EXISTS altura;');
      } else {
        console.log('✅ Columna altura eliminada');
      }
    } catch (e) {
      console.log('📝 SQL MANUAL: ALTER TABLE jugadores DROP COLUMN IF EXISTS altura;');
    }

    // 4. Eliminar columna peso
    console.log('\n3️⃣ Eliminando columna peso...');
    try {
      const { error: error3 } = await supabase.rpc('exec_sql', { 
        sql: 'ALTER TABLE jugadores DROP COLUMN IF EXISTS peso;' 
      });
      
      if (error3) {
        console.log('📝 SQL MANUAL: ALTER TABLE jugadores DROP COLUMN IF EXISTS peso;');
      } else {
        console.log('✅ Columna peso eliminada');
      }
    } catch (e) {
      console.log('📝 SQL MANUAL: ALTER TABLE jugadores DROP COLUMN IF EXISTS peso;');
    }

    console.log('\n📋 INSTRUCCIONES MANUALES PARA SUPABASE DASHBOARD:');
    console.log('=' .repeat(60));
    console.log('Si los comandos automáticos no funcionaron, ejecuta estos comandos en el SQL Editor de Supabase:');
    console.log('');
    console.log('1. Ve a tu proyecto en https://supabase.com');
    console.log('2. Ve a SQL Editor');
    console.log('3. Ejecuta estos comandos uno por uno:');
    console.log('');
    console.log('   ALTER TABLE jugadores DROP COLUMN IF EXISTS posicion_principal;');
    console.log('   ALTER TABLE jugadores DROP COLUMN IF EXISTS altura;');
    console.log('   ALTER TABLE jugadores DROP COLUMN IF EXISTS peso;');
    console.log('');
    console.log('=' .repeat(60));

    // 5. Verificar resultado
    console.log('\n🔍 Verificando resultado...');
    setTimeout(async () => {
      try {
        const { data: verifyData, error: verifyError } = await supabase
          .from('jugadores')
          .select('*')
          .limit(1);

        if (verifyData && verifyData.length > 0) {
          console.log('\n📋 Columnas después de la eliminación:');
          Object.keys(verifyData[0]).forEach(col => {
            console.log(`   ✅ ${col}`);
          });

          const hasOldFields = Object.keys(verifyData[0]).some(col => 
            ['posicion_principal', 'altura', 'peso'].includes(col)
          );

          if (hasOldFields) {
            console.log('\n⚠️ Algunas columnas aún existen. Ejecuta los comandos SQL manualmente.');
          } else {
            console.log('\n🎉 ¡Todas las columnas no deseadas fueron eliminadas exitosamente!');
          }
        }
      } catch (error) {
        console.log('⚠️ Error verificando:', error.message);
      }
    }, 2000);

  } catch (error) {
    console.error('💥 Error durante el proceso:', error);
  }
}

// Ejecutar
removeColumnsDirectly();