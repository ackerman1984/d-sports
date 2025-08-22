const fetch = require('node-fetch');
require('dotenv').config({ path: '.env.local' });

const BASE_URL = 'http://localhost:3000';

async function createPartidoViaAPI() {
  console.log('🏟️ Creando partido de prueba via APIs del admin...\n');

  try {
    // 1. Crear temporada
    console.log('1️⃣ Creando temporada...');
    const temporadaData = {
      nombre: 'Temporada Prueba 2024',
      fechaInicio: '2024-01-01',
      fechaFin: '2024-12-31',
      vueltas: 1,
      maxJuegosSabado: 4
    };

    const temporadaResponse = await fetch(`${BASE_URL}/api/admin/temporadas`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Liga-ID': '424db42f-8d4a-4caf-9788-203513f133bb' // ID de liga poli
      },
      body: JSON.stringify(temporadaData)
    });

    const temporadaResult = await temporadaResponse.json();
    
    if (!temporadaResponse.ok) {
      console.log('❌ Error creando temporada:', temporadaResult);
      console.log('\n📋 Crea la temporada manualmente con este SQL:');
      console.log(`
INSERT INTO configuracion_temporada (
  liga_id, nombre, fecha_inicio, fecha_fin, estado, auto_generar, max_juegos_por_sabado, vueltas_programadas
) VALUES (
  '424db42f-8d4a-4caf-9788-203513f133bb', 
  'Temporada Prueba 2024', 
  '2024-01-01', 
  '2024-12-31', 
  'configuracion', 
  false, 
  4, 
  1
);`);
      return;
    }

    console.log('✅ Temporada creada:', temporadaResult);

    // 2. Obtener ID de temporada creada
    const temporadaId = temporadaResult.temporada?.id || temporadaResult.id;
    
    if (!temporadaId) {
      console.log('❌ No se pudo obtener ID de temporada');
      return;
    }

    // 3. Crear campos si no existen
    console.log('\n2️⃣ Verificando campos...');
    const campoData = {
      nombre: 'Campo Central',
      descripcion: 'Campo principal para partidos',
      activo: true,
      orden: 1
    };

    const campoResponse = await fetch(`${BASE_URL}/api/admin/campos`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Liga-ID': '424db42f-8d4a-4caf-9788-203513f133bb'
      },
      body: JSON.stringify(campoData)
    });

    if (campoResponse.ok) {
      console.log('✅ Campo creado');
    } else {
      console.log('⚠️ Campo ya existe o error creando campo');
    }

    // 4. Crear horarios si no existen
    console.log('\n3️⃣ Verificando horarios...');
    const horarioData = {
      nombre: 'Tarde',
      hora_inicio: '14:00',
      hora_fin: '17:00',
      activo_por_defecto: true,
      orden: 1,
      descripcion: 'Horario de tarde'
    };

    const horarioResponse = await fetch(`${BASE_URL}/api/admin/horarios`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Liga-ID': '424db42f-8d4a-4caf-9788-203513f133bb'
      },
      body: JSON.stringify(horarioData)
    });

    if (horarioResponse.ok) {
      console.log('✅ Horario creado');
    } else {
      console.log('⚠️ Horario ya existe o error creando horario');
    }

    // 5. Generar calendario para la temporada
    console.log('\n4️⃣ Generando calendario...');
    const calendarioResponse = await fetch(`${BASE_URL}/api/admin/generar-calendario/${temporadaId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Liga-ID': '424db42f-8d4a-4caf-9788-203513f133bb'
      }
    });

    const calendarioResult = await calendarioResponse.json();

    if (!calendarioResponse.ok) {
      console.log('❌ Error generando calendario:', calendarioResult);
      
      // Crear partido manualmente
      console.log('\n📋 Crea un partido manualmente con este SQL:');
      console.log(`
-- Primero crear jornada
INSERT INTO jornadas (temporada_id, numero_jornada, fecha, es_playoff) 
VALUES ('${temporadaId}', 1, CURRENT_DATE, false);

-- Luego crear partido
INSERT INTO partidos_calendario (
  jornada_id, 
  temporada_id, 
  equipo_local_id, 
  equipo_visitante_id,
  numero_partido, 
  vuelta, 
  estado, 
  fecha_programada, 
  hora_programada, 
  es_bye
) VALUES (
  (SELECT id FROM jornadas WHERE temporada_id = '${temporadaId}' LIMIT 1),
  '${temporadaId}',
  (SELECT id FROM equipos WHERE liga_id = '424db42f-8d4a-4caf-9788-203513f133bb' AND nombre = 'negro'),
  (SELECT id FROM equipos WHERE liga_id = '424db42f-8d4a-4caf-9788-203513f133bb' AND nombre = 'blanco'),
  1, 
  1, 
  'programado', 
  CURRENT_DATE + 1, 
  '14:00:00', 
  false
);`);
      return;
    }

    console.log('✅ Calendario generado exitosamente!');
    console.log('📊 Resultado:', calendarioResult);

    console.log('\n🎯 Partido de prueba creado!');
    console.log('Para probar:');
    console.log('1. Ve a: http://localhost:3000/anotador/dashboard');
    console.log('2. Los partidos deberían aparecer en "Juegos Disponibles"');
    console.log('3. Haz clic en "✋ Asignarme" para tomar un partido');
    console.log('4. Luego "▶️ Iniciar" para comenzar a anotar');

  } catch (error) {
    console.error('💥 Error:', error.message);
    console.log('\n📋 Como alternativa, ejecuta este SQL en Supabase:');
    console.log(`
-- 1. Crear temporada
INSERT INTO configuracion_temporada (
  liga_id, nombre, fecha_inicio, fecha_fin, estado, auto_generar, max_juegos_por_sabado, vueltas_programadas
) VALUES (
  '424db42f-8d4a-4caf-9788-203513f133bb', 
  'Temporada Prueba 2024', 
  '2024-01-01', 
  '2024-12-31', 
  'configuracion', 
  false, 
  4, 
  1
);

-- 2. Crear jornada
INSERT INTO jornadas (temporada_id, numero_jornada, fecha, es_playoff) 
VALUES (
  (SELECT id FROM configuracion_temporada WHERE liga_id = '424db42f-8d4a-4caf-9788-203513f133bb'),
  1, CURRENT_DATE, false
);

-- 3. Crear partido
INSERT INTO partidos_calendario (
  jornada_id, temporada_id, equipo_local_id, equipo_visitante_id,
  numero_partido, vuelta, estado, fecha_programada, hora_programada, es_bye
) VALUES (
  (SELECT j.id FROM jornadas j JOIN configuracion_temporada t ON j.temporada_id = t.id WHERE t.liga_id = '424db42f-8d4a-4caf-9788-203513f133bb'),
  (SELECT id FROM configuracion_temporada WHERE liga_id = '424db42f-8d4a-4caf-9788-203513f133bb'),
  (SELECT id FROM equipos WHERE liga_id = '424db42f-8d4a-4caf-9788-203513f133bb' AND nombre = 'negro'),
  (SELECT id FROM equipos WHERE liga_id = '424db42f-8d4a-4caf-9788-203513f133bb' AND nombre = 'blanco'),
  1, 1, 'programado', CURRENT_DATE + 1, '14:00:00', false
);
    `);
  }
}

createPartidoViaAPI();