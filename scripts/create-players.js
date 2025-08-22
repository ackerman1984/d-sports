const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function createPlayers() {
  console.log('⚾ Creando jugadores para los equipos...\n');

  try {
    // 1. Buscar los equipos
    const { data: equipos, error: equiposError } = await supabase
      .from('equipos')
      .select('id, nombre')
      .in('nombre', ['upicsa', 'encb']);

    if (equiposError) {
      console.log('❌ Error buscando equipos:', equiposError.message);
      return;
    }

    if (!equipos || equipos.length !== 2) {
      console.log('❌ No se encontraron ambos equipos');
      console.log('Equipos encontrados:', equipos?.map(e => e.nombre));
      return;
    }

    const equipoUPICSA = equipos.find(e => e.nombre === 'upicsa');
    const equipoENCB = equipos.find(e => e.nombre === 'encb');

    console.log('✅ Equipos encontrados:');
    console.log(`   - UPICSA: ${equipoUPICSA.id}`);
    console.log(`   - ENCB: ${equipoENCB.id}`);

    // 2. Jugadores para UPICSA
    const jugadoresUPICSA = [
      { nombre: 'Carlos Martínez', numero_casaca: 1, posicion: 'Pitcher' },
      { nombre: 'Luis García', numero_casaca: 2, posicion: 'Catcher' },
      { nombre: 'Miguel Rodríguez', numero_casaca: 3, posicion: '1st Base' },
      { nombre: 'Jorge López', numero_casaca: 4, posicion: '2nd Base' },
      { nombre: 'Diego Hernández', numero_casaca: 5, posicion: '3rd Base' },
      { nombre: 'Roberto Silva', numero_casaca: 6, posicion: 'Shortstop' },
      { nombre: 'Fernando Morales', numero_casaca: 7, posicion: 'Left Field' },
      { nombre: 'Antonio Vázquez', numero_casaca: 8, posicion: 'Center Field' },
      { nombre: 'Ricardo Jiménez', numero_casaca: 9, posicion: 'Right Field' }
    ];

    // 3. Jugadores para ENCB
    const jugadoresENCB = [
      { nombre: 'Alejandro Ramírez', numero_casaca: 1, posicion: 'Pitcher' },
      { nombre: 'Sebastián Torres', numero_casaca: 2, posicion: 'Catcher' },
      { nombre: 'Gabriel Flores', numero_casaca: 3, posicion: '1st Base' },
      { nombre: 'Andrés Mendoza', numero_casaca: 4, posicion: '2nd Base' },
      { nombre: 'Daniel Castro', numero_casaca: 5, posicion: '3rd Base' },
      { nombre: 'Pablo Guerrero', numero_casaca: 6, posicion: 'Shortstop' },
      { nombre: 'Emilio Vargas', numero_casaca: 7, posicion: 'Left Field' },
      { nombre: 'César Delgado', numero_casaca: 8, posicion: 'Center Field' },
      { nombre: 'Manuel Ortega', numero_casaca: 9, posicion: 'Right Field' }
    ];

    // 4. Insertar jugadores UPICSA
    console.log('\n⚾ Creando jugadores para UPICSA...');
    for (const jugador of jugadoresUPICSA) {
      const { data, error } = await supabase
        .from('jugadores')
        .insert({
          nombre: jugador.nombre,
          numero_casaca: jugador.numero_casaca,
          posicion: jugador.posicion,
          equipo_id: equipoUPICSA.id,
          activo: true
        })
        .select();

      if (error) {
        console.log(`❌ Error creando ${jugador.nombre}:`, error.message);
      } else {
        console.log(`✅ ${jugador.nombre} (#${jugador.numero_casaca}) - ${jugador.posicion}`);
      }
    }

    // 5. Insertar jugadores ENCB
    console.log('\n⚾ Creando jugadores para ENCB...');
    for (const jugador of jugadoresENCB) {
      const { data, error } = await supabase
        .from('jugadores')
        .insert({
          nombre: jugador.nombre,
          numero_casaca: jugador.numero_casaca,
          posicion: jugador.posicion,
          equipo_id: equipoENCB.id,
          activo: true
        })
        .select();

      if (error) {
        console.log(`❌ Error creando ${jugador.nombre}:`, error.message);
      } else {
        console.log(`✅ ${jugador.nombre} (#${jugador.numero_casaca}) - ${jugador.posicion}`);
      }
    }

    // 6. Verificar total de jugadores creados
    console.log('\n📊 Verificando jugadores creados...');
    const { data: totalUPICSA } = await supabase
      .from('jugadores')
      .select('id')
      .eq('equipo_id', equipoUPICSA.id);

    const { data: totalENCB } = await supabase
      .from('jugadores')
      .select('id')
      .eq('equipo_id', equipoENCB.id);

    console.log(`✅ UPICSA: ${totalUPICSA?.length || 0} jugadores`);
    console.log(`✅ ENCB: ${totalENCB?.length || 0} jugadores`);
    console.log('\n🎉 ¡Jugadores creados exitosamente!');

  } catch (error) {
    console.error('💥 Error:', error);
  }
}

createPlayers();