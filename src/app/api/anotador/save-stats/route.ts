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

    const { gameId, jugadorId, entrada, accion, carrera, rbis, marcadorLocal, marcadorVisitante } = await request.json();

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

    // Calcular nuevas estadísticas de bateo solamente
    const nuevasStats = calcularEstadisticasBateo(accion, estadisticaExistente, rbis || 0);

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

function calcularEstadisticasBateo(accion: string, estadisticaExistente: any, rbisNuevos: number = 0) {
  const base = estadisticaExistente || {
    turnos: 0,           // Solo turnos al bat (AB - At Bats)
    hits: 0,
    carreras: 0,
    impulsadas: 0,       // RBIs
    home_runs: 0,
    bases_robadas: 0,
    ponches: 0,          // Ponches como bateador
    base_por_bolas: 0,   // Bases por bolas como bateador
    ibb: 0,              // Bases por bolas intencionales
    errores: 0,
    h1: 0,
    h2: 0,
    h3: 0,
    promedio_bateo: 0.000,  // Promedio de bateo
    juegos_jugados: 0       // Juegos jugados (siempre 1 por registro)
  };

  const nuevaStats = { ...base };

  // IMPORTANTE: Incrementar turnos SOLO para acciones de bateo válidas
  // Un turno al bat se cuenta cuando el bateador tiene la oportunidad de batear
  // NO se cuenta para BB, HBP, SF (sacrifice fly), SH (sacrifice hit/bunt), CI (catcher interference), IBB
  if (!['BB', 'HBP', 'SF', 'SH', 'CI', 'IBB'].includes(accion)) {
    nuevaStats.turnos++;
    console.log(`📊 BATEO: Incrementando turno para ${accion}. Total: ${nuevaStats.turnos}`);
  } else {
    console.log(`📊 BATEO: NO incrementando turno para ${accion} (no cuenta como AB)`);
  }

  // Calcular estadísticas específicas por acción de BATEO
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
      nuevaStats.carreras++; // El bateador siempre anota una carrera en HR
      break;
    case 'K':
      nuevaStats.ponches++; // Ponche como bateador
      break;
    case 'BB':
      nuevaStats.base_por_bolas++; // Base por bolas como bateador
      break;
    case 'IBB':
      nuevaStats.ibb++; // Base por bolas intencional
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
    // Interferencias
    case 'BI':
      // Batter Interference - Se cuenta como AB pero es OUT
      break;
    case 'CI':
      // Catcher Interference - NO cuenta como AB, bateador va a primera
      break;
    case 'RI':
      // Runner Interference - No afecta estadísticas del bateador
      break;
    case 'Fan INT':
    case 'Coach INT':
      // No afectan estadísticas del bateador
      break;
    // Outs por fildeo (no afectan estadísticas de bateo principales)
    case 'O':
    case '4-3':
    case '5-3': 
    case '6-3':
    case 'F7':
    case 'F8':
    case 'F6':
    case 'Fly':
      // Estos ya incrementaron turnos arriba, no necesitan estadística adicional
      break;
  }

  // Agregar RBIs calculados desde el frontend (corredores impulsados)
  if (rbisNuevos > 0) {
    nuevaStats.impulsadas += rbisNuevos;
    console.log(`📊 BATEO: Agregando ${rbisNuevos} RBIs. Total: ${nuevaStats.impulsadas}`);
  }

  // Calcular promedio de bateo actualizado
  if (nuevaStats.turnos > 0) {
    nuevaStats.promedio_bateo = parseFloat((nuevaStats.hits / nuevaStats.turnos).toFixed(3));
  } else {
    nuevaStats.promedio_bateo = 0.000;
  }

  // Establecer juegos jugados (cada registro = 1 juego)
  nuevaStats.juegos_jugados = 1;

  console.log(`📊 BATEO Final para ${accion}:`, {
    turnos: nuevaStats.turnos,
    hits: nuevaStats.hits,
    carreras: nuevaStats.carreras,
    impulsadas: nuevaStats.impulsadas,
    promedio_bateo: nuevaStats.promedio_bateo,
    juegos_jugados: nuevaStats.juegos_jugados
  });

  return nuevaStats;
}