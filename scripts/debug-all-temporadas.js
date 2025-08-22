const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function debugAllTemporadas() {
  console.log('🔍 Verificando TODAS las temporadas y partidos...\n');

  try {
    // 1. Todas las ligas
    console.log('1️⃣ Todas las ligas:');
    const { data: ligas } = await supabase
      .from('ligas')
      .select('id, nombre, codigo')
      .order('nombre');

    ligas?.forEach(liga => {
      console.log(`   - ${liga.nombre} (${liga.codigo}) [ID: ${liga.id}]`);
    });

    // 2. Todas las temporadas
    console.log('\n2️⃣ Todas las temporadas:');
    const { data: temporadas } = await supabase
      .from('configuracion_temporada')
      .select(`
        id,
        nombre,
        estado,
        liga_id,
        ligas:liga_id (nombre, codigo)
      `)
      .order('created_at', { ascending: false });

    if (!temporadas || temporadas.length === 0) {
      console.log('❌ No hay temporadas en el sistema');
    } else {
      console.log(`📋 Total temporadas: ${temporadas.length}`);
      temporadas.forEach(temp => {
        const liga = Array.isArray(temp.ligas) ? temp.ligas[0] : temp.ligas;
        console.log(`   - ${temp.nombre} (${temp.estado}) - Liga: ${liga?.nombre || 'Sin liga'} [ID: ${temp.id}]`);
      });
    }

    // 3. Todos los partidos en calendario
    console.log('\n3️⃣ Todos los partidos en calendario:');
    const { data: partidos } = await supabase
      .from('partidos_calendario')
      .select(`
        id,
        fecha_programada,
        estado,
        temporada_id,
        equipo_local_id,
        equipo_visitante_id,
        es_bye
      `)
      .order('created_at', { ascending: false })
      .limit(10);

    if (!partidos || partidos.length === 0) {
      console.log('❌ No hay partidos en calendario');
    } else {
      console.log(`📋 Últimos ${partidos.length} partidos creados:`);
      partidos.forEach(partido => {
        console.log(`   - ${partido.fecha_programada} | Estado: ${partido.estado} | Temporada: ${partido.temporada_id} | Bye: ${partido.es_bye}`);
      });
    }

    // 4. Todos los partidos en tabla juegos
    console.log('\n4️⃣ Todos los partidos en tabla juegos:');
    const { data: juegos } = await supabase
      .from('juegos')
      .select(`
        id,
        fecha,
        estado,
        temporada_id,
        liga_id
      `)
      .order('created_at', { ascending: false })
      .limit(10);

    if (!juegos || juegos.length === 0) {
      console.log('❌ No hay partidos en tabla juegos');
    } else {
      console.log(`📋 Últimos ${juegos.length} juegos:`);
      juegos.forEach(juego => {
        console.log(`   - ${juego.fecha} | Estado: ${juego.estado} | Temporada: ${juego.temporada_id} | Liga: ${juego.liga_id}`);
      });
    }

    // 5. Verificar específicamente liga politecnica
    const ligaPoli = ligas?.find(l => l.codigo.includes('LIGAPOLITE'));
    if (ligaPoli) {
      console.log(`\n5️⃣ Verificando específicamente liga ${ligaPoli.nombre}:`);
      
      // Temporadas de esta liga
      const temporadasPoli = temporadas?.filter(t => t.liga_id === ligaPoli.id) || [];
      console.log(`   📅 Temporadas de esta liga: ${temporadasPoli.length}`);
      
      if (temporadasPoli.length > 0) {
        const temporadaIds = temporadasPoli.map(t => t.id);
        
        // Partidos de estas temporadas
        const { data: partidosPoli } = await supabase
          .from('partidos_calendario')
          .select('id, fecha_programada, estado, es_bye')
          .in('temporada_id', temporadaIds);
          
        console.log(`   ⚾ Partidos en calendario: ${partidosPoli?.length || 0}`);
        
        const { data: juegosPoli } = await supabase
          .from('juegos')
          .select('id, fecha, estado')
          .eq('liga_id', ligaPoli.id)
          .in('temporada_id', temporadaIds);
          
        console.log(`   🎮 Juegos en tabla juegos: ${juegosPoli?.length || 0}`);
        
        if (partidosPoli && partidosPoli.length > 0) {
          console.log('\n   📋 Detalles de partidos:');
          partidosPoli.slice(0, 3).forEach(p => {
            console.log(`      - ${p.fecha_programada} | ${p.estado} | Bye: ${p.es_bye}`);
          });
        }
      }
    }

  } catch (error) {
    console.error('💥 Error:', error);
  }
}

debugAllTemporadas();