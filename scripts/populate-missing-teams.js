#!/usr/bin/env node

/**
 * Script para poblar equipos automáticamente para todas las ligas que no tengan equipos
 * Ejecuta el endpoint /api/admin/populate-teams
 */

const https = require('https');
const http = require('http');

async function populateTeams() {
  console.log('🚀 Iniciando poblado de equipos para ligas sin equipos...');
  
  // Configurar el endpoint
  const hostname = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const endpoint = '/api/admin/populate-teams';
  
  const url = `${hostname}${endpoint}`;
  console.log(`📡 Llamando a: ${url}`);

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    
    console.log('✅ Respuesta recibida:');
    console.log(JSON.stringify(data, null, 2));
    
    if (data.success) {
      console.log(`🎉 ¡Éxito! Se crearon ${data.totalEquiposCreados} equipos para ${data.ligasProcesadas} ligas`);
      
      if (data.resumen && data.resumen.length > 0) {
        console.log('\n📊 Resumen por liga:');
        data.resumen.forEach(liga => {
          const status = liga.listaParaRegistro ? '✅' : '❌';
          console.log(`${status} ${liga.liga} (${liga.codigo}): ${liga.equiposActivos} equipos activos`);
        });
      }
    } else {
      console.log('❌ El proceso no fue exitoso:', data.message);
    }

  } catch (error) {
    console.error('❌ Error ejecutando el script:', error.message);
    process.exit(1);
  }
}

// Ejecutar el script
populateTeams();