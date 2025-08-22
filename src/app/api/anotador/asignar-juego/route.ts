import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    console.log('🔥 API: Iniciando asignación de juego');
    const supabase = await createClient();
    const codigoAcceso = request.cookies.get('anotador_codigo')?.value;

    console.log('🔍 Código de acceso:', codigoAcceso ? 'Presente' : 'Ausente');

    if (!codigoAcceso) {
      console.log('❌ No hay código de acceso');
      return NextResponse.json({ error: 'No hay sesión activa' }, { status: 401 });
    }

    const { juegoId } = await request.json();
    console.log('🎯 Juego ID recibido:', juegoId);

    if (!juegoId) {
      console.log('❌ ID de juego faltante');
      return NextResponse.json({ error: 'ID de juego requerido' }, { status: 400 });
    }

    // Obtener datos del anotador
    console.log('👤 Buscando anotador con código:', codigoAcceso);
    const { data: anotador, error: anotadorError } = await supabase
      .from('anotadores')
      .select('id, liga_id, nombre')
      .eq('codigo_acceso', codigoAcceso)
      .single();

    if (anotadorError || !anotador) {
      console.log('❌ Error obteniendo anotador:', anotadorError?.message);
      return NextResponse.json({ error: 'Sesión inválida' }, { status: 401 });
    }

    console.log('✅ Anotador encontrado:', anotador.nombre, 'Liga:', anotador.liga_id);

    // Verificar que el partido existe y pertenece a la liga del anotador
    console.log('🎮 Buscando partido:', juegoId);
    const { data: partido, error: partidoError } = await supabase
      .from('partidos_calendario')
      .select('id, estado, fecha_programada, hora_programada, temporada_id')
      .eq('id', juegoId)
      .single();

    if (partidoError) {
      console.log('❌ Error buscando partido:', partidoError.message);
      return NextResponse.json({ error: 'Partido no encontrado - ' + partidoError.message }, { status: 404 });
    }

    if (!partido) {
      console.log('❌ Partido no encontrado');
      return NextResponse.json({ error: 'Partido no encontrado' }, { status: 404 });
    }

    console.log('✅ Partido encontrado:', partido.id, 'Estado:', partido.estado);

    // Verificar que el partido pertenece a una temporada de la liga del anotador
    const { data: temporada } = await supabase
      .from('configuracion_temporada')
      .select('liga_id')
      .eq('id', partido.temporada_id)
      .single();

    if (!temporada || temporada.liga_id !== anotador.liga_id) {
      console.log('❌ Partido no pertenece a la liga del anotador');
      return NextResponse.json({ 
        error: 'Partido no pertenece a tu liga' 
      }, { status: 403 });
    }

    // Verificar que el partido no esté finalizado
    if (partido.estado === 'finalizado') {
      return NextResponse.json({ error: 'No se puede asignar a un partido finalizado' }, { status: 400 });
    }

    // TEMPORAL: Saltar verificación de ventana de tiempo para demo al cliente
    // TODO: Restaurar verificación de 2 días después de la presentación
    console.log('⚠️ MODO DEMO: Partidos disponibles sin restricción de tiempo');
    
    // Código original comentado para restaurar después:
    // const fechaPartido = new Date(partido.fecha_programada + (partido.hora_programada ? `T${partido.hora_programada}` : ''));
    // const ahora = new Date();
    // const dosDiasEnMs = 2 * 24 * 60 * 60 * 1000;
    // const tiempoHastaPartido = fechaPartido.getTime() - ahora.getTime();
    // 
    // if (tiempoHastaPartido > dosDiasEnMs) {
    //   return NextResponse.json({ error: 'Este partido estará disponible 2 días antes de la fecha programada' }, { status: 400 });
    // }

    // Verificar que el juego no tenga ya un anotador asignado
    const { data: asignacionExistente, error: asignacionError } = await supabase
      .from('anotador_juegos')
      .select('id')
      .eq('juego_id', juegoId)
      .single();

    if (asignacionExistente) {
      return NextResponse.json({ error: 'Este juego ya tiene un anotador asignado' }, { status: 400 });
    }

    // Crear la asignación
    console.log('💾 Creando asignación para anotador:', anotador.id, 'juego:', juegoId);
    const { data: nuevaAsignacion, error: insertError } = await supabase
      .from('anotador_juegos')
      .insert({
        juego_id: juegoId,
        anotador_id: anotador.id,
        fecha_asignacion: new Date().toISOString()
      })
      .select()
      .single();

    if (insertError) {
      console.error('❌ Error creando asignación:', insertError);
      return NextResponse.json({ 
        error: 'Error asignando juego: ' + insertError.message,
        details: insertError 
      }, { status: 500 });
    }

    console.log('✅ Asignación creada exitosamente:', nuevaAsignacion.id);

    return NextResponse.json({
      message: 'Te has asignado al juego exitosamente',
      asignacion: nuevaAsignacion
    });

  } catch (error) {
    console.error('Error asignando juego:', error);
    return NextResponse.json({ error: 'Error del servidor' }, { status: 500 });
  }
}