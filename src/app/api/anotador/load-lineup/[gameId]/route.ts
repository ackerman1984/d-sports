import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

interface RouteContext {
  params: Promise<{ gameId: string }>;
}

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const supabase = await createClient();
    const { gameId } = await context.params;
    const { searchParams } = new URL(request.url);
    const team = searchParams.get('team');

    console.log('📂 Cargando lineup guardado:', { gameId, team });

    // Verificar parámetros
    if (!gameId || !team) {
      return NextResponse.json({ error: 'gameId y team son requeridos' }, { status: 400 });
    }

    // Por ahora, la configuración del lineup se mantendrá en el frontend
    // Cuando se implemente la tabla dedicada, se cargará desde la base de datos
    console.log('📄 Configuración del lineup se mantiene en el frontend por ahora');
    
    const lineupConfig = {
      jugadores_seleccionados: {},
      posiciones_asignadas: {}
    };

    // Cargar datos de las entradas guardadas
    const { data: inningData, error: inningError } = await supabase
      .from('estadisticas_jugadores')
      .select('*')
      .eq('juego_id', gameId);

    if (inningError) {
      console.error('❌ Error cargando datos de entradas:', inningError);
    }

    // Cargar marcadores guardados (podemos usar la tabla de juegos si existe)
    const { data: scoreData, error: scoreError } = await supabase
      .from('partidos_calendario')
      .select('marcador_local, marcador_visitante')
      .eq('id', gameId)
      .single();

    if (scoreError) {
      console.error('❌ Error cargando marcadores:', scoreError);
    }

    // Construir respuesta
    const response: any = {};

    if (lineupConfig) {
      response.lineup = lineupConfig.jugadores_seleccionados || {};
      response.positions = lineupConfig.posiciones_asignadas || {};
    }

    // Procesar datos de entradas si existen
    if (inningData && inningData.length > 0) {
      const processedInningData: any = {};
      inningData.forEach((stat: any) => {
        if (!processedInningData[stat.jugador_id]) {
          processedInningData[stat.jugador_id] = {};
        }
        processedInningData[stat.jugador_id][stat.entrada] = {
          accion: stat.accion,
          bases: stat.bases || [],
          carrera: stat.carrera || false,
          detalle: stat.detalle
        };
      });
      response.inningData = processedInningData;
    }

    // Procesar marcadores si existen
    if (scoreData) {
      response.scores = {
        local: {1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0, 8: 0, 9: 0}, // Se puede expandir más tarde
        visitante: {1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0, 8: 0, 9: 0}
      };
    }

    console.log('✅ Lineup cargado exitosamente');
    return NextResponse.json(response);

  } catch (error) {
    console.error('❌ Error en load-lineup:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}