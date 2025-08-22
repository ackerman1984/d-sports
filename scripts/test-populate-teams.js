#!/usr/bin/env node

/**
 * Script de prueba para poblar equipos usando el endpoint HTTP
 * No requiere autenticación específica ya que usa el endpoint interno
 */

const http = require('http');

async function testPopulateTeams() {
  console.log('🚀 Probando poblado de equipos vía HTTP...');
  
  // Esperar un poco para que el servidor esté listo
  await new Promise(resolve => setTimeout(resolve, 3000));
  
  const options = {
    hostname: 'localhost',
    port: 3000,
    path: '/api/admin/populate-teams',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
  };

  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        try {
          const response = JSON.parse(data);
          console.log(`✅ Respuesta HTTP ${res.statusCode}:`);
          console.log(JSON.stringify(response, null, 2));
          
          if (response.success) {
            console.log(`🎉 ¡Éxito! Se crearon ${response.totalEquiposCreados} equipos`);
            
            if (response.resumen && response.resumen.length > 0) {
              console.log('\n📊 Resumen por liga:');
              response.resumen.forEach(liga => {
                const status = liga.listaParaRegistro ? '✅' : '❌';
                console.log(`${status} ${liga.liga} (${liga.codigo}): ${liga.equiposActivos} equipos activos`);
              });
            }
          }
          
          resolve(response);
        } catch (error) {
          console.error('❌ Error parseando respuesta:', error.message);
          console.log('Respuesta cruda:', data);
          reject(error);
        }
      });
    });

    req.on('error', (error) => {
      console.error('❌ Error en la petición HTTP:', error.message);
      reject(error);
    });

    req.end();
  });
}

// Ejecutar el test
testPopulateTeams()
  .then(() => {
    console.log('✅ Test completado');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Test falló:', error.message);
    process.exit(1);
  });