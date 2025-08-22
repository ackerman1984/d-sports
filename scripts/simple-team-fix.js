#!/usr/bin/env node

/**
 * Script simple para crear equipos usando insert básico
 */

const { createClient } = require('@supabase/supabase-js');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Error: Missing Supabase environment variables');
  process.exit(1);
}

console.log('🔑 Usando clave:', supabaseKey ? `${supabaseKey.slice(0, 20)}...` : 'NO ENCONTRADA');
console.log('📡 URL:', supabaseUrl);

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function crearEquiposSimple() {
  console.log('🚀 CREANDO EQUIPOS - ENFOQUE SIMPLE');
  console.log('═'.repeat(50));
  
  try {
    // Obtener todas las ligas
    const { data: ligas } = await supabase
      .from('ligas')
      .select('*')
      .order('nombre');

    console.log(`✅ Encontradas ${ligas.length} ligas`);

    for (const liga of ligas) {
      console.log(`\n🔍 Procesando: ${liga.nombre}`);
      
      // Verificar si ya tiene equipos
      const { data: equiposExistentes } = await supabase
        .from('equipos')
        .select('id, nombre')
        .eq('liga_id', liga.id);

      if (equiposExistentes && equiposExistentes.length > 0) {
        console.log(`   ✅ Ya tiene ${equiposExistentes.length} equipos`);
        continue;
      }

      // Crear equipos únicos para esta liga
      const timestamp = Date.now();
      const equiposACrear = [
        {
          nombre: `Equipo A ${liga.codigo}`,
          color: '#FF0000',
          liga_id: liga.id,
          activo: true
        },
        {
          nombre: `Equipo B ${liga.codigo}`,
          color: '#0000FF',
          liga_id: liga.id,
          activo: true
        },
        {
          nombre: `Equipo C ${liga.codigo}`,
          color: '#00FF00',
          liga_id: liga.id,
          activo: true
        }
      ];

      console.log(`   🎯 Creando ${equiposACrear.length} equipos...`);

      const { data: equiposCreados, error } = await supabase
        .from('equipos')
        .insert(equiposACrear)
        .select();

      if (error) {
        console.error(`   ❌ Error:`, error);
      } else {
        console.log(`   ✅ ${equiposCreados.length} equipos creados`);
        equiposCreados.forEach(equipo => {
          console.log(`      - ${equipo.nombre}`);
        });
      }
    }

    // Verificación final
    console.log('\n📊 VERIFICACIÓN FINAL');
    
    for (const liga of ligas) {
      const { data: equipos } = await supabase
        .from('equipos')
        .select('id, nombre')
        .eq('liga_id', liga.id)
        .eq('activo', true);

      const count = equipos?.length || 0;
      const status = count >= 2 ? '✅' : '❌';
      console.log(`${status} ${liga.nombre}: ${count} equipos`);
    }

  } catch (error) {
    console.error('❌ Error general:', error);
  }
}

// Ejecutar
crearEquiposSimple();