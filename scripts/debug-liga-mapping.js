#!/usr/bin/env node

/**
 * Script para diagnosticar el mapeo entre ligas y equipos
 */

const http = require('http');

function makeRequest(path, method = 'GET') {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 3000,
      path: path,
      method: method,
      headers: {
        'Content-Type': 'application/json',
      },
    };

    const req = http.request(options, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        try {
          const response = JSON.parse(data);
          resolve({ status: res.statusCode, data: response });
        } catch (error) {
          resolve({ status: res.statusCode, data: data, raw: true });
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    req.end();
  });
}

async function debugLigaMapping() {
  console.log('🔍 DIAGNÓSTICO DE MAPEO LIGA-EQUIPOS');
  console.log('════════════════════════════════════');
  
  try {
    // Esperar que el servidor esté listo
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // 1. Obtener ligas desde el frontend
    console.log('\n1️⃣ LIGAS DESDE FRONTEND (/api/ligas)');
    const ligasResponse = await makeRequest('/api/ligas');
    
    if (ligasResponse.status !== 200) {
      console.error('❌ Error obteniendo ligas:', ligasResponse.data);
      return;
    }

    const ligasDelFrontend = ligasResponse.data.ligas || [];
    console.log(`✅ Encontradas ${ligasDelFrontend.length} ligas en frontend:`);
    
    ligasDelFrontend.forEach(liga => {
      console.log(`   📋 ${liga.nombre} (${liga.codigo})`);
      console.log(`      ID: ${liga.id}`);
      console.log(`      Subdominio: ${liga.subdominio}`);
      console.log(`      Activa: ${liga.activa}`);
    });

    // 2. Para cada liga del frontend, probar si tiene equipos
    console.log('\n2️⃣ PROBANDO EQUIPOS PARA CADA LIGA DEL FRONTEND');
    console.log('─'.repeat(60));
    
    const resultados = [];
    
    for (const liga of ligasDelFrontend) {
      console.log(`\n🔍 Probando: ${liga.nombre}`);
      console.log(`   URL: /api/public/equipos?ligaId=${liga.id}`);
      
      try {
        const equiposResponse = await makeRequest(`/api/public/equipos?ligaId=${liga.id}`);
        const equipos = equiposResponse.data?.equipos || [];
        
        console.log(`   📊 Status: ${equiposResponse.status}`);
        console.log(`   ⚾ Equipos: ${equipos.length}`);
        
        if (equipos.length > 0) {
          console.log(`   ✅ FUNCIONA - Equipos encontrados:`);
          equipos.forEach(eq => console.log(`      - ${eq.nombre} (${eq.id})`));
        } else {
          console.log(`   ❌ NO FUNCIONA - Sin equipos`);
          if (equiposResponse.data?.error) {
            console.log(`   🚨 Error: ${equiposResponse.data.error}`);
          }
        }
        
        resultados.push({
          liga: liga.nombre,
          ligaId: liga.id,
          codigo: liga.codigo,
          equipos: equipos.length,
          funciona: equipos.length > 0
        });
        
      } catch (error) {
        console.log(`   ❌ ERROR: ${error.message}`);
        resultados.push({
          liga: liga.nombre,
          ligaId: liga.id,
          codigo: liga.codigo,
          equipos: 0,
          funciona: false,
          error: error.message
        });
      }
    }

    // 3. Resumen de problemas
    console.log('\n3️⃣ RESUMEN DE DIAGNÓSTICO');
    console.log('═'.repeat(40));
    
    const funcionan = resultados.filter(r => r.funciona);
    const noFuncionan = resultados.filter(r => !r.funciona);
    
    console.log(`✅ Ligas que funcionan: ${funcionan.length}`);
    funcionan.forEach(r => {
      console.log(`   - ${r.liga} (${r.codigo}): ${r.equipos} equipos`);
    });
    
    console.log(`\n❌ Ligas que NO funcionan: ${noFuncionan.length}`);
    noFuncionan.forEach(r => {
      console.log(`   - ${r.liga} (${r.codigo}): ID ${r.ligaId.slice(0, 8)}...`);
    });

    // 4. Análisis específico de IDs
    console.log('\n4️⃣ ANÁLISIS DE IDs PROBLEMÁTICOS');
    console.log('─'.repeat(40));
    
    // Los IDs que sabemos que funcionan del diagnóstico anterior
    const idsQueFuncionan = [
      '6bcd8e74-d437-4d0f-b716-509a8e724234', // olimpo
      '2e29ea46-8cab-4727-94c5-60891e650995', // infierno  
      '6b287546-2edb-4c42-9ba2-0cb831e8dbda', // municipal
      'c99380a8-7663-4fbc-abc5-e4f028dabdff', // juvenil
    ];
    
    console.log('🔍 IDs que sabemos que funcionan:');
    for (const idFuncional of idsQueFuncionan) {
      console.log(`   Testing ID: ${idFuncional}`);
      try {
        const testResponse = await makeRequest(`/api/public/equipos?ligaId=${idFuncional}`);
        const testEquipos = testResponse.data?.equipos || [];
        console.log(`   ✅ ${testEquipos.length} equipos encontrados`);
        if (testEquipos.length > 0) {
          console.log(`      Liga: ${testEquipos[0]?.liga || 'N/A'}`);
        }
      } catch (error) {
        console.log(`   ❌ Error: ${error.message}`);
      }
    }

    // 5. Recomendaciones
    console.log('\n5️⃣ RECOMENDACIONES PARA ARREGLAR');
    console.log('═'.repeat(40));
    
    if (noFuncionan.length > 0) {
      console.log('🔧 Problemas detectados:');
      console.log('   - Hay ligas en /api/ligas que no tienen equipos asociados');
      console.log('   - Los IDs de ligas del frontend no coinciden con los equipos');
      console.log('');
      console.log('💡 Posibles soluciones:');
      console.log('   1. Ejecutar script de poblado de equipos para ligas sin equipos');
      console.log('   2. Limpiar datos duplicados en tabla ligas');
      console.log('   3. Reasignar equipos huérfanos a las ligas correctas');
    }

  } catch (error) {
    console.error('❌ Error general:', error.message);
  }
}

// Ejecutar el diagnóstico
debugLigaMapping();