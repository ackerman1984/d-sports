const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function createGameFixed() {
  console.log('🏟️ Creando juego con esquema correcto...\n');

  try {
    // 1. Obtener datos
    console.log('📋 Obteniendo datos de la liga POLI...');
    
    const { data: liga, error: ligaError } = await supabase
      .from('ligas')
      .select('id, nombre, codigo')
      .eq('codigo', 'POLI')
      .single();

    if (ligaError) {
      console.error('❌ Error obteniendo liga:', ligaError);
      return;
    }

    const { data: equipos, error: equiposError } = await supabase
      .from('equipos')
      .select('id, nombre, activo')
      .eq('liga_id', liga.id)
      .eq('activo', true)
      .limit(2);

    if (equiposError || equipos.length < 2) {
      console.error('❌ Error obteniendo equipos:', equiposError);
      return;
    }

    const { data: temporada, error: temporadaError } = await supabase
      .from('temporadas')
      .select('id, nombre')
      .eq('liga_id', liga.id)
      .maybeSingle();

    console.log('✅ Datos obtenidos:');
    console.log(`   - Liga: ${liga.nombre} (${liga.codigo})`);
    console.log(`   - Local: ${equipos[0].nombre}`);
    console.log(`   - Visitante: ${equipos[1].nombre}`);
    console.log(`   - Temporada: ${temporada?.nombre || 'Ninguna'}`);

    // 2. Crear temporada si no existe
    let temporadaId = temporada?.id;
    
    if (!temporada) {
      console.log('\n📅 Creando temporada...');
      const { data: nuevaTemporada, error: createTemporadaError } = await supabase
        .from('temporadas')
        .insert({
          liga_id: liga.id,
          nombre: '2024 - Temporada Prueba',
          fecha_inicio: '2024-01-01',
          fecha_fin: '2024-12-31',
          activa: true
        })
        .select('id, nombre')
        .single();

      if (createTemporadaError) {
        console.error('❌ Error creando temporada:', createTemporadaError);
        // Continuar sin temporada si hay error
        temporadaId = null;
      } else {
        temporadaId = nuevaTemporada.id;
        console.log(`✅ Temporada creada: ${nuevaTemporada.nombre}`);
      }
    }

    // 3. Crear juego con esquema correcto
    console.log('\n🏀 Creando juego...');
    
    const fechaJuego = new Date();
    fechaJuego.setHours(15, 30, 0, 0); // Hoy a las 3:30 PM

    const juegoData = {
      equipo_local_id: equipos[0].id,
      equipo_visitante_id: equipos[1].id,
      fecha: fechaJuego.toISOString(),
      estado: 'programado',
      marcador_local: 0,
      marcador_visitante: 0
    };

    // Agregar temporada si existe
    if (temporadaId) {
      juegoData.temporada_id = temporadaId;
    }

    console.log('📝 Datos del juego:');
    console.log(`   - ${equipos[0].nombre} vs ${equipos[1].nombre}`);
    console.log(`   - Fecha: ${fechaJuego.toLocaleString()}`);
    console.log(`   - Estado: ${juegoData.estado}`);

    const { data: nuevoJuego, error: juegoError } = await supabase
      .from('juegos')
      .insert(juegoData)
      .select(`
        id,
        fecha,
        estado,
        marcador_local,
        marcador_visitante,
        equipo_local:equipo_local_id (nombre),
        equipo_visitante:equipo_visitante_id (nombre)
      `)
      .single();

    if (juegoError) {
      console.error('❌ Error creando juego:', juegoError);
      return;
    }

    console.log('\n🎉 ¡Juego creado exitosamente!');
    console.log(`   - ID: ${nuevoJuego.id}`);
    console.log(`   - Partido: ${nuevoJuego.equipo_local.nombre} vs ${nuevoJuego.equipo_visitante.nombre}`);
    console.log(`   - Fecha: ${new Date(nuevoJuego.fecha).toLocaleString()}`);
    console.log(`   - Estado: ${nuevoJuego.estado}`);

    // 4. Asignar al anotador (opcional)
    const { data: anotador } = await supabase
      .from('anotadores')
      .select('id, nombre')
      .eq('liga_id', liga.id)
      .eq('activo', true)
      .single();

    if (anotador) {
      console.log(`\n👤 Asignando al anotador: ${anotador.nombre}`);
      
      const { error: asignError } = await supabase
        .from('anotador_juegos')
        .insert({
          anotador_id: anotador.id,
          juego_id: nuevoJuego.id,
          fecha_asignacion: new Date().toISOString()
        });

      if (asignError) {
        console.log('⚠️ Error en asignación:', asignError.message);
      } else {
        console.log('✅ Juego asignado exitosamente');
      }
    }

    console.log('\n🎯 Para probar:');
    console.log('1. Ve a: http://localhost:3000/login');
    console.log('2. Selecciona "📝 Anotador"');
    console.log('3. Login: anotador1@gmail.com / ANOTADOR1');
    console.log('4. Deberías ver el juego en el dashboard');

  } catch (error) {
    console.error('❌ Error general:', error);
  }
}

createGameFixed();