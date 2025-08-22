const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function debugTemporadaEspecifica() {
  console.log('🔍 Buscando la temporada "Temporada poli 2025-2026"...\n');

  try {
    // 1. Buscar por nombre exacto
    console.log('1️⃣ Búsqueda por nombre exacto:');
    const { data: porNombre, error: errorNombre } = await supabase
      .from('configuracion_temporada')
      .select('*')
      .eq('nombre', 'Temporada poli 2025-2026');

    if (errorNombre) {
      console.log('❌ Error:', errorNombre.message);
    } else {
      console.log(`📋 Encontradas: ${porNombre?.length || 0}`);
      if (porNombre?.length > 0) {
        porNombre.forEach(t => {
          console.log(`   - ${t.nombre} | Estado: ${t.estado} | Liga: ${t.liga_id}`);
        });
      }
    }

    // 2. Buscar por nombre parcial
    console.log('\n2️⃣ Búsqueda por nombre parcial ("poli"):');
    const { data: porParcial, error: errorParcial } = await supabase
      .from('configuracion_temporada')
      .select('*')
      .ilike('nombre', '%poli%');

    if (errorParcial) {
      console.log('❌ Error:', errorParcial.message);
    } else {
      console.log(`📋 Encontradas: ${porParcial?.length || 0}`);
      if (porParcial?.length > 0) {
        porParcial.forEach(t => {
          console.log(`   - ${t.nombre} | Estado: ${t.estado} | Liga: ${t.liga_id}`);
        });
      }
    }

    // 3. Todas las temporadas (sin filtro)
    console.log('\n3️⃣ TODAS las temporadas:');
    const { data: todas, error: errorTodas } = await supabase
      .from('configuracion_temporada')
      .select('*')
      .order('created_at', { ascending: false });

    if (errorTodas) {
      console.log('❌ Error:', errorTodas.message);
    } else {
      console.log(`📋 Total temporadas: ${todas?.length || 0}`);
      if (todas?.length > 0) {
        todas.forEach((t, i) => {
          console.log(`   ${i + 1}. "${t.nombre}" | Estado: ${t.estado} | Liga: ${t.liga_id} | Creada: ${t.created_at}`);
        });
      }
    }

    // 4. Verificar liga politecnica
    console.log('\n4️⃣ Liga politecnica:');
    const { data: liga, error: errorLiga } = await supabase
      .from('ligas')
      .select('*')
      .ilike('codigo', '%LIGAPOLITE%');

    if (errorLiga) {
      console.log('❌ Error:', errorLiga.message);
    } else if (liga?.length > 0) {
      const ligaPoli = liga[0];
      console.log(`✅ Liga encontrada: ${ligaPoli.nombre} (${ligaPoli.codigo}) | ID: ${ligaPoli.id}`);
      
      // Buscar temporadas específicamente para esta liga
      console.log('\n5️⃣ Temporadas para liga politecnica:');
      const { data: temporadasLiga, error: errorTemporadasLiga } = await supabase
        .from('configuracion_temporada')
        .select('*')
        .eq('liga_id', ligaPoli.id);

      if (errorTemporadasLiga) {
        console.log('❌ Error:', errorTemporadasLiga.message);
      } else {
        console.log(`📋 Temporadas para esta liga: ${temporadasLiga?.length || 0}`);
        if (temporadasLiga?.length > 0) {
          temporadasLiga.forEach(t => {
            console.log(`   - "${t.nombre}" | Estado: ${t.estado} | ID: ${t.id}`);
            
            // Si encontramos temporadas, buscar partidos
            if (t.estado === 'generado') {
              console.log(`     🎮 Buscando partidos para esta temporada...`);
            }
          });
          
          // Buscar partidos para estas temporadas
          const temporadaIds = temporadasLiga.map(t => t.id);
          const { data: partidos } = await supabase
            .from('partidos_calendario')
            .select('id, fecha_programada, estado')
            .in('temporada_id', temporadaIds);
            
          console.log(`   📅 Partidos encontrados: ${partidos?.length || 0}`);
          if (partidos?.length > 0) {
            partidos.slice(0, 3).forEach(p => {
              console.log(`     - ${p.fecha_programada} | ${p.estado}`);
            });
          }
        }
      }
    } else {
      console.log('❌ Liga politecnica no encontrada');
    }

  } catch (error) {
    console.error('💥 Error:', error);
  }
}

debugTemporadaEspecifica();