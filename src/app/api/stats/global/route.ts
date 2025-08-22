import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);
    const ligaId = searchParams.get('liga_id');
    const temporadaId = searchParams.get('temporada_id');

    if (!ligaId) {
      return NextResponse.json({ error: 'Liga ID requerido' }, { status: 400 });
    }

    console.log('📊 Obteniendo estadísticas globales para liga:', ligaId);

    // Construir filtros
    let temporadaFilter = '';
    if (temporadaId) {
      temporadaFilter = `AND j.temporada_id = '${temporadaId}'`;
    }

    // Query para obtener estadísticas globales
    const query = `
      SELECT 
        jug.id,
        jug.nombre,
        jug.numero_casaca,
        jug.posicion_principal,
        eq.nombre as equipo_nombre,
        eq.id as equipo_id,
        COUNT(DISTINCT ej.juego_id) as juegos_jugados,
        COALESCE(SUM(ej.turnos), 0) as turnos,
        COALESCE(SUM(ej.hits), 0) as hits,
        COALESCE(SUM(ej.carreras), 0) as carreras,
        COALESCE(SUM(ej.impulsadas), 0) as impulsadas,
        COALESCE(SUM(ej.home_runs), 0) as home_runs,
        COALESCE(SUM(ej.bases_robadas), 0) as bases_robadas,
        COALESCE(SUM(ej.ponches), 0) as ponches,
        COALESCE(SUM(ej.base_por_bolas), 0) as base_por_bolas,
        COALESCE(SUM(ej.errores), 0) as errores,
        CASE 
          WHEN COALESCE(SUM(ej.turnos), 0) = 0 THEN 0
          ELSE ROUND(CAST(COALESCE(SUM(ej.hits), 0) AS FLOAT) / CAST(SUM(ej.turnos) AS FLOAT), 3)
        END as promedio_bateo
      FROM jugadores jug
      LEFT JOIN equipos eq ON jug.equipo_id = eq.id
      LEFT JOIN estadisticas_jugador ej ON jug.id = ej.jugador_id
      LEFT JOIN juegos j ON ej.juego_id = j.id
      WHERE eq.liga_id = $1 ${temporadaFilter}
      GROUP BY jug.id, jug.nombre, jug.numero_casaca, jug.posicion_principal, eq.nombre, eq.id
      ORDER BY promedio_bateo DESC, hits DESC, carreras DESC
    `;

    // Usar rpc para ejecutar query personalizada
    const { data: estadisticas, error: statsError } = await supabase
      .rpc('execute_sql', { sql_query: query, params: [ligaId] });

    if (statsError) {
      // Fallback: usar queries simples de Supabase
      console.log('⚠️ Usando fallback para estadísticas');
      
      // Obtener jugadores de la liga
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
        .eq('equipos.liga_id', ligaId);

      if (jugadoresError) {
        console.error('❌ Error obteniendo jugadores:', jugadoresError);
        return NextResponse.json({ error: 'Error obteniendo datos' }, { status: 500 });
      }

      // Obtener estadísticas para cada jugador
      const estadisticasCompletas = await Promise.all(
        (jugadores || []).map(async (jugador) => {
          const { data: stats } = await supabase
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
              juegos!inner(temporada_id)
            `)
            .eq('jugador_id', jugador.id)
            .eq(temporadaId ? 'juegos.temporada_id' : 'juego_id', temporadaId || jugador.id);

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
            juegos_jugados: stats?.length || 0
          }), {
            turnos: 0, hits: 0, carreras: 0, impulsadas: 0, home_runs: 0,
            bases_robadas: 0, ponches: 0, base_por_bolas: 0, errores: 0, juegos_jugados: 0
          });

          const promedio_bateo = totales.turnos > 0 ? (totales.hits / totales.turnos) : 0;

          return {
            id: jugador.id,
            nombre: jugador.nombre,
            numero_casaca: jugador.numero_casaca,
            equipo_nombre: (jugador.equipos as any)?.nombre,
            equipo_id: (jugador.equipos as any)?.id,
            ...totales,
            promedio_bateo: Math.round(promedio_bateo * 1000) / 1000
          };
        })
      );

      return NextResponse.json({
        estadisticas: estadisticasCompletas.sort((a, b) => b.promedio_bateo - a.promedio_bateo),
        total_jugadores: estadisticasCompletas.length
      });
    }

    return NextResponse.json({
      estadisticas: estadisticas || [],
      total_jugadores: estadisticas?.length || 0
    });

  } catch (error) {
    console.error('💥 Error obteniendo estadísticas globales:', error);
    return NextResponse.json({ error: 'Error del servidor' }, { status: 500 });
  }
}