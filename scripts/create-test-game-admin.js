const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Faltan variables de entorno de Supabase');
  console.log('Necesitas SUPABASE_SERVICE_ROLE_KEY en .env.local');
  process.exit(1);
}

// Cliente admin que bypassa RLS
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function createTestGameAdmin() {
  console.log('🏟️ Creando juego de prueba (modo admin)...\n');

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
      .eq('activo', true);

    if (equiposError || !equipos || equipos.length < 2) {
      console.error('❌ Error: Se necesitan al menos 2 equipos activos');
      console.log('Equipos encontrados:', equipos?.length || 0);
      
      if (equipos?.length > 0) {
        equipos.forEach((eq, i) => {
          console.log(`   ${i + 1}. ${eq.nombre} (activo: ${eq.activo})`);
        });
      }
      return;
    }

    console.log(`✅ Equipos encontrados:`);
    console.log(`   - Local: ${equipos[0].nombre}`);
    console.log(`   - Visitante: ${equipos[1].nombre}`);

    // 3. Verificar o crear temporada
    let { data: temporada, error: temporadaError } = await supabase
      .from('temporadas')
      .select('id, nombre, activa')
      .eq('liga_id', liga.id)
      .eq('activa', true)
      .maybeSingle();

    if (!temporada) {
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

      temporada = nuevaTemporada;
      console.log(`✅ Temporada creada: ${temporada.nombre}`);
    } else {
      console.log(`✅ Temporada existente: ${temporada.nombre}`);
    }

    // 4. Crear el juego
    const fechaJuego = new Date();
    fechaJuego.setHours(15, 30, 0, 0); // 3:30 PM hoy
    
    const juegoData = {
      equipo_local_id: equipos[0].id,
      equipo_visitante_id: equipos[1].id,
      temporada_id: temporada.id,
      liga_id: liga.id,
      fecha_hora: fechaJuego.toISOString(),
      estadio: 'Estadio Central',
      estado: 'programado',
      descripcion: 'Partido de prueba - Sistema de Anotación'
    };

    console.log('\n📝 Creando juego:');
    console.log(`   - ${equipos[0].nombre} vs ${equipos[1].nombre}`);
    console.log(`   - Fecha: ${fechaJuego.toLocaleDateString()}`);
    console.log(`   - Hora: ${fechaJuego.toLocaleTimeString()}`);

    const { data: nuevoJuego, error: juegoError } = await supabase
      .from('juegos')
      .insert(juegoData)
      .select(`
        id,
        fecha_hora,
        estadio,
        estado,
        descripcion,
        equipo_local:equipo_local_id (id, nombre),
        equipo_visitante:equipo_visitante_id (id, nombre),
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
    console.log(`   - Estado: ${nuevoJuego.estado}`);
    console.log(`   - Estadio: ${nuevoJuego.estadio}`);

    // 5. Buscar anotador y asignar juego
    const { data: anotador, error: anotadorError } = await supabase
      .from('anotadores')
      .select('id, nombre, codigo_acceso')
      .eq('liga_id', liga.id)
      .eq('activo', true)
      .single();

    if (anotadorError || !anotador) {
      console.log('\n⚠️ No se encontró anotador activo para asignar');
      console.log('El juego estará disponible sin asignación');
    } else {
      console.log(`\n👤 Asignando juego al anotador: ${anotador.nombre}`);
      
      // Verificar si ya existe asignación
      const { data: asignacionExistente } = await supabase
        .from('anotador_juegos')
        .select('id')
        .eq('juego_id', nuevoJuego.id)
        .single();

      if (!asignacionExistente) {
        const { error: asignacionError } = await supabase
          .from('anotador_juegos')
          .insert({
            anotador_id: anotador.id,
            juego_id: nuevoJuego.id,
            fecha_asignacion: new Date().toISOString()
          });

        if (asignacionError) {
          console.log('⚠️ Error asignando juego:', asignacionError.message);
        } else {
          console.log('✅ Juego asignado exitosamente');
        }
      } else {
        console.log('✅ Juego ya estaba asignado');
      }
    }

    console.log('\n🎯 Para probar:');
    console.log('1. Ve a: http://localhost:3000/login');
    console.log('2. Selecciona "📝 Anotador"');
    console.log('3. Login: anotador1@gmail.com / ANOTADOR1');
    console.log('4. Verás el juego en el dashboard del anotador');

  } catch (error) {
    console.error('❌ Error general:', error);
  }
}

// Ejecutar
createTestGameAdmin().then(() => {
  console.log('\n✅ Proceso completado.');
  process.exit(0);
}).catch(error => {
  console.error('❌ Error fatal:', error);
  process.exit(1);
});