import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(request: NextRequest) {
  try {
    console.log('📊 Guardando estadísticas de juego');
    
    // Crear cliente de Supabase con service role para tener permisos completos
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
    const codigoAcceso = request.cookies.get('anotador_codigo')?.value;

    if (!codigoAcceso) {
      return NextResponse.json({ error: 'No hay sesión activa' }, { status: 401 });
    }

    const { gameId, jugadorId, entrada, accion, carrera, rbis, marcadorLocal, marcadorVisitante, pitches, isPitcherStat } = await request.json();

    if (!gameId || !jugadorId || !entrada || !accion) {
      return NextResponse.json({ 
        error: 'Datos incompletos: se requiere gameId, jugadorId, entrada y accion' 
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

    // Verificar que el anotador esté asignado a este juego (DESHABILITADO PARA DEMO)
    // Para demo, permitir que cualquier anotador pueda trabajar en cualquier juego
    console.log('🔄 Verificación de asignación deshabilitada para demo');

    // Buscar o crear estadística del jugador para este juego
    console.log('🔍 Buscando estadística:', { gameId, jugadorId });
    const { data: estadisticaExistente, error: buscarError } = await supabase
      .from('estadisticas_jugadores')
      .select('*')
      .eq('juego_id', gameId)
      .eq('jugador_id', jugadorId)
      .single();

    console.log('🔍 Estadística existente:', estadisticaExistente ? 'Sí' : 'No');
    if (buscarError) console.log('⚠️ Error buscando estadística:', buscarError.message);

    // Calcular nuevas estadísticas basadas en la acción
    const nuevasStats = calcularEstadisticas(accion, estadisticaExistente, rbis || 0, pitches || 0, isPitcherStat);

    let resultado;
    if (estadisticaExistente) {
      // Actualizar estadística existente
      console.log('📝 Actualizando estadística existente:', {
        id: estadisticaExistente.id,
        ...nuevasStats
      });

      const { data: statsActualizadas, error: updateError } = await supabase
        .from('estadisticas_jugadores')
        .update({
          ...nuevasStats
        })
        .eq('id', estadisticaExistente.id)
        .select()
        .single();

      if (updateError) {
        console.error('❌ Error actualizando estadísticas:', updateError);
        console.error('❌ Detalles del error:', updateError.details);
        console.error('❌ Mensaje completo:', updateError.message);
        return NextResponse.json({ 
          error: `Error actualizando estadísticas: ${updateError.message}` 
        }, { status: 500 });
      }
      resultado = statsActualizadas;
    } else {
      // Crear nueva estadística
      console.log('📝 Creando nueva estadística:', {
        juego_id: gameId,
        jugador_id: jugadorId,
        ...nuevasStats
      });

      const { data: nuevaStats, error: insertError } = await supabase
        .from('estadisticas_jugadores')
        .insert({
          juego_id: gameId,
          jugador_id: jugadorId,
          ...nuevasStats
        })
        .select()
        .single();

      if (insertError) {
        console.error('❌ Error creando estadísticas:', insertError);
        console.error('❌ Detalles del error:', insertError.details);
        console.error('❌ Mensaje completo:', insertError.message);
        console.error('❌ Código de error:', insertError.code);
        return NextResponse.json({ 
          error: `Error creando estadísticas: ${insertError.message}` 
        }, { status: 500 });
      }
      resultado = nuevaStats;
    }

    // Actualizar marcador del juego si se proporcionó
    if (marcadorLocal !== undefined && marcadorVisitante !== undefined) {
      const { error: updateJuegoError } = await supabase
        .from('partidos_calendario')
        .update({
          marcador_local: marcadorLocal,
          marcador_visitante: marcadorVisitante,
          updated_at: new Date().toISOString()
        })
        .eq('id', gameId);

      if (updateJuegoError) {
        console.log('⚠️ Error actualizando marcador:', updateJuegoError.message);
      }
    }

    console.log('✅ Estadísticas guardadas exitosamente');
    return NextResponse.json({
      message: 'Estadísticas guardadas exitosamente',
      estadistica: resultado,
      accion: accion,
      entrada: entrada
    });

  } catch (error) {
    console.error('💥 Error guardando estadísticas:', error);
    return NextResponse.json({ error: 'Error del servidor' }, { status: 500 });
  }
}

function calcularEstadisticas(accion: string, estadisticaExistente: any, rbisNuevos: number = 0, pitchesNuevos: number = 0, isPitcherStat: boolean = false) {
  const base = estadisticaExistente || {
    turnos: 0,
    hits: 0,
    carreras: 0,
    impulsadas: 0,
    home_runs: 0,
    bases_robadas: 0,
    ponches: 0,
    base_por_bolas: 0,
    errores: 0,
    h1: 0,
    h2: 0,
    h3: 0,
    // Estadísticas de pitcher
    lanzamientos: 0,
    ponches_pitcher: 0,
    bases_por_bolas_pitcher: 0,
    golpes_bateador: 0,
    balk: 0
  };

  const nuevaStats = { ...base };

  // Incrementar turnos para la mayoría de acciones (excepto BB y HBP)
  if (!['BB', 'HBP', 'SF', 'SH'].includes(accion)) {
    nuevaStats.turnos++;
  }

  // Calcular estadísticas específicas por acción
  switch (accion) {
    case '1B':
    case 'H1':
      nuevaStats.hits++;
      nuevaStats.h1++;
      break;
    case '2B': 
    case 'H2':
      nuevaStats.hits++;
      nuevaStats.h2++;
      break;
    case '3B':
    case 'H3':
      nuevaStats.hits++;
      nuevaStats.h3++;
      break;
    case 'HR':
      nuevaStats.hits++;
      nuevaStats.home_runs++;
      nuevaStats.carreras++; // El bateador siempre anota una carrera
      // Las RBIs (impulsadas) se calculan por separado basándose en corredores en base
      break;
    case 'K':
      nuevaStats.ponches++;
      break;
    case 'BB':
      nuevaStats.base_por_bolas++;
      break;
    case 'C':
      nuevaStats.carreras++;
      break;
    case 'RBI':
      nuevaStats.impulsadas++;
      break;
    case 'SB':
      nuevaStats.bases_robadas++;
      break;
    case 'E':
      nuevaStats.errores++;
      break;
  }

  // Agregar RBIs calculados desde el frontend
  if (rbisNuevos > 0) {
    nuevaStats.impulsadas += rbisNuevos;
  }

  // Agregar estadísticas de pitcher
  if (pitchesNuevos > 0) {
    nuevaStats.lanzamientos += pitchesNuevos;
  }

  // Estadísticas específicas de pitcher
  if (isPitcherStat) {
    switch (accion) {
      case 'K_P':
        nuevaStats.ponches_pitcher++;
        break;
      case 'BB_P':
        nuevaStats.bases_por_bolas_pitcher++;
        break;
      case 'HBP':
        nuevaStats.golpes_bateador++;
        nuevaStats.lanzamientos++; // HBP cuenta como lanzamiento
        break;
      case 'BK':
        nuevaStats.balk++;
        break;
      case 'PITCH':
      case 'STRIKE_PITCH':
      case 'BALL_PITCH':
        // Solo incrementar lanzamientos (ya se hace arriba con pitchesNuevos)
        break;
    }
  }

  return nuevaStats;
}