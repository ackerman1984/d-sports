const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Faltan variables de entorno de Supabase');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function createTestGame() {
  console.log('🏟️ Creando juego de prueba para anotador...\n');

  try {
    // 1. Obtener liga POLI
    const { data: liga, error: ligaError } = await supabase
      .from('ligas')
      .select('id, nombre, codigo')
      .eq('codigo', 'POLI')
      .single();

    if (ligaError || !liga) {
      console.error('❌ Error obteniendo liga POLI:', ligaError);
      return;
    }

    console.log(`✅ Liga encontrada: ${liga.nombre} (${liga.codigo})`);

    // 2. Obtener equipos de la liga
    const { data: equipos, error: equiposError } = await supabase
      .from('equipos')
      .select('id, nombre, activo')
      .eq('liga_id', liga.id)
      .eq('activo', true)
      .limit(2);

    if (equiposError || !equipos || equipos.length < 2) {
      console.error('❌ Error: Se necesitan al menos 2 equipos activos:', equiposError);
      console.log('Equipos encontrados:', equipos?.length || 0);
      return;
    }

    console.log(`✅ Equipos encontrados: ${equipos[0].nombre} vs ${equipos[1].nombre}`);

    // 3. Obtener temporada activa
    const { data: temporada, error: temporadaError } = await supabase
      .from('temporadas')
      .select('id, nombre, activa')
      .eq('liga_id', liga.id)
      .eq('activa', true)
      .single();

    if (temporadaError || !temporada) {
      console.error('❌ Error obteniendo temporada activa:', temporadaError);
      
      // Crear temporada si no existe
      console.log('📅 Creando temporada de prueba...');
      const { data: nuevaTemporada, error: crearTemporadaError } = await supabase
        .from('temporadas')
        .insert({
          nombre: '2024 - Temporada de Prueba',
          liga_id: liga.id,
          activa: true,
          fecha_inicio: '2024-01-01',
          fecha_fin: '2024-12-31'
        })
        .select()
        .single();

      if (crearTemporadaError) {
        console.error('❌ Error creando temporada:', crearTemporadaError);
        return;
      }

      console.log(`✅ Temporada creada: ${nuevaTemporada.nombre}`);
      temporada = nuevaTemporada;
    } else {
      console.log(`✅ Temporada encontrada: ${temporada.nombre}`);
    }

    // 4. Crear el juego
    const fechaJuego = new Date();
    fechaJuego.setDate(fechaJuego.getDate() + 1); // Mañana
    
    const juegoData = {
      equipo_local_id: equipos[0].id,
      equipo_visitante_id: equipos[1].id,
      temporada_id: temporada.id,
      liga_id: liga.id,
      fecha_hora: fechaJuego.toISOString(),
      estadio: 'Estadio de Prueba',
      estado: 'programado', // programado, en_progreso, finalizado, suspendido
      descripcion: 'Partido de prueba para sistema de anotación'
    };

    console.log('\n📝 Creando juego con datos:');
    console.log('   - Local:', equipos[0].nombre);
    console.log('   - Visitante:', equipos[1].nombre);
    console.log('   - Fecha:', fechaJuego.toLocaleDateString());
    console.log('   - Hora:', fechaJuego.toLocaleTimeString());

    const { data: nuevoJuego, error: juegoError } = await supabase
      .from('juegos')
      .insert(juegoData)
      .select(`
        id,
        fecha_hora,
        estadio,
        estado,
        descripcion,
        equipo_local:equipo_local_id (nombre),
        equipo_visitante:equipo_visitante_id (nombre),
        temporada:temporada_id (nombre),
        liga:liga_id (nombre, codigo)
      `)
      .single();

    if (juegoError) {
      console.error('❌ Error creando juego:', juegoError);
      return;
    }

    console.log('\n🎉 ¡Juego creado exitosamente!');
    console.log(`   - ID: ${nuevoJuego.id}`);
    console.log(`   - Partido: ${nuevoJuego.equipo_local.nombre} vs ${nuevoJuego.equipo_visitante.nombre}`);
    console.log(`   - Liga: ${nuevoJuego.liga.nombre}`);
    console.log(`   - Temporada: ${nuevoJuego.temporada.nombre}`);
    console.log(`   - Estado: ${nuevoJuego.estado}`);
    console.log(`   - Estadio: ${nuevoJuego.estadio}`);

    // 5. Asignar el juego al anotador
    const { data: anotador, error: anotadorError } = await supabase
      .from('anotadores')
      .select('id, nombre')
      .eq('liga_id', liga.id)
      .eq('activo', true)
      .single();

    if (anotadorError || !anotador) {
      console.log('⚠️ No se pudo asignar anotador automáticamente');
      console.log('El juego estará disponible para asignación manual');
    } else {
      console.log(`\n👤 Asignando juego al anotador: ${anotador.nombre}`);
      
      const { error: asignacionError } = await supabase
        .from('anotador_juegos')
        .insert({
          anotador_id: anotador.id,
          juego_id: nuevoJuego.id,
          fecha_asignacion: new Date().toISOString()
        });

      if (asignacionError) {
        console.log('⚠️ Error asignando juego al anotador:', asignacionError.message);
      } else {
        console.log('✅ Juego asignado exitosamente al anotador');
      }
    }

    console.log('\n🎯 Instrucciones:');
    console.log('1. Inicia sesión como anotador en: http://localhost:3000/login');
    console.log('2. Selecciona "📝 Anotador"');
    console.log('3. Usa: anotador1@gmail.com / ANOTADOR1');
    console.log('4. Ve al dashboard y encontrarás el juego disponible');

  } catch (error) {
    console.error('❌ Error general:', error);
  }
}

// Ejecutar
createTestGame().then(() => {
  console.log('\n✅ Proceso completado.');
  process.exit(0);
}).catch(error => {
  console.error('❌ Error fatal:', error);
  process.exit(1);
});