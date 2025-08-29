import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET(request: NextRequest) {
  try {
    console.log('📊 Consultando estadísticas de temporada');
    
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
    
    const { searchParams } = new URL(request.url);
    const jugadorId = searchParams.get('jugadorId');
    const equipoId = searchParams.get('equipoId');
    const ligaId = searchParams.get('ligaId');

    // Verificar parámetros
    if (!jugadorId && !equipoId && !ligaId) {
      return NextResponse.json({ 
        error: 'Se requiere al menos jugadorId, equipoId o ligaId' 
      }, { status: 400 });
    }

    let query = `
      SELECT 
        j.id as jugador_id,
        j.nombre,
        j.numero,
        j.equipo_id,
        j.liga_id,
        COUNT(DISTINCT ej.juego_id) as juegos_jugados,
        COALESCE(SUM(ej.turnos), 0) as turnos_total,
        COALESCE(SUM(ej.hits), 0) as hits_total,
        COALESCE(SUM(ej.carreras), 0) as carreras_total,
        COALESCE(SUM(ej.impulsadas), 0) as impulsadas_total,
        COALESCE(SUM(ej.home_runs), 0) as home_runs_total,
        COALESCE(SUM(ej.bases_robadas), 0) as bases_robadas_total,
        COALESCE(SUM(ej.ponches), 0) as ponches_total,
        COALESCE(SUM(ej.base_por_bolas), 0) as base_por_bolas_total,
        COALESCE(SUM(ej.h1), 0) as h1_total,
        COALESCE(SUM(ej.h2), 0) as h2_total,
        COALESCE(SUM(ej.h3), 0) as h3_total,
        CASE 
          WHEN COALESCE(SUM(ej.turnos), 0) = 0 THEN 0.000
          ELSE ROUND(COALESCE(SUM(ej.hits), 0)::DECIMAL / SUM(ej.turnos), 3)
        END as promedio_bateo_temporada
      FROM jugadores j
      LEFT JOIN estadisticas_jugadores ej ON j.id = ej.jugador_id
    `;

    // Construir condiciones WHERE
    const conditions = [];
    if (jugadorId) conditions.push(`j.id = '${jugadorId}'`);
    if (equipoId) conditions.push(`j.equipo_id = '${equipoId}'`);
    if (ligaId) conditions.push(`j.liga_id = '${ligaId}'`);

    if (conditions.length > 0) {
      query += ` WHERE ${conditions.join(' AND ')}`;
    }

    query += ` 
      GROUP BY j.id, j.nombre, j.numero, j.equipo_id, j.liga_id
      ORDER BY promedio_bateo_temporada DESC, hits_total DESC
    `;

    const { data: stats, error: statsError } = await supabase.rpc('execute_sql', {
      sql_query: query
    });

    if (statsError) {
      // Fallback a consulta directa si RPC no funciona
      const { data: directStats, error: directError } = await supabase
        .from('estadisticas_jugadores')
        .select(`
          jugador_id,
          juego_id,
          turnos,
          hits,
          carreras,
          impulsadas,
          home_runs,
          bases_robadas,
          ponches,
          base_por_bolas,
          h1, h2, h3,
          jugadores!inner(
            id,
            nombre,
            numero,
            equipo_id,
            liga_id
          )
        `)
        .eq(jugadorId ? 'jugador_id' : 'jugadores.equipo_id', jugadorId || equipoId);

      if (directError) {
        console.error('❌ Error consultando estadísticas:', directError);
        return NextResponse.json({ 
          error: `Error consultando estadísticas: ${directError.message}` 
        }, { status: 500 });
      }

      // Procesar datos manualmente
      const processedStats = processPlayerStats(directStats);
      
      console.log('✅ Estadísticas de temporada consultadas (procesadas)');
      return NextResponse.json({
        message: 'Estadísticas de temporada obtenidas exitosamente',
        stats: processedStats,
        total: processedStats.length
      });
    }

    console.log('✅ Estadísticas de temporada consultadas');
    return NextResponse.json({
      message: 'Estadísticas de temporada obtenidas exitosamente',
      stats: stats || [],
      total: stats?.length || 0
    });

  } catch (error) {
    console.error('💥 Error consultando estadísticas de temporada:', error);
    return NextResponse.json({ error: 'Error del servidor' }, { status: 500 });
  }
}

// Función helper para procesar estadísticas manualmente
function processPlayerStats(rawData: any[]) {
  const playerMap = new Map();

  rawData.forEach(record => {
    const playerId = record.jugador_id;
    const player = record.jugadores;

    if (!playerMap.has(playerId)) {
      playerMap.set(playerId, {
        jugador_id: playerId,
        nombre: player.nombre,
        numero: player.numero,
        equipo_id: player.equipo_id,
        liga_id: player.liga_id,
        juegos_jugados: new Set(),
        turnos_total: 0,
        hits_total: 0,
        carreras_total: 0,
        impulsadas_total: 0,
        home_runs_total: 0,
        bases_robadas_total: 0,
        ponches_total: 0,
        base_por_bolas_total: 0,
        h1_total: 0,
        h2_total: 0,
        h3_total: 0
      });
    }

    const playerStats = playerMap.get(playerId);
    
    // Contar juegos únicos
    playerStats.juegos_jugados.add(record.juego_id);
    
    // Sumar estadísticas
    playerStats.turnos_total += record.turnos || 0;
    playerStats.hits_total += record.hits || 0;
    playerStats.carreras_total += record.carreras || 0;
    playerStats.impulsadas_total += record.impulsadas || 0;
    playerStats.home_runs_total += record.home_runs || 0;
    playerStats.bases_robadas_total += record.bases_robadas || 0;
    playerStats.ponches_total += record.ponches || 0;
    playerStats.base_por_bolas_total += record.base_por_bolas || 0;
    playerStats.h1_total += record.h1 || 0;
    playerStats.h2_total += record.h2 || 0;
    playerStats.h3_total += record.h3 || 0;
  });

  // Convertir a array y calcular promedios
  return Array.from(playerMap.values()).map(player => {
    const juegos_jugados = player.juegos_jugados.size;
    const promedio_bateo = player.turnos_total > 0 
      ? parseFloat((player.hits_total / player.turnos_total).toFixed(3))
      : 0.000;

    return {
      ...player,
      juegos_jugados,
      promedio_bateo_temporada: promedio_bateo
    };
  }).sort((a, b) => {
    // Ordenar por promedio de bateo desc, luego por hits desc
    if (b.promedio_bateo_temporada !== a.promedio_bateo_temporada) {
      return b.promedio_bateo_temporada - a.promedio_bateo_temporada;
    }
    return b.hits_total - a.hits_total;
  });
}