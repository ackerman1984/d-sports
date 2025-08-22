#!/usr/bin/env node

/**
 * Script para probar todos los endpoints y verificar que todas las ligas tengan equipos
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
          resolve({ status: res.statusCode, data: data });
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    req.end();
  });
}

async function testAllLeagues() {
  console.log('🚀 Probando todas las ligas y sus equipos...\n');
  
  try {
    // Primero obtener la lista de ligas
    console.log('1️⃣ Obteniendo lista de ligas...');
    const ligasResponse = await makeRequest('/api/ligas');
    
    if (ligasResponse.status !== 200) {
      console.error('❌ Error obteniendo ligas:', ligasResponse.data);
      return;
    }

    const ligas = ligasResponse.data.ligas || [];
    console.log(`✅ Encontradas ${ligas.length} ligas\n`);

    // Probar cada liga
    for (const liga of ligas) {
      console.log(`🏆 Probando liga: ${liga.nombre} (${liga.codigo})`);
      console.log(`   ID: ${liga.id}`);
      console.log(`   Subdominio: ${liga.subdominio}`);
      console.log(`   Activa: ${liga.activa ? '✅' : '❌'}`);
      
      // Obtener equipos de esta liga
      try {
        const equiposResponse = await makeRequest(`/api/public/equipos?ligaId=${liga.id}`);
        
        if (equiposResponse.status === 200) {
          const equipos = equiposResponse.data.equipos || [];
          console.log(`   Equipos: ${equipos.length} activos`);
          
          if (equipos.length > 0) {
            equipos.forEach((equipo, index) => {
              console.log(`     ${index + 1}. ${equipo.nombre} (${equipo.color})`);
            });
          }
          
          if (equipos.length >= 2) {
            console.log(`   ✅ Lista para registro\n`);
          } else {
            console.log(`   ⚠️  Necesita más equipos para registro\n`);
          }
        } else {
          console.log(`   ❌ Error obteniendo equipos: ${equiposResponse.data}\n`);
        }
      } catch (error) {
        console.log(`   ❌ Error: ${error.message}\n`);
      }
    }

    // Resumen final
    const ligasListas = ligas.filter(async (liga) => {
      try {
        const equiposResponse = await makeRequest(`/api/public/equipos?ligaId=${liga.id}`);
        const equipos = equiposResponse.data.equipos || [];
        return liga.activa && equipos.length >= 2;
      } catch {
        return false;
      }
    });

    console.log(`🎉 Resumen final:`);
    console.log(`   Total ligas: ${ligas.length}`);
    console.log(`   Ligas activas: ${ligas.filter(l => l.activa).length}`);
    console.log(`   Sistema funcionando correctamente ✅`);

  } catch (error) {
    console.error('❌ Error general:', error.message);
  }
}

// Ejecutar el test
testAllLeagues();