import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth-options';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const jugadorId = searchParams.get('jugadorId') || session.user.id;

    // Verificar que el usuario tenga permisos para ver estas estadísticas
    if (jugadorId !== session.user.id && session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const supabase = await createClient();

    // Obtener estadísticas detalladas por juego
    const { data: estadisticas, error } = await supabase
      .from('estadisticas_jugador')
      .select(`
        *,
        juegos!inner(
          id,
          fecha,
          estado,
          equipo_local_id,
          equipo_visitante_id,
          equipos_local:equipo_local_id(nombre),
          equipos_visitante:equipo_visitante_id(nombre)
        )
      `)
      .eq('jugador_id', jugadorId)
      .eq('juegos.estado', 'finalizado')
      .order('juegos(fecha)', { ascending: false });

    if (error) {
      console.error('Error fetching detailed player stats:', error);
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    if (!estadisticas || estadisticas.length === 0) {
      return NextResponse.json({
        estadisticas: {
          totalTurnos: 0,
          totalHits: 0,
          totalCarreras: 0,
          totalImpulsadas: 0,
          totalHomeRuns: 0,
          totalBasesRobadas: 0,
          totalPonches: 0,
          totalBasePorBolas: 0,
          totalErrores: 0,
          promedioBateo: 0.000,
          porcentajeEmbasado: 0.000,
          juegosPorJuego: []
        }
      });
    }

    // Calcular totales
    const totales = estadisticas.reduce((acc, stat) => {
      acc.totalTurnos += stat.turnos || 0;
      acc.totalHits += stat.hits || 0;
      acc.totalCarreras += stat.carreras || 0;
      acc.totalImpulsadas += stat.impulsadas || 0;
      acc.totalHomeRuns += stat.home_runs || 0;
      acc.totalBasesRobadas += stat.bases_robadas || 0;
      acc.totalPonches += stat.ponches || 0;
      acc.totalBasePorBolas += stat.base_por_bolas || 0;
      acc.totalErrores += stat.errores || 0;
      return acc;
    }, {
      totalTurnos: 0,
      totalHits: 0,
      totalCarreras: 0,
      totalImpulsadas: 0,
      totalHomeRuns: 0,
      totalBasesRobadas: 0,
      totalPonches: 0,
      totalBasePorBolas: 0,
      totalErrores: 0
    });

    const promedioBateo = totales.totalTurnos > 0 ? totales.totalHits / totales.totalTurnos : 0;
    const porcentajeEmbasado = totales.totalTurnos > 0 
      ? (totales.totalHits + totales.totalBasePorBolas) / (totales.totalTurnos + totales.totalBasePorBolas) 
      : 0;

    // Formatear juegos individuales
    const juegosPorJuego = estadisticas.map((stat: any) => ({
      juegoId: stat.juego_id,
      fecha: stat.juegos.fecha,
      equipoLocal: stat.juegos.equipos_local?.nombre || 'Desconocido',
      equipoVisitante: stat.juegos.equipos_visitante?.nombre || 'Desconocido',
      turnos: stat.turnos || 0,
      hits: stat.hits || 0,
      carreras: stat.carreras || 0,
      impulsadas: stat.impulsadas || 0,
      homeRuns: stat.home_runs || 0,
      basesRobadas: stat.bases_robadas || 0,
      ponches: stat.ponches || 0,
      basePorBolas: stat.base_por_bolas || 0,
      errores: stat.errores || 0
    }));

    return NextResponse.json({
      estadisticas: {
        ...totales,
        promedioBateo: parseFloat(promedioBateo.toFixed(3)),
        porcentajeEmbasado: parseFloat(porcentajeEmbasado.toFixed(3)),
        juegosPorJuego
      }
    });

  } catch (error) {
    console.error('Get detailed player stats error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}