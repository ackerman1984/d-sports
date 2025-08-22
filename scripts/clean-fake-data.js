const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

// Configuración de Supabase (usando variables de entorno)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

console.log('Supabase URL:', supabaseUrl ? 'Set' : 'Missing');
console.log('Service Key:', supabaseServiceKey ? 'Set' : 'Missing');

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Faltan variables de entorno de Supabase');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function cleanFakeData() {
  console.log('🧹 Iniciando limpieza de datos falsos...');

  try {
    // 1. Eliminar estadísticas de jugadores que no fueron creadas por formularios reales
    console.log('Limpiando estadísticas falsas...');
    
    // Solo mantener estadísticas reales basadas en juegos finalizados
    const { data: realGames, error: gamesError } = await supabase
      .from('juegos')
      .select('id')
      .eq('estado', 'finalizado');

    if (gamesError) {
      console.error('Error obteniendo juegos reales:', gamesError);
      return;
    }

    const realGameIds = realGames.map(game => game.id);

    if (realGameIds.length > 0) {
      // Eliminar estadísticas que no corresponden a juegos reales finalizados
      const { error: deleteStatsError } = await supabase
        .from('estadisticas_jugador')
        .delete()
        .not('juego_id', 'in', `(${realGameIds.join(',')})`);

      if (deleteStatsError) {
        console.error('Error eliminando estadísticas falsas:', deleteStatsError);
      } else {
        console.log('✅ Estadísticas falsas eliminadas');
      }
    } else {
      // Si no hay juegos finalizados, eliminar todas las estadísticas
      const { error: deleteAllStatsError } = await supabase
        .from('estadisticas_jugador')
        .delete()
        .neq('id', 'non-existent'); // Eliminar todo

      if (deleteAllStatsError) {
        console.error('Error eliminando todas las estadísticas:', deleteAllStatsError);
      } else {
        console.log('✅ Todas las estadísticas falsas eliminadas (no hay juegos finalizados)');
      }
    }

    // 2. Limpiar datos de jugadores duplicados o inconsistentes
    console.log('Verificando datos de jugadores...');
    
    // Obtener usuarios que son jugadores
    const { data: jugadores, error: jugadoresError } = await supabase
      .from('usuarios')
      .select('id, nombre, email, liga_id, equipo_id')
      .eq('role', 'jugador');

    if (jugadoresError) {
      console.error('Error obteniendo jugadores:', jugadoresError);
      return;
    }

    console.log(`📊 Encontrados ${jugadores.length} jugadores registrados`);

    // 3. Verificar que cada jugador tenga datos consistentes
    for (const jugador of jugadores) {
      // Verificar si tiene entrada en tabla jugadores
      const { data: jugadorData, error: jugadorDataError } = await supabase
        .from('jugadores')
        .select('*')
        .eq('usuario_id', jugador.id);

      if (jugadorDataError) {
        console.error(`Error verificando datos del jugador ${jugador.nombre}:`, jugadorDataError);
        continue;
      }

      // Si tiene múltiples entradas, mantener solo la más reciente
      if (jugadorData && jugadorData.length > 1) {
        console.log(`⚠️  Jugador ${jugador.nombre} tiene ${jugadorData.length} entradas duplicadas`);
        
        // Ordenar por fecha de creación y mantener la más reciente
        const sortedData = jugadorData.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
        const toDelete = sortedData.slice(1);

        for (const duplicate of toDelete) {
          const { error: deleteError } = await supabase
            .from('jugadores')
            .delete()
            .eq('id', duplicate.id);

          if (deleteError) {
            console.error(`Error eliminando duplicado:`, deleteError);
          }
        }

        console.log(`✅ Eliminadas ${toDelete.length} entradas duplicadas para ${jugador.nombre}`);
      }
    }

    // 4. Eliminar juegos que no tienen equipos válidos o datos completos
    console.log('Limpiando juegos inválidos...');
    
    const { data: invalidGames, error: invalidGamesError } = await supabase
      .from('juegos')
      .select('id, fecha, equipo_local_id, equipo_visitante_id, equipos_local:equipo_local_id(nombre), equipos_visitante:equipo_visitante_id(nombre)')
      .or('equipo_local_id.is.null,equipo_visitante_id.is.null');

    if (!invalidGamesError && invalidGames && invalidGames.length > 0) {
      console.log(`⚠️  Encontrados ${invalidGames.length} juegos con datos inválidos`);
      
      // Solo eliminar juegos que claramente son de prueba (sin equipos válidos)
      for (const game of invalidGames) {
        if (!game.equipos_local || !game.equipos_visitante) {
          const { error: deleteGameError } = await supabase
            .from('juegos')
            .delete()
            .eq('id', game.id);

          if (!deleteGameError) {
            console.log(`✅ Eliminado juego inválido del ${game.fecha}`);
          }
        }
      }
    }

    console.log('🎉 Limpieza completada exitosamente');
    
    // Mostrar estadísticas finales
    const { data: finalUsers } = await supabase
      .from('usuarios')
      .select('id, nombre, role')
      .eq('role', 'jugador');

    const { data: finalStats } = await supabase
      .from('estadisticas_jugador')
      .select('id');

    const { data: finalGames } = await supabase
      .from('juegos')
      .select('id');

    console.log('📊 Estadísticas finales:');
    console.log(`   - Jugadores registrados: ${finalUsers?.length || 0}`);
    console.log(`   - Estadísticas reales: ${finalStats?.length || 0}`);
    console.log(`   - Juegos válidos: ${finalGames?.length || 0}`);

  } catch (error) {
    console.error('❌ Error durante la limpieza:', error);
  }
}

// Ejecutar script
cleanFakeData().then(() => {
  console.log('Script terminado');
  process.exit(0);
}).catch(error => {
  console.error('Error fatal:', error);
  process.exit(1);
});