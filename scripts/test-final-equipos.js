#!/usr/bin/env node

/**
 * Test final para verificar que los equipos son visibles públicamente
 */

const { createClient } = require('@supabase/supabase-js');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabasePublic = createClient(supabaseUrl, supabaseAnonKey);

async function testFinalEquipos() {
  console.log('🧪 TEST FINAL - EQUIPOS PÚBLICOS');
  console.log('═'.repeat(40));
  
  try {
    // Test 1: Acceso directo a tabla equipos
    console.log('1️⃣ Probando acceso directo a tabla equipos...');
    const { data: equiposDirectos, error: errorDirecto } = await supabasePublic
      .from('equipos')
      .select('*')
      .eq('activo', true)
      .limit(5);

    if (errorDirecto) {
      console.error('❌ Error acceso directo:', errorDirecto.message);
    } else {
      console.log(`✅ Acceso directo exitoso: ${equiposDirectos.length} equipos`);
    }

    // Test 2: Acceso por liga específica
    console.log('\n2️⃣ Probando acceso por liga específica...');
    const ligaOlimpo = '6bcd8e74-d437-4d0f-b716-509a8e724234';
    
    const { data: equiposOlimpo, error: errorOlimpo } = await supabasePublic
      .from('equipos')
      .select('*')
      .eq('liga_id', ligaOlimpo)
      .eq('activo', true);

    if (errorOlimpo) {
      console.error('❌ Error liga específica:', errorOlimpo.message);
    } else {
      console.log(`✅ Liga específica exitosa: ${equiposOlimpo.length} equipos`);
      equiposOlimpo.forEach(equipo => {
        console.log(`   - ${equipo.nombre} (${equipo.color})`);
      });
    }

    // Test 3: Simulación de endpoint público
    console.log('\n3️⃣ Simulando endpoint público...');
    const ligasParaProbar = [
      '6bcd8e74-d437-4d0f-b716-509a8e724234', // olimpo
      '2e29ea46-8cab-4727-94c5-60891e650995', // infierno
      '6b287546-2edb-4c42-9ba2-0cb831e8dbda'  // municipal
    ];

    for (const ligaId of ligasParaProbar) {
      const { data: equipos, error } = await supabasePublic
        .from('equipos')
        .select('id, nombre, color, activo')
        .eq('liga_id', ligaId)
        .eq('activo', true);

      if (error) {
        console.log(`❌ Liga ${ligaId.slice(0, 8)}...: Error - ${error.message}`);
      } else {
        console.log(`✅ Liga ${ligaId.slice(0, 8)}...: ${equipos.length} equipos`);
      }
    }

    // Resultado final
    if (!errorDirecto && equiposDirectos.length > 0) {
      console.log('\n🎉 ¡ÉXITO! El acceso público a equipos está funcionando');
      console.log('💡 Ahora puedes probar en el navegador');
    } else {
      console.log('\n❌ Aún hay problemas con el acceso público');
      console.log('💡 Necesitas aplicar la migración SQL manualmente');
    }

  } catch (error) {
    console.error('❌ Error general:', error);
  }
}

testFinalEquipos();