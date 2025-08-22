const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function createSimpleTestGame() {
  console.log('🏟️ Creando partido de prueba para anotador...\n');

  try {
    // 1. Obtener datos básicos
    const { data: liga } = await supabase
      .from('ligas')
      .select('id, nombre')
      .eq('codigo', 'POLI')
      .single();

    if (!liga) {
      console.error('❌ Liga POLI no encontrada');
      return;
    }

    const { data: equipos } = await supabase
      .from('equipos')
      .select('id, nombre')
      .eq('liga_id', liga.id)
      .limit(2);

    if (!equipos || equipos.length < 2) {
      console.error('❌ No hay suficientes equipos en la liga POLI');
      return;
    }

    console.log('✅ Datos encontrados:');
    console.log(`   - Liga: ${liga.nombre}`);
    console.log(`   - Equipos: ${equipos[0].nombre} vs ${equipos[1].nombre}`);

    // 2. Buscar o crear temporada
    let { data: temporada } = await supabase
      .from('configuracion_temporada')
      .select('id, nombre')
      .eq('liga_id', liga.id)
      .single();

    if (!temporada) {
      console.log('📅 Creando temporada de prueba...');
      const { data: nuevaTemporada, error: tempError } = await supabase
        .from('configuracion_temporada')
        .insert({
          liga_id: liga.id,
          nombre: 'Temporada Prueba 2024',
          fecha_inicio: '2024-01-01',
          fecha_fin: '2024-12-31',
          estado: 'configuracion',
          auto_generar: false,
          max_juegos_por_sabado: 4,
          vueltas_programadas: 1
        })
        .select()
        .single();

      if (tempError) {
        console.error('❌ Error creando temporada:', tempError);
        return;
      }
      temporada = nuevaTemporada;
      console.log('✅ Temporada creada:', temporada.nombre);
    }

    // 3. Buscar o crear jornada
    let { data: jornada } = await supabase
      .from('jornadas')
      .select('id')
      .eq('temporada_id', temporada.id)
      .single();

    if (!jornada) {
      console.log('📋 Creando jornada de prueba...');
      const { data: nuevaJornada, error: jornadaError } = await supabase
        .from('jornadas')
        .insert({
          temporada_id: temporada.id,
          numero_jornada: 1,
          fecha: new Date().toISOString().split('T')[0],
          es_playoff: false
        })
        .select()
        .single();

      if (jornadaError) {
        console.error('❌ Error creando jornada:', jornadaError);
        return;
      }
      jornada = nuevaJornada;
      console.log('✅ Jornada creada');
    }

    // 4. Crear partido disponible para anotar (mañana)
    const fechaPartido = new Date();
    fechaPartido.setDate(fechaPartido.getDate() + 1); // Mañana
    const fechaStr = fechaPartido.toISOString().split('T')[0];
    const horaStr = '14:00:00';

    console.log('⚾ Creando partido en calendario...');

    const partidoData = {
      jornada_id: jornada.id,
      temporada_id: temporada.id,
      equipo_local_id: equipos[0].id,
      equipo_visitante_id: equipos[1].id,
      numero_partido: 1,
      vuelta: 1,
      estado: 'programado',
      fecha_programada: fechaStr,
      hora_programada: horaStr,
      es_bye: false
    };

    const { data: partido, error: partidoError } = await supabase
      .from('partidos_calendario')
      .insert(partidoData)
      .select('id')
      .single();

    if (partidoError) {
      console.error('❌ Error creando partido:', partidoError);
      
      // Mostrar SQL manual como fallback
      console.log('\n📋 Ejecuta este SQL manualmente en Supabase:');
      console.log(`
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
  '${jornada.id}',
  '${temporada.id}',
  '${equipos[0].id}',
  '${equipos[1].id}',
  1,
  1,
  'programado',
  '${fechaStr}',
  '${horaStr}',
  false
);
      `);
      return;
    }

    console.log(`✅ Partido creado con ID: ${partido.id}`);
    console.log(`📅 Fecha: ${fechaStr} a las ${horaStr}`);
    console.log(`⚾ ${equipos[0].nombre} vs ${equipos[1].nombre}`);
    console.log('🔓 Disponible para anotadores (dentro del plazo de 2 días)');

    console.log('\n🎯 Para probar el anotador:');
    console.log('1. Ve a: http://localhost:3000/anotador/dashboard');
    console.log('2. O usa: http://localhost:3000/login y selecciona "📝 Anotador"');
    console.log('3. El partido debería aparecer en "Juegos Disponibles"');
    console.log('4. Haz clic en "✋ Asignarme" para tomar el partido');
    console.log('5. Luego "▶️ Iniciar" para comenzar a anotar');

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('Detalles:', error);
  }
}

createSimpleTestGame();