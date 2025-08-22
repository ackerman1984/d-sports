const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function debugPartidosLiga() {
  console.log('🔍 Verificando partidos para liga politecnica...\n');

  try {
    // 1. Buscar liga politecnica
    console.log('1️⃣ Buscando liga politecnica...');
    const { data: liga, error: ligaError } = await supabase
      .from('ligas')
      .select('id, nombre, codigo')
      .ilike('codigo', '%LIGAPOLITE%');

    if (ligaError) {
      console.log('❌ Error buscando liga:', ligaError.message);
      return;
    }

    if (!liga || liga.length === 0) {
      console.log('❌ No se encontró liga politecnica');
      
      // Buscar todas las ligas
      const { data: todasLigas } = await supabase
        .from('ligas')
        .select('id, nombre, codigo');
      
      console.log('🔍 Ligas disponibles:');
      todasLigas?.forEach(l => {
        console.log(`   - ${l.nombre} (${l.codigo})`);
      });
      return;
    }

    const ligaPoli = liga[0];
    console.log(`✅ Liga encontrada: ${ligaPoli.nombre} (${ligaPoli.codigo})`);

    // 2. Verificar temporadas
    console.log('\n2️⃣ Verificando temporadas...');
    const { data: temporadas, error: tempError } = await supabase
      .from('configuracion_temporada')
      .select('id, nombre, estado, liga_id')
      .eq('liga_id', ligaPoli.id);

    if (tempError) {
      console.log('❌ Error buscando temporadas:', tempError.message);
      return;
    }

    if (!temporadas || temporadas.length === 0) {
      console.log('❌ No hay temporadas para esta liga');
      return;
    }

    console.log(`✅ Temporadas encontradas: ${temporadas.length}`);
    temporadas.forEach(t => {
      console.log(`   - ${t.nombre} (${t.estado})`);
    });

    const temporadaIds = temporadas.map(t => t.id);

    // 3. Verificar partidos en calendario
    console.log('\n3️⃣ Verificando partidos en calendario...');
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
        es_bye
      `)
      .in('temporada_id', temporadaIds)
      .order('fecha_programada', { ascending: true });

    if (partidosError) {
      console.log('❌ Error buscando partidos:', partidosError.message);
      return;
    }

    console.log(`📋 Partidos encontrados en calendario: ${partidos?.length || 0}`);
    
    if (partidos && partidos.length > 0) {
      // Mostrar algunos partidos
      console.log('\n📅 Primeros 5 partidos:');
      partidos.slice(0, 5).forEach((p, i) => {
        console.log(`   ${i + 1}. ${p.fecha_programada} ${p.hora_programada || 'Sin hora'} - Estado: ${p.estado} - Bye: ${p.es_bye}`);
      });
    }

    // 4. Verificar partidos en tabla juegos
    console.log('\n4️⃣ Verificando partidos en tabla juegos...');
    const { data: juegos, error: juegosError } = await supabase
      .from('juegos')
      .select(`
        id,
        fecha,
        estado,
        equipo_local_id,
        equipo_visitante_id,
        temporada_id,
        liga_id
      `)
      .eq('liga_id', ligaPoli.id)
      .in('temporada_id', temporadaIds);

    if (juegosError) {
      console.log('❌ Error buscando juegos:', juegosError.message);
    } else {
      console.log(`📋 Juegos encontrados en tabla juegos: ${juegos?.length || 0}`);
    }

    // 5. Simular llamada API
    console.log('\n5️⃣ Simulando llamada a API de anotador...');
    console.log(`Liga ID para filtro: ${ligaPoli.id}`);
    console.log(`Temporada IDs: ${temporadaIds.join(', ')}`);

    // Mostrar lo que vería el anotador
    const partidosParaAnotador = partidos?.filter(p => !p.es_bye) || [];
    console.log(`🎯 Partidos que debería ver el anotador: ${partidosParaAnotador.length}`);

    if (partidosParaAnotador.length === 0) {
      console.log('\n❌ PROBLEMA ENCONTRADO: No hay partidos válidos para el anotador');
      console.log('   - Todos los partidos son bye, o');
      console.log('   - No hay partidos creados, o');
      console.log('   - Los partidos están en temporadas incorrectas');
    } else {
      console.log('\n✅ Los partidos existen y deberían aparecer en la interfaz');
    }

    // 6. Verificar equipos
    console.log('\n6️⃣ Verificando equipos...');
    const equipoIds = [
      ...new Set([
        ...partidosParaAnotador.map(p => p.equipo_local_id),
        ...partidosParaAnotador.map(p => p.equipo_visitante_id)
      ])
    ].filter(Boolean);

    if (equipoIds.length > 0) {
      const { data: equipos } = await supabase
        .from('equipos')
        .select('id, nombre, liga_id')
        .in('id', equipoIds);

      console.log(`📋 Equipos involucrados: ${equipos?.length || 0}`);
      equipos?.forEach(e => {
        console.log(`   - ${e.nombre}`);
      });
    }

  } catch (error) {
    console.error('💥 Error en diagnóstico:', error);
  }
}

debugPartidosLiga();