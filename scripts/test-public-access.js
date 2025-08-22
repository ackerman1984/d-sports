#!/usr/bin/env node

/**
 * Test rápido para verificar acceso público a equipos
 */

const http = require('http');

function testPublicAccess(ligaId, ligaNombre) {
  return new Promise((resolve) => {
    const options = {
      hostname: 'localhost',
      port: 3000,
      path: `/api/public/equipos?ligaId=${ligaId}`,
      method: 'GET',
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
          resolve({
            liga: ligaNombre,
            status: res.statusCode,
            equipos: response.equipos?.length || 0,
            success: res.statusCode === 200 && response.equipos?.length > 0
          });
        } catch (error) {
          resolve({
            liga: ligaNombre,
            status: res.statusCode,
            equipos: 0,
            success: false,
            error: 'JSON parse error'
          });
        }
      });
    });

    req.on('error', () => {
      resolve({
        liga: ligaNombre,
        status: 0,
        equipos: 0,
        success: false,
        error: 'Connection error'
      });
    });

    req.end();
  });
}

async function runTests() {
  console.log('🧪 TEST DE ACCESO PÚBLICO A EQUIPOS');
  console.log('═'.repeat(50));

  // Esperar que el servidor esté listo
  await new Promise(resolve => setTimeout(resolve, 3000));

  // IDs de ligas conocidas
  const ligasParaProbar = [
    { id: '6bcd8e74-d437-4d0f-b716-509a8e724234', nombre: 'olimpo' },
    { id: '2e29ea46-8cab-4727-94c5-60891e650995', nombre: 'infierno' },
    { id: '6b287546-2edb-4c42-9ba2-0cb831e8dbda', nombre: 'municipal' },
    { id: 'c99380a8-7663-4fbc-abc5-e4f028dabdff', nombre: 'juvenil' },
    { id: '1e3dba11-40c8-437d-9aeb-bd3143a62c66', nombre: 'pastel verde' }
  ];

  console.log('🔍 Probando acceso a equipos...\n');

  const resultados = [];
  for (const liga of ligasParaProbar) {
    const resultado = await testPublicAccess(liga.id, liga.nombre);
    resultados.push(resultado);
    
    const status = resultado.success ? '✅' : '❌';
    console.log(`${status} ${resultado.liga}: ${resultado.equipos} equipos (HTTP ${resultado.status})`);
    
    if (resultado.error) {
      console.log(`   Error: ${resultado.error}`);
    }
  }

  console.log('\n📊 RESUMEN:');
  const exitosos = resultados.filter(r => r.success).length;
  const total = resultados.length;
  
  console.log(`Exitosos: ${exitosos}/${total}`);
  
  if (exitosos === total) {
    console.log('🎉 ¡TODOS LOS TESTS PASARON!');
    console.log('💡 El acceso público está funcionando correctamente');
  } else {
    console.log('⚠️  Algunos tests fallaron');
    console.log('💡 Necesitas aplicar la migración RLS manualmente en Supabase');
  }
}

runTests();