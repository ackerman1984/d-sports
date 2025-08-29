import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(request: NextRequest) {
  try {
    console.log('⚾ Guardando estadísticas de pitcher');
    
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
    
    const codigoAcceso = request.cookies.get('anotador_codigo')?.value;
    if (!codigoAcceso) {
      return NextResponse.json({ error: 'No hay sesión activa' }, { status: 401 });
    }

    const { gameId, jugadorId, accion, lanzamientos, strikes, bolas } = await request.json();

    if (!gameId || !jugadorId || !accion) {
      return NextResponse.json({ 
        error: 'Datos incompletos: se requiere gameId, jugadorId y accion' 
      }, { status: 400 });
    }

    // Verificar anotador
    const { data: anotador, error: anotadorError } = await supabase
      .from('anotadores')
      .select('id, nombre, liga_id')
      .eq('codigo_acceso', codigoAcceso)
      .single();

    if (anotadorError || !anotador) {
      return NextResponse.json({ error: 'Sesión inválida' }, { status: 401 });
    }

    // Buscar estadística de pitcher existente
    const { data: estadisticaExistente, error: buscarError } = await supabase
      .from('estadisticas_pitcher')
      .select('*')
      .eq('juego_id', gameId)
      .eq('jugador_id', jugadorId)
      .single();

    if (buscarError && buscarError.code !== 'PGRST116') {
      console.log('⚠️ Error buscando estadística pitcher:', buscarError.message);
    }

    // Calcular nuevas estadísticas de pitcher
    const nuevasStats = calcularEstadisticasPitcher(accion, estadisticaExistente, { lanzamientos, strikes, bolas });

    let resultado;
    if (estadisticaExistente) {
      // Actualizar estadística existente
      console.log('📝 Actualizando estadística pitcher:', nuevasStats);

      const { data: statsActualizadas, error: updateError } = await supabase
        .from('estadisticas_pitcher')
        .update(nuevasStats)
        .eq('id', estadisticaExistente.id)
        .select()
        .single();

      if (updateError) {
        console.error('❌ Error actualizando estadísticas pitcher:', updateError);
        return NextResponse.json({ 
          error: `Error actualizando estadísticas pitcher: ${updateError.message}` 
        }, { status: 500 });
      }
      resultado = statsActualizadas;
    } else {
      // Crear nueva estadística
      console.log('📝 Creando nueva estadística pitcher:', nuevasStats);

      const { data: nuevaStats, error: insertError } = await supabase
        .from('estadisticas_pitcher')
        .insert({
          juego_id: gameId,
          jugador_id: jugadorId,
          liga_id: anotador.liga_id,
          ...nuevasStats
        })
        .select()
        .single();

      if (insertError) {
        console.error('❌ Error creando estadísticas pitcher:', insertError);
        return NextResponse.json({ 
          error: `Error creando estadísticas pitcher: ${insertError.message}` 
        }, { status: 500 });
      }
      resultado = nuevaStats;
    }

    console.log('✅ Estadísticas pitcher guardadas exitosamente');
    return NextResponse.json({
      message: 'Estadísticas pitcher guardadas exitosamente',
      estadistica: resultado,
      accion: accion
    });

  } catch (error) {
    console.error('💥 Error guardando estadísticas pitcher:', error);
    return NextResponse.json({ error: 'Error del servidor' }, { status: 500 });
  }
}

function calcularEstadisticasPitcher(accion: string, estadisticaExistente: any, contadores: any = {}) {
  const base = estadisticaExistente || {
    lanzamientos: 0,
    strikes: 0,
    bolas: 0,
    ponches: 0,
    bases_por_bolas: 0,
    golpes_bateador: 0,
    balk: 0,
    carreras_permitidas: 0,
    hits_permitidos: 0,
    innings_lanzados: 0
  };

  const nuevaStats = { ...base };

  // Incrementar contadores básicos si se proporcionan
  if (contadores.lanzamientos) nuevaStats.lanzamientos += contadores.lanzamientos;
  if (contadores.strikes) nuevaStats.strikes += contadores.strikes;
  if (contadores.bolas) nuevaStats.bolas += contadores.bolas;

  // Estadísticas específicas por acción
  switch (accion) {
    case 'STRIKE_PITCH':
      nuevaStats.lanzamientos += 1;
      nuevaStats.strikes += 1;
      break;
    case 'BALL_PITCH':
      nuevaStats.lanzamientos += 1;
      nuevaStats.bolas += 1;
      break;
    case 'K_P':
      nuevaStats.ponches += 1;
      break;
    case 'BB_P':
      nuevaStats.bases_por_bolas += 1;
      break;
    case 'HBP':
      nuevaStats.golpes_bateador += 1;
      nuevaStats.lanzamientos += 1;
      break;
    case 'BK':
      nuevaStats.balk += 1;
      break;
  }

  return nuevaStats;
}