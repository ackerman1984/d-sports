import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ gameId: string }> }
) {
  try {
    const { gameId } = await params;
    console.log('🎮 Obteniendo datos del juego:', gameId);
    
    const supabase = await createClient();
    const codigoAcceso = request.cookies.get('anotador_codigo')?.value;

    if (!codigoAcceso) {
      return NextResponse.json({ error: 'No hay sesión activa' }, { status: 401 });
    }

    // Verificar anotador
    console.log('👤 Buscando anotador con código:', codigoAcceso);
    const { data: anotador, error: anotadorError } = await supabase
      .from('anotadores')
      .select('id, nombre, liga_id')
      .eq('codigo_acceso', codigoAcceso)
      .single();

    console.log('👤 Anotador encontrado:', anotador, 'Error:', anotadorError?.message);

    if (anotadorError || !anotador) {
      console.log('❌ Anotador no encontrado o error:', anotadorError?.message);
      return NextResponse.json({ error: 'Sesión inválida' }, { status: 401 });
    }

    // Obtener datos del partido desde partidos_calendario
    const { data: partido, error: partidoError } = await supabase
      .from('partidos_calendario')
      .select(`
        id,
        fecha_programada,
        hora_programada,
        estado,
        marcador_local,
        marcador_visitante,
        equipo_local_id,
        equipo_visitante_id,
        temporada_id,
        configuracion_temporada:temporada_id (
          id,
          liga_id,
          nombre
        )
      `)
      .eq('id', gameId)
      .single();

    if (partidoError || !partido) {
      console.log('❌ Error obteniendo partido:', partidoError?.message);
      return NextResponse.json({ error: 'Partido no encontrado' }, { status: 404 });
    }

    // Verificar que el partido pertenece a la liga del anotador
    console.log('🔍 Verificando permisos de liga:');
    console.log('   - Anotador liga_id:', anotador.liga_id);
    console.log('   - Partido temporada liga_id:', (partido.configuracion_temporada as any)?.liga_id);
    
    const temporadaLigaId = (partido.configuracion_temporada as any)?.liga_id;
    
    if (temporadaLigaId !== anotador.liga_id) {
      console.log('❌ Liga mismatch detectado');
      return NextResponse.json({ 
        error: 'No tienes permiso para anotar este partido',
        debug: {
          anotador_liga: anotador.liga_id,
          partido_liga_temporada: temporadaLigaId
        }
      }, { status: 403 });
    }

    // Obtener equipos
    const { data: equipos, error: equiposError } = await supabase
      .from('equipos')
      .select('id, nombre')
      .in('id', [partido.equipo_local_id, partido.equipo_visitante_id]);

    if (equiposError) {
      console.log('❌ Error obteniendo equipos:', equiposError.message);
      return NextResponse.json({ error: 'Error obteniendo equipos' }, { status: 500 });
    }

    const equipoLocal = equipos?.find(e => e.id === partido.equipo_local_id);
    const equipoVisitante = equipos?.find(e => e.id === partido.equipo_visitante_id);

    // Obtener jugadores de ambos equipos
    console.log('🏃 Buscando jugadores para equipos:', [partido.equipo_local_id, partido.equipo_visitante_id]);
    const { data: jugadores, error: jugadoresError } = await supabase
      .from('jugadores')
      .select('id, nombre, numero_casaca, equipo_id')
      .in('equipo_id', [partido.equipo_local_id, partido.equipo_visitante_id])
      .order('numero_casaca', { ascending: true });

    console.log('👥 Jugadores encontrados:', jugadores?.length || 0, 'Error:', jugadoresError?.message);

    if (jugadoresError) {
      console.log('❌ Error obteniendo jugadores:', jugadoresError.message);
      console.log('📊 Detalles del error:', jugadoresError);
      // En lugar de fallar, continuamos sin jugadores por ahora
      console.log('⚠️ Continuando sin jugadores por el momento');
    }

    const jugadoresLocal = jugadores?.filter(j => j.equipo_id === partido.equipo_local_id) || [];
    const jugadoresVisitante = jugadores?.filter(j => j.equipo_id === partido.equipo_visitante_id) || [];

    // Obtener estadísticas existentes para este partido
    const { data: estadisticas, error: estadisticasError } = await supabase
      .from('estadisticas_jugador')
      .select('*')
      .eq('juego_id', gameId);

    // Construir fecha completa del partido
    const fechaCompleta = partido.fecha_programada && partido.hora_programada 
      ? `${partido.fecha_programada}T${partido.hora_programada}` 
      : partido.fecha_programada;

    const gameDataResponse = {
      id: partido.id,
      fecha: fechaCompleta,
      estado: partido.estado,
      marcador_local: partido.marcador_local || 0,
      marcador_visitante: partido.marcador_visitante || 0,
      equipo_local: {
        id: equipoLocal?.id,
        nombre: equipoLocal?.nombre || 'Equipo Local'
      },
      equipo_visitante: {
        id: equipoVisitante?.id, 
        nombre: equipoVisitante?.nombre || 'Equipo Visitante'
      },
      temporada: partido.configuracion_temporada,
      jugadores_local: jugadoresLocal.map(j => ({
        id: j.id,
        nombre: j.nombre,
        numero: j.numero_casaca,
        posicion: 'No especificada'
      })),
      jugadores_visitante: jugadoresVisitante.map(j => ({
        id: j.id,
        nombre: j.nombre,
        numero: j.numero_casaca,
        posicion: 'No especificada'
      })),
      estadisticas: estadisticas || []
    };

    console.log('✅ Datos del partido obtenidos exitosamente');
    return NextResponse.json(gameDataResponse);

  } catch (error) {
    console.error('💥 Error obteniendo datos del juego:', error);
    return NextResponse.json({ error: 'Error del servidor' }, { status: 500 });
  }
}