#!/usr/bin/env node

/**
 * Script definitivo para asegurar que todas las ligas tengan equipos
 * Este script ejecuta múltiples estrategias para garantizar el funcionamiento
 */

const { createClient } = require('@supabase/supabase-js');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Error: Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Definición de equipos para cada tipo de liga
const equiposPorTipo = {
  'OLIMPO': [
    { nombre: 'Dioses del Olimpo', color: '#FFD700' },
    { nombre: 'Titanes Azules', color: '#0066CC' },
    { nombre: 'Héroes Carmesí', color: '#DC143C' },
    { nombre: 'Guerreros Verdes', color: '#228B22' }
  ],
  'LMB2024': [
    { nombre: 'Águilas Doradas', color: '#FFD700' },
    { nombre: 'Tigres Azules', color: '#0066CC' },
    { nombre: 'Leones Rojos', color: '#CC0000' },
    { nombre: 'Panteras Verdes', color: '#00AA00' }
  ],
  'LJB2024': [
    { nombre: 'Estrellas del Norte', color: '#4B0082' },
    { nombre: 'Rayos del Sur', color: '#FF6600' },
    { nombre: 'Huracanes del Este', color: '#008080' },
    { nombre: 'Tornados del Oeste', color: '#800080' }
  ],
  'LPR2024': [
    { nombre: 'Conquistadores', color: '#B8860B' },
    { nombre: 'Gladiadores', color: '#8B0000' },
    { nombre: 'Spartanos', color: '#2F4F4F' }
  ],
  'DEMO2025': [
    { nombre: 'Demonios Rojos', color: '#DC143C' },
    { nombre: 'Ángeles Blancos', color: '#F8F8FF' },
    { nombre: 'Dragones Verdes', color: '#228B22' },
    { nombre: 'Fénix Dorados', color: '#FFD700' }
  ],
  'GENERIC': [
    { nombre: 'Rayos Dorados', color: '#FFD700' },
    { nombre: 'Águilas Azules', color: '#1E90FF' },
    { nombre: 'Tigres Rojos', color: '#DC143C' },
    { nombre: 'Panteras Verdes', color: '#228B22' }
  ]
};

async function ejecutarSolucionDefinitiva() {
  console.log('🚀 INICIANDO SOLUCIÓN DEFINITIVA DE EQUIPOS');
  console.log('═'.repeat(60));
  
  try {
    // PASO 1: Obtener todas las ligas
    console.log('\n1️⃣ OBTENIENDO TODAS LAS LIGAS');
    const { data: ligas, error: ligasError } = await supabase
      .from('ligas')
      .select('*')
      .order('nombre');

    if (ligasError) {
      console.error('❌ Error obteniendo ligas:', ligasError);
      return;
    }

    console.log(`✅ Encontradas ${ligas.length} ligas`);
    ligas.forEach(liga => {
      console.log(`   📋 ${liga.nombre} (${liga.codigo}) - ID: ${liga.id.slice(0, 8)}...`);
    });

    // PASO 2: Para cada liga, verificar y crear equipos
    console.log('\n2️⃣ VERIFICANDO Y CREANDO EQUIPOS PARA CADA LIGA');
    console.log('─'.repeat(60));

    let totalEquiposCreados = 0;

    for (const liga of ligas) {
      console.log(`\n🔍 Procesando: ${liga.nombre}`);
      
      // Verificar equipos existentes
      const { data: equiposExistentes } = await supabase
        .from('equipos')
        .select('*')
        .eq('liga_id', liga.id)
        .eq('activo', true);

      console.log(`   📊 Equipos actuales: ${equiposExistentes?.length || 0}`);

      if (equiposExistentes && equiposExistentes.length >= 2) {
        console.log(`   ✅ Liga ya tiene suficientes equipos`);
        continue;
      }

      // Determinar qué equipos crear
      let equiposACrear = [];
      
      if (equiposPorTipo[liga.codigo]) {
        equiposACrear = equiposPorTipo[liga.codigo];
      } else if (liga.nombre.toLowerCase().includes('olimpo') || liga.codigo.includes('OLIMPO')) {
        equiposACrear = equiposPorTipo['OLIMPO'];
      } else if (liga.codigo.includes('LMB')) {
        equiposACrear = equiposPorTipo['LMB2024'];
      } else if (liga.codigo.includes('LJB')) {
        equiposACrear = equiposPorTipo['LJB2024'];
      } else if (liga.codigo.includes('LPR')) {
        equiposACrear = equiposPorTipo['LPR2024'];
      } else if (liga.codigo.includes('DEMO')) {
        equiposACrear = equiposPorTipo['DEMO2025'];
      } else {
        equiposACrear = equiposPorTipo['GENERIC'];
      }

      console.log(`   🎯 Creando ${equiposACrear.length} equipos...`);

      // Crear equipos
      const equiposParaInsertar = equiposACrear.map(equipo => ({
        nombre: equipo.nombre,
        color: equipo.color,
        liga_id: liga.id,
        activo: true,
        created_at: new Date().toISOString()
      }));

      const { data: equiposCreados, error: equiposError } = await supabase
        .from('equipos')
        .upsert(equiposParaInsertar, { 
          onConflict: 'liga_id,nombre',
          ignoreDuplicates: false 
        })
        .select();

      if (equiposError) {
        console.error(`   ❌ Error creando equipos:`, equiposError);
        continue;
      }

      console.log(`   ✅ ${equiposCreados?.length || 0} equipos creados/actualizados`);
      totalEquiposCreados += equiposCreados?.length || 0;

      // Mostrar equipos creados
      if (equiposCreados && equiposCreados.length > 0) {
        equiposCreados.forEach((equipo, index) => {
          console.log(`      ${index + 1}. ${equipo.nombre} (${equipo.color})`);
        });
      }
    }

    // PASO 3: Verificación final
    console.log('\n3️⃣ VERIFICACIÓN FINAL');
    console.log('─'.repeat(40));

    const { data: verificacion } = await supabase
      .from('ligas')
      .select(`
        id,
        nombre,
        codigo,
        activa,
        equipos!inner(id, nombre, activo)
      `);

    let ligasListas = 0;
    const resumen = [];

    if (verificacion) {
      for (const liga of verificacion) {
        const equiposActivos = liga.equipos?.filter(eq => eq.activo).length || 0;
        const estaLista = liga.activa && equiposActivos >= 2;
        
        resumen.push({
          nombre: liga.nombre,
          codigo: liga.codigo,
          equiposActivos,
          estaLista
        });

        if (estaLista) ligasListas++;
      }
    }

    console.log(`\n📊 RESUMEN FINAL:`);
    console.log(`   Total ligas: ${ligas.length}`);
    console.log(`   Ligas listas para registro: ${ligasListas}`);
    console.log(`   Equipos creados en esta ejecución: ${totalEquiposCreados}`);

    console.log(`\n📋 DETALLE POR LIGA:`);
    resumen.forEach(liga => {
      const status = liga.estaLista ? '✅' : '❌';
      console.log(`   ${status} ${liga.nombre} (${liga.codigo}): ${liga.equiposActivos} equipos`);
    });

    if (ligasListas === ligas.length) {
      console.log('\n🎉 ¡ÉXITO! Todas las ligas están listas para registro');
      console.log('💡 Puedes probar ahora en http://localhost:3000/registro');
    } else {
      console.log('\n⚠️  Algunas ligas aún tienen problemas');
      console.log('💡 Revisa los logs arriba para más detalles');
    }

  } catch (error) {
    console.error('❌ Error general:', error);
  }
}

// Ejecutar la solución
console.log('Esperando 2 segundos para asegurar conexión...');
setTimeout(() => {
  ejecutarSolucionDefinitiva();
}, 2000);