import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth-options';
import { createClient } from '@/lib/supabase/server';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verificar que el usuario sea anotador o admin
    if (!['admin', 'anotador'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const supabase = await createClient();
    const { id } = await params;
    
    // Obtener información del juego con equipos y jugadores
    const { data: juego, error: juegoError } = await supabase
      .from('juegos')
      .select(`
        *,
        equipoLocal:equipo_local_id (
          id,
          nombre,
          color,
          jugadores (
            id,
            nombre,
            numero_casaca,
            equipo_id
          )
        ),
        equipoVisitante:equipo_visitante_id (
          id,
          nombre,
          color,
          jugadores (
            id,
            nombre,
            numero_casaca,
            equipo_id
          )
        )
      `)
      .eq('id', id)
      .single();

    if (juegoError || !juego) {
      return NextResponse.json({ error: 'Game not found' }, { status: 404 });
    }

    // Obtener estadísticas existentes
    const { data: estadisticas } = await supabase
      .from('estadisticas_jugador')
      .select('*')
      .eq('juego_id', id);

    const response = {
      juego: {
        id: juego.id,
        fecha: juego.fecha,
        estado: juego.estado,
        marcadorLocal: juego.marcador_local || 0,
        marcadorVisitante: juego.marcador_visitante || 0,
        equipoLocal: {
          id: juego.equipoLocal.id,
          nombre: juego.equipoLocal.nombre,
          jugadores: juego.equipoLocal.jugadores || []
        },
        equipoVisitante: {
          id: juego.equipoVisitante.id,
          nombre: juego.equipoVisitante.nombre,
          jugadores: juego.equipoVisitante.jugadores || []
        }
      },
      estadisticas: estadisticas || []
    };

    return NextResponse.json(response, { status: 200 });

  } catch (error) {
    console.error('Get game stats error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verificar que el usuario sea anotador o admin
    if (!['admin', 'anotador'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { estadisticas } = body;

    if (!Array.isArray(estadisticas)) {
      return NextResponse.json({ error: 'Invalid statistics data' }, { status: 400 });
    }

    const supabase = await createClient();
    const { id } = await params;

    // Preparar datos para inserción/actualización
    const statsToUpsert = estadisticas.map((stat: any) => ({
      jugador_id: stat.jugadorId,
      juego_id: id,
      turnos: stat.turnos || 0,
      hits: stat.hits || 0,
      carreras: stat.carreras || 0,
      impulsadas: stat.impulsadas || 0,
      home_runs: stat.homeRuns || 0,
      bases_robadas: stat.basesRobadas || 0,
      ponches: stat.ponches || 0,
      base_por_bolas: stat.basePorBolas || 0,
      errores: stat.errores || 0,
      registrado_por: session.user.id,
    }));

    // Usar upsert para insertar o actualizar
    const { error: upsertError } = await supabase
      .from('estadisticas_jugador')
      .upsert(statsToUpsert, {
        onConflict: 'jugador_id,juego_id'
      });

    if (upsertError) {
      return NextResponse.json({ error: upsertError.message }, { status: 400 });
    }

    return NextResponse.json({ 
      message: 'Statistics saved successfully' 
    }, { status: 200 });

  } catch (error) {
    console.error('Save game stats error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}