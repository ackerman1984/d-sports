const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function debugPartidoAnotador() {
  console.log('🔍 Diagnosticando partido de prueba para anotador...\n');

  try {
    // 1. Verificar liga poli
    console.log('1️⃣ Verificando liga poli...');
    const { data: liga, error: ligaError } = await supabase
      .from('ligas')
      .select('id, nombre, codigo')
      .eq('codigo', 'POLI')
      .single();

    if (ligaError || !liga) {
      console.log('❌ Liga poli no encontrada:', ligaError?.message);
      return;
    }
    console.log(`✅ Liga encontrada: ${liga.nombre} (ID: ${liga.id})`);

    // 2. Verificar equipos
    console.log('\n2️⃣ Verificando equipos...');
    const { data: equipos, error: equiposError } = await supabase
      .from('equipos')
      .select('id, nombre')
      .eq('liga_id', liga.id);

    if (equiposError || !equipos || equipos.length === 0) {
      console.log('❌ No hay equipos en la liga:', equiposError?.message);
      return;
    }
    console.log(`✅ Equipos encontrados: ${equipos.map(e => e.nombre).join(', ')}`);

    // 3. Verificar temporadas
    console.log('\n3️⃣ Verificando temporadas...');
    const { data: temporadas, error: temporadasError } = await supabase
      .from('configuracion_temporada')
      .select('id, nombre, liga_id')
      .eq('liga_id', liga.id);

    if (temporadasError) {
      console.log('❌ Error consultando temporadas:', temporadasError.message);
      return;
    }

    if (!temporadas || temporadas.length === 0) {
      console.log('❌ No hay temporadas para la liga poli');
      console.log('\n📋 Crea una temporada con este SQL:');
      console.log(`
INSERT INTO configuracion_temporada (
  liga_id, nombre, fecha_inicio, fecha_fin, estado, auto_generar, max_juegos_por_sabado, vueltas_programadas
) VALUES (
  '${liga.id}', 'Temporada Prueba 2024', '2024-01-01', '2024-12-31', 'configuracion', false, 4, 1
);`);
      return;
    }

    console.log(`✅ Temporadas encontradas: ${temporadas.map(t => t.nombre).join(', ')}`);
    const temporadaIds = temporadas.map(t => t.id);

    // 4. Verificar jornadas
    console.log('\n4️⃣ Verificando jornadas...');
    const { data: jornadas, error: jornadasError } = await supabase
      .from('jornadas')
      .select('id, numero_jornada, temporada_id')
      .in('temporada_id', temporadaIds);

    if (jornadasError) {
      console.log('❌ Error consultando jornadas:', jornadasError.message);
      return;
    }

    if (!jornadas || jornadas.length === 0) {
      console.log('❌ No hay jornadas para las temporadas');
      console.log('\n📋 Crea una jornada con este SQL:');
      console.log(`
INSERT INTO jornadas (temporada_id, numero_jornada, fecha, es_playoff) 
VALUES ('${temporadaIds[0]}', 1, CURRENT_DATE, false);`);
      return;
    }

    console.log(`✅ Jornadas encontradas: ${jornadas.length}`);

    // 5. Verificar partidos en calendario
    console.log('\n5️⃣ Verificando partidos en calendario...');
    const { data: partidos, error: partidosError } = await supabase
      .from('partidos_calendario')
      .select(`
        id,
        fecha_programada,
        hora_programada,
        estado,
        equipo_local_id,
        equipo_visitante_id,
        temporada_id,
        jornada_id
      `)
      .in('temporada_id', temporadaIds);

    if (partidosError) {
      console.log('❌ Error consultando partidos:', partidosError.message);
      return;
    }

    if (!partidos || partidos.length === 0) {
      console.log('❌ No hay partidos en el calendario');
      console.log('\n📋 Crea un partido con este SQL:');
      console.log(`
INSERT INTO partidos_calendario (
  jornada_id, temporada_id, equipo_local_id, equipo_visitante_id,
  numero_partido, vuelta, estado, fecha_programada, hora_programada, es_bye
) VALUES (
  '${jornadas[0].id}', '${temporadaIds[0]}', '${equipos[0].id}', '${equipos[1].id}',
  1, 1, 'programado', CURRENT_DATE + 1, '14:00:00', false
);`);
      return;
    }

    console.log(`✅ Partidos encontrados: ${partidos.length}`);
    
    // Mostrar detalles de los partidos
    for (const partido of partidos) {
      const equipoLocal = equipos.find(e => e.id === partido.equipo_local_id);
      const equipoVisitante = equipos.find(e => e.id === partido.equipo_visitante_id);
      
      console.log(`   📅 ${partido.fecha_programada} ${partido.hora_programada}`);
      console.log(`   ⚾ ${equipoLocal?.nombre || 'Local'} vs ${equipoVisitante?.nombre || 'Visitante'}`);
      console.log(`   📊 Estado: ${partido.estado}`);
      console.log(`   🆔 ID: ${partido.id}`);
      
      // Verificar disponibilidad (2 días antes)
      const fechaPartido = new Date(`${partido.fecha_programada}T${partido.hora_programada || '00:00:00'}`);
      const ahora = new Date();
      const dosDiasEnMs = 2 * 24 * 60 * 60 * 1000;
      const tiempoHastaPartido = fechaPartido.getTime() - ahora.getTime();
      const estaDisponible = tiempoHastaPartido <= dosDiasEnMs;
      
      console.log(`   🔓 Disponible para anotar: ${estaDisponible ? 'SÍ' : 'NO'} (${Math.round(tiempoHastaPartido / (24 * 60 * 60 * 1000))} días)`);
      console.log('');
    }

    // 6. Verificar anotadores
    console.log('\n6️⃣ Verificando anotadores...');
    const { data: anotadores, error: anotadoresError } = await supabase
      .from('anotadores')
      .select('id, nombre, liga_id')
      .eq('liga_id', liga.id);

    if (anotadoresError) {
      console.log('❌ Error consultando anotadores:', anotadoresError.message);
    } else if (!anotadores || anotadores.length === 0) {
      console.log('❌ No hay anotadores para la liga poli');
    } else {
      console.log(`✅ Anotadores encontrados: ${anotadores.map(a => a.nombre).join(', ')}`);
    }

    // 7. Simular consulta API
    console.log('\n7️⃣ Simulando consulta de API del anotador...');
    if (anotadores && anotadores.length > 0) {
      const anotadorId = anotadores[0].id;
      
      // Simular lo que hace la API
      const { data: partidosAPI, error: apiError } = await supabase
        .from('partidos_calendario')
        .select(`
          id,
          fecha_programada,
          hora_programada,
          estado,
          marcador_local,
          marcador_visitante,
          equipo_local_id,
          equipo_visitante_id,
          campo_id,
          horario_id,
          temporada_id
        `)
        .in('temporada_id', temporadaIds)
        .not('es_bye', 'eq', true)
        .order('fecha_programada', { ascending: true });

      if (apiError) {
        console.log('❌ Error en consulta API:', apiError.message);
      } else {
        console.log(`✅ API devolvería ${partidosAPI?.length || 0} partidos`);
      }
    }

    console.log('\n🎯 Resultado del diagnóstico:');
    if (partidos && partidos.length > 0) {
      console.log('✅ Los partidos existen en la base de datos');
      console.log('✅ La consulta debería funcionar');
      console.log('🔍 Si no aparecen en la interfaz, revisa:');
      console.log('   - Que tengas una sesión de anotador activa');
      console.log('   - Los logs de la consola del navegador');
      console.log('   - La respuesta de /api/anotador/juegos-disponibles');
    } else {
      console.log('❌ No hay partidos creados');
      console.log('🔧 Usa los SQL mostrados arriba para crear los datos necesarios');
    }

  } catch (error) {
    console.error('💥 Error en diagnóstico:', error);
  }
}

debugPartidoAnotador();