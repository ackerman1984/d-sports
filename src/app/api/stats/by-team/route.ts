import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);
    const ligaId = searchParams.get('liga_id');
    const equipoId = searchParams.get('equipo_id');
    const temporadaId = searchParams.get('temporada_id');

    if (!ligaId) {
      return NextResponse.json({ error: 'Liga ID requerido' }, { status: 400 });
    }

    console.log('🏟️ Obteniendo estadísticas por equipos para liga:', ligaId);

    if (equipoId) {
      // Estadísticas de un equipo específico
      const { data: jugadores, error: jugadoresError } = await supabase
        .from('jugadores')
        .select(`
          id,
          nombre,
          numero_casaca,
          posicion_principal,
          equipos!inner(
            id,
            nombre,
            liga_id
          )
        `)
        .eq('equipo_id', equipoId)
        .eq('equipos.liga_id', ligaId);

      if (jugadoresError) {
        console.error('❌ Error obteniendo jugadores del equipo:', jugadoresError);
        return NextResponse.json({ error: 'Error obteniendo jugadores' }, { status: 500 });
      }

      // Obtener estadísticas para cada jugador del equipo
      const estadisticasEquipo = await Promise.all(
        (jugadores || []).map(async (jugador) => {
          let query = supabase
            .from('estadisticas_jugador')
            .select(`
              turnos,
              hits,
              carreras,
              impulsadas,
              home_runs,
              bases_robadas,
              ponches,
              base_por_bolas,
              errores,
              juego_id
            `)
            .eq('jugador_id', jugador.id);

          // Filtrar por temporada si se especifica
          if (temporadaId) {
            const { data: juegoIds } = await supabase
              .from('juegos')
              .select('id')
              .eq('temporada_id', temporadaId);
            
            if (juegoIds && juegoIds.length > 0) {
              query = query.in('juego_id', juegoIds.map(j => j.id));
            }
          }

          const { data: stats } = await query;

          const totales = (stats || []).reduce((acc, stat) => ({
            turnos: acc.turnos + (stat.turnos || 0),
            hits: acc.hits + (stat.hits || 0),
            carreras: acc.carreras + (stat.carreras || 0),
            impulsadas: acc.impulsadas + (stat.impulsadas || 0),
            home_runs: acc.home_runs + (stat.home_runs || 0),
            bases_robadas: acc.bases_robadas + (stat.bases_robadas || 0),
            ponches: acc.ponches + (stat.ponches || 0),
            base_por_bolas: acc.base_por_bolas + (stat.base_por_bolas || 0),
            errores: acc.errores + (stat.errores || 0),
            juegos_jugados: new Set(stats?.map(s => s.juego_id)).size || 0
          }), {
            turnos: 0, hits: 0, carreras: 0, impulsadas: 0, home_runs: 0,
            bases_robadas: 0, ponches: 0, base_por_bolas: 0, errores: 0, juegos_jugados: 0
          });

          const promedio_bateo = totales.turnos > 0 ? (totales.hits / totales.turnos) : 0;

          return {
            id: jugador.id,
            nombre: jugador.nombre,
            numero_casaca: jugador.numero_casaca,
            posicion_principal: jugador.posicion_principal,
            ...totales,
            promedio_bateo: Math.round(promedio_bateo * 1000) / 1000
          };
        })
      );

      return NextResponse.json({
        equipo: jugadores[0]?.equipos,
        estadisticas: estadisticasEquipo.sort((a, b) => b.promedio_bateo - a.promedio_bateo),
        total_jugadores: estadisticasEquipo.length
      });

    } else {
      // Estadísticas de todos los equipos de la liga
      const { data: equipos, error: equiposError } = await supabase
        .from('equipos')
        .select('id, nombre')
        .eq('liga_id', ligaId);

      if (equiposError) {
        console.error('❌ Error obteniendo equipos:', equiposError);
        return NextResponse.json({ error: 'Error obteniendo equipos' }, { status: 500 });
      }

      // Obtener estadísticas por equipo
      const estadisticasPorEquipo = await Promise.all(
        (equipos || []).map(async (equipo) => {
          const { data: jugadores } = await supabase
            .from('jugadores')
            .select('id')
            .eq('equipo_id', equipo.id);

          if (!jugadores || jugadores.length === 0) {
            return {
              equipo_id: equipo.id,
              equipo_nombre: equipo.nombre,
              total_jugadores: 0,
              totales: {
                turnos: 0, hits: 0, carreras: 0, impulsadas: 0, home_runs: 0,
                bases_robadas: 0, ponches: 0, base_por_bolas: 0, errores: 0,
                juegos_jugados: 0, promedio_bateo: 0
              }
            };
          }

          const jugadorIds = jugadores.map(j => j.id);
          
          let query = supabase
            .from('estadisticas_jugador')
            .select(`
              turnos,
              hits,
              carreras,
              impulsadas,
              home_runs,
              bases_robadas,
              ponches,
              base_por_bolas,
              errores,
              juego_id
            `)
            .in('jugador_id', jugadorIds);

          // Filtrar por temporada si se especifica
          if (temporadaId) {
            const { data: juegoIds } = await supabase
              .from('juegos')
              .select('id')
              .eq('temporada_id', temporadaId);
            
            if (juegoIds && juegoIds.length > 0) {
              query = query.in('juego_id', juegoIds.map(j => j.id));
            }
          }

          const { data: stats } = await query;

          const totales = (stats || []).reduce((acc, stat) => ({
            turnos: acc.turnos + (stat.turnos || 0),
            hits: acc.hits + (stat.hits || 0),
            carreras: acc.carreras + (stat.carreras || 0),
            impulsadas: acc.impulsadas + (stat.impulsadas || 0),
            home_runs: acc.home_runs + (stat.home_runs || 0),
            bases_robadas: acc.bases_robadas + (stat.bases_robadas || 0),
            ponches: acc.ponches + (stat.ponches || 0),
            base_por_bolas: acc.base_por_bolas + (stat.base_por_bolas || 0),
            errores: acc.errores + (stat.errores || 0),
            juegos_jugados: new Set(stats?.map(s => s.juego_id)).size || 0
          }), {
            turnos: 0, hits: 0, carreras: 0, impulsadas: 0, home_runs: 0,
            bases_robadas: 0, ponches: 0, base_por_bolas: 0, errores: 0, juegos_jugados: 0
          });

          const promedio_bateo = totales.turnos > 0 ? (totales.hits / totales.turnos) : 0;

          return {
            equipo_id: equipo.id,
            equipo_nombre: equipo.nombre,
            total_jugadores: jugadores.length,
            totales: {
              ...totales,
              promedio_bateo: Math.round(promedio_bateo * 1000) / 1000
            }
          };
        })
      );

      return NextResponse.json({
        equipos: estadisticasPorEquipo.sort((a, b) => b.totales.promedio_bateo - a.totales.promedio_bateo),
        total_equipos: estadisticasPorEquipo.length
      });
    }

  } catch (error) {
    console.error('💥 Error obteniendo estadísticas por equipos:', error);
    return NextResponse.json({ error: 'Error del servidor' }, { status: 500 });
  }
}