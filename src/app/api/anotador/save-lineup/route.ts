import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const body = await request.json();
    const { gameId, team, lineup, positions } = body;

    console.log('💾 Guardando lineup:', { gameId, team, lineup, positions });

    // Verificar que tenemos los datos necesarios
    if (!gameId || !team) {
      return NextResponse.json({ error: 'gameId y team son requeridos' }, { status: 400 });
    }

    // Por ahora, solo confirmar que se recibieron los datos correctamente
    // La configuración del lineup se mantendrá en el frontend hasta que se implemente la tabla dedicada
    try {
      console.log('📋 Configuración del lineup recibida:', {
        gameId,
        team,
        jugadores: Object.keys(lineup || {}).length,
        posiciones: Object.keys(positions || {}).length
      });

      // Crear registros iniciales de estadísticas para cada jugador en el lineup
      if (lineup && Object.keys(lineup).length > 0) {
        for (const [position, player] of Object.entries(lineup)) {
          if (player && typeof player === 'object' && 'id' in player) {
            const typedPlayer = player as { id: string; nombre: string };
            console.log(`📋 Preparando estadísticas para ${typedPlayer.nombre} en posición ${parseInt(position) + 1}`);
            
            // Verificar si el jugador ya tiene estadísticas para este juego
            const { data: existingStats } = await supabase
              .from('estadisticas_jugadores')
              .select('*')
              .eq('juego_id', gameId)
              .eq('jugador_id', typedPlayer.id)
              .single();

            if (!existingStats) {
              // Crear estadísticas iniciales para el jugador
              const { error: statsError } = await supabase
                .from('estadisticas_jugadores')
                .insert({
                  juego_id: gameId,
                  jugador_id: typedPlayer.id,
                  turnos: 0,
                  hits: 0,
                  carreras: 0,
                  impulsadas: 0,
                  home_runs: 0,
                  bases_robadas: 0,
                  ponches: 0,
                  base_por_bolas: 0,
                  errores: 0
                });

              if (statsError) {
                console.error(`⚠️ Error creando estadísticas para ${typedPlayer.nombre}:`, statsError);
              } else {
                console.log(`✅ Estadísticas iniciales creadas para ${typedPlayer.nombre}`);
              }
            } else {
              console.log(`📊 ${typedPlayer.nombre} ya tiene estadísticas en este juego`);
            }
          }
        }
      }

      return NextResponse.json({ 
        message: 'Lineup procesado exitosamente',
        playersConfigured: Object.keys(lineup || {}).length
      });

    } catch (error) {
      console.error('❌ Error procesando lineup:', error);
      return NextResponse.json({ error: 'Error procesando lineup' }, { status: 500 });
    }

    console.log('✅ Lineup guardado exitosamente');
    return NextResponse.json({ message: 'Lineup guardado exitosamente' });

  } catch (error) {
    console.error('❌ Error en save-lineup:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}