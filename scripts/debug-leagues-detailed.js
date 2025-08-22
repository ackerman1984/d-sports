#!/usr/bin/env node

/**
 * Script de diagnóstico detallado para investigar diferencias entre ligas
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

async function debugLeaguesDetailed() {
  console.log('🔍 Diagnóstico detallado de ligas y equipos...\n');
  
  try {
    // Esperar que el servidor esté listo
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Obtener lista de ligas
    console.log('1️⃣ Obteniendo lista de ligas...');
    const ligasResponse = await makeRequest('/api/ligas');
    
    if (ligasResponse.status !== 200) {
      console.error('❌ Error obteniendo ligas:', ligasResponse.data);
      return;
    }

    const ligas = ligasResponse.data.ligas || [];
    console.log(`✅ Encontradas ${ligas.length} ligas\n`);

    // Debug cada liga individual
    for (const liga of ligas) {
      console.log(`🔍 DIAGNÓSTICO DETALLADO: ${liga.nombre}`);
      console.log(`═══════════════════════════════════════`);
      console.log(`   ID: ${liga.id}`);
      console.log(`   Código: ${liga.codigo}`);
      console.log(`   Subdominio: ${liga.subdominio}`);
      console.log(`   Activa: ${liga.activa ? '✅' : '❌'}`);
      
      // Probar endpoint de equipos
      console.log(`   📡 Probando: /api/public/equipos?ligaId=${liga.id}`);
      
      try {
        const equiposResponse = await makeRequest(`/api/public/equipos?ligaId=${liga.id}`);
        console.log(`   📊 Status: ${equiposResponse.status}`);
        
        if (equiposResponse.raw) {
          console.log(`   📝 Respuesta cruda: ${equiposResponse.data}`);
        } else {
          console.log(`   📝 Respuesta JSON:`, JSON.stringify(equiposResponse.data, null, 2));
          
          const equipos = equiposResponse.data.equipos || [];
          console.log(`   ⚾ Equipos encontrados: ${equipos.length}`);
          
          if (equipos.length > 0) {
            equipos.forEach((equipo, index) => {
              console.log(`      ${index + 1}. ${equipo.nombre} - ID: ${equipo.id} - Color: ${equipo.color} - Activo: ${equipo.activo ? '✅' : '❌'}`);
            });
            console.log(`   ✅ Liga FUNCIONA correctamente`);
          } else {
            console.log(`   ❌ Liga NO tiene equipos disponibles`);
            
            // Investigar más a fondo
            console.log(`   🔍 Investigando causa...`);
            
            if (equiposResponse.data.error) {
              console.log(`   🚨 Error reportado: ${equiposResponse.data.error}`);
            }
          }
        }
      } catch (error) {
        console.log(`   ❌ Error en petición: ${error.message}`);
      }
      
      console.log(''); // Línea en blanco
    }

    // Comparar olimpo con otras ligas
    console.log('🔍 ANÁLISIS COMPARATIVO');
    console.log('═══════════════════════');
    
    const olimpo = ligas.find(l => l.subdominio === 'olimpo' || l.nombre.toLowerCase().includes('olimpo'));
    if (olimpo) {
      console.log(`✅ Liga Olimpo encontrada: ${olimpo.nombre} (${olimpo.id})`);
      
      const otras = ligas.filter(l => l.id !== olimpo.id).slice(0, 3); // Tomar 3 otras ligas
      
      for (const otra of otras) {
        console.log(`\n🔄 Comparando ${olimpo.nombre} vs ${otra.nombre}:`);
        
        const [olimpoResp, otraResp] = await Promise.all([
          makeRequest(`/api/public/equipos?ligaId=${olimpo.id}`),
          makeRequest(`/api/public/equipos?ligaId=${otra.id}`)
        ]);
        
        console.log(`   Olimpo: Status ${olimpoResp.status} - Equipos: ${olimpoResp.data?.equipos?.length || 0}`);
        console.log(`   ${otra.nombre}: Status ${otraResp.status} - Equipos: ${otraResp.data?.equipos?.length || 0}`);
        
        if (olimpoResp.data && otraResp.data) {
          const olimpoEquipos = olimpoResp.data.equipos || [];
          const otrosEquipos = otraResp.data.equipos || [];
          
          if (olimpoEquipos.length > 0 && otrosEquipos.length === 0) {
            console.log(`   🚨 PROBLEMA DETECTADO: ${otra.nombre} no devuelve equipos`);
            console.log(`   📝 Respuesta completa:`, JSON.stringify(otraResp.data, null, 2));
          }
        }
      }
    }

  } catch (error) {
    console.error('❌ Error general:', error.message);
  }
}

// Ejecutar el diagnóstico
debugLeaguesDetailed();