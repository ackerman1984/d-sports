import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const codigoAcceso = request.cookies.get('anotador_codigo')?.value;

    if (!codigoAcceso) {
      return NextResponse.json({ error: 'No hay sesión activa' }, { status: 401 });
    }

    // Obtener datos del anotador
    const { data: anotador, error: anotadorError } = await supabase
      .from('anotadores')
      .select('id, liga_id')
      .eq('codigo_acceso', codigoAcceso)
      .single();

    if (anotadorError || !anotador) {
      return NextResponse.json({ error: 'Sesión inválida' }, { status: 401 });
    }

    // Verificar información de la liga del anotador
    console.log('🔍 Verificando liga del anotador:', anotador.liga_id);
    const { data: ligaInfo, error: ligaInfoError } = await supabase
      .from('ligas')
      .select('id, nombre, codigo_liga')
      .eq('id', anotador.liga_id)
      .single();
    
    console.log('🏟️ Liga del anotador:', ligaInfo, 'Error:', ligaInfoError);

    // Obtener las temporadas de la liga del anotador
    console.log('🔍 Buscando temporadas para liga:', anotador.liga_id);
    const { data: temporadas, error: temporadasError } = await supabase
      .from('configuracion_temporada')
      .select('id, nombre, estado')
      .eq('liga_id', anotador.liga_id)
      .eq('estado', 'generado');

    console.log('📅 Resultado temporadas:', { 
      count: temporadas?.length || 0, 
      error: temporadasError,
      data: temporadas 
    });

    if (temporadasError || !temporadas || temporadas.length === 0) {
      console.log('❌ No hay temporadas para la liga:', anotador.liga_id, temporadasError);
      return NextResponse.json({
        misJuegos: [],
        juegosDisponibles: [],
        debug: { temporadas: temporadas?.length || 0, ligaId: anotador.liga_id, error: temporadasError }
      });
    }

    const temporadaIds = temporadas.map(t => t.id);

    // Obtener partidos del calendario (sistema único)
    console.log('🎮 Buscando partidos con filtros:');
    console.log('   - liga_id:', anotador.liga_id);
    console.log('   - temporada_ids:', temporadaIds);
    
    const { data: partidosCalendario, error: partidosError } = await supabase
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
        temporada_id
      `)
      .in('temporada_id', temporadaIds)
      .not('es_bye', 'eq', true)
      .order('fecha_programada', { ascending: true });

    // Convertir partidos_calendario al formato esperado por el frontend
    const juegos = partidosCalendario?.map(partido => ({
      id: partido.id,
      fecha: partido.fecha_programada && partido.hora_programada 
        ? `${partido.fecha_programada}T${partido.hora_programada}` 
        : partido.fecha_programada,
      estado: partido.estado || 'programado',
      marcador_local: partido.marcador_local || 0,
      marcador_visitante: partido.marcador_visitante || 0,
      equipo_local_id: partido.equipo_local_id,
      equipo_visitante_id: partido.equipo_visitante_id,
      temporada_id: partido.temporada_id,
      liga_id: anotador.liga_id
    })) || [];

    console.log('🎯 Resultado búsqueda partidos:', {
      totalPartidos: partidosCalendario?.length || 0,
      error: partidosError?.message,
      muestra: juegos?.slice(0, 2)
    });

    if (partidosError) {
      console.error('Error obteniendo partidos:', partidosError);
      return NextResponse.json({ error: 'Error obteniendo partidos' }, { status: 500 });
    }

    if (!juegos || juegos.length === 0) {
      console.log('No hay partidos para las temporadas:', temporadaIds);
      return NextResponse.json({
        misJuegos: [],
        juegosDisponibles: [],
        debug: { temporadaIds, partidosEncontrados: juegos?.length || 0 }
      });
    }

    // Obtener datos relacionados
    const equipoIds = [...new Set([
      ...juegos.map(j => j.equipo_local_id).filter(Boolean),
      ...juegos.map(j => j.equipo_visitante_id).filter(Boolean)
    ])];

    const juegoIds = juegos.map(j => j.id);

    // Obtener equipos
    const { data: equipos } = await supabase
      .from('equipos')
      .select('id, nombre')
      .in('id', equipoIds);

    // Obtener asignaciones de anotadores
    const { data: asignaciones } = await supabase
      .from('anotador_juegos')
      .select(`
        id,
        juego_id,
        anotador_id,
        anotadores (
          id,
          nombre
        )
      `)
      .in('juego_id', juegoIds);

    // Obtener historial de estadísticas por juego para ver quién ha anotado
    const { data: historialEstadisticas } = await supabase
      .from('estadisticas_jugador')
      .select(`
        juego_id,
        registrado_por,
        created_at,
        updated_at,
        anotadores:registrado_por (
          id,
          nombre
        )
      `)
      .in('juego_id', juegoIds);

    // Crear mapas para facilitar búsqueda
    const equipoMap = new Map(equipos?.map(e => [e.id, e]) || []);
    const asignacionMap = new Map(asignaciones?.map(a => [a.juego_id, a]) || []);
    
    // Crear mapa de historial de estadísticas por juego
    const historialMap = new Map();
    historialEstadisticas?.forEach((est: any) => {
      if (!historialMap.has(est.juego_id)) {
        historialMap.set(est.juego_id, {
          anotadores: new Set(),
          ediciones: [],
          veces_editado: 0,
          ultima_edicion: null
        });
      }
      
      const historial = historialMap.get(est.juego_id);
      if (est.anotadores) {
        historial.anotadores.add(est.anotadores.nombre);
      }
      
      historial.ediciones.push({
        registrado_por: est.anotadores?.nombre || 'Desconocido',
        created_at: est.created_at,
        updated_at: est.updated_at
      });
      
      // Contar ediciones (cuando updated_at > created_at)
      if (est.updated_at && est.created_at && new Date(est.updated_at) > new Date(est.created_at)) {
        historial.veces_editado++;
      }
      
      // Última edición
      const fechaEdicion = new Date(est.updated_at || est.created_at);
      if (!historial.ultima_edicion || fechaEdicion > new Date(historial.ultima_edicion)) {
        historial.ultima_edicion = est.updated_at || est.created_at;
      }
    });

    // Organizar todos los juegos con información completa
    const todosLosJuegos: any[] = [];
    const ahora = new Date();
    const dosDiasEnMs = 2 * 24 * 60 * 60 * 1000; // 2 días en milisegundos

    juegos?.forEach((juego: any) => {
      // Construir fecha completa del partido
      let fechaPartido: Date;
      if (juego.fecha) {
        fechaPartido = new Date(juego.fecha);
      } else {
        return; // Saltar partidos sin fecha
      }

      // TEMPORAL: Todos los partidos están disponibles para demo al cliente
      // TODO: Restaurar ventana de 2 días después de la presentación
      const estaDisponible = true; // Siempre disponible para demo
      
      // Código original comentado para restaurar después:
      // const tiempoHastaPartido = fechaPartido.getTime() - ahora.getTime();
      // const tiempoDesdePardito = ahora.getTime() - fechaPartido.getTime();
      // const estaDisponible = (
      //   tiempoHastaPartido <= dosDiasEnMs && // Máximo 2 días antes
      //   tiempoDesdePardito <= dosDiasEnMs    // Máximo 2 días después
      // );

      const equipoLocal = equipoMap.get(juego.equipo_local_id);
      const equipoVisitante = equipoMap.get(juego.equipo_visitante_id);
      const asignacion = asignacionMap.get(juego.id);

      const juegoFormateado: any = {
        id: juego.id,
        fecha: fechaPartido.toISOString(),
        fecha_programada: fechaPartido.toISOString().split('T')[0],
        hora_programada: fechaPartido.toTimeString().slice(0,5),
        estado: juego.estado,
        marcador_local: juego.marcador_local || 0,
        marcador_visitante: juego.marcador_visitante || 0,
        disponible_para_anotar: estaDisponible,
        equipo_local: {
          id: equipoLocal?.id,
          nombre: equipoLocal?.nombre || 'Equipo Local'
        },
        equipo_visitante: {
          id: equipoVisitante?.id,
          nombre: equipoVisitante?.nombre || 'Equipo Visitante'
        },
        campo: {
          id: null,
          nombre: 'Campo Principal'
        },
        horario: {
          id: null,
          nombre: 'Horario Regular',
          hora_inicio: fechaPartido.toTimeString().slice(0,5),
          hora_fin: null
        }
      };

      // Determinar el estado del juego para este anotador
      let estadoParaAnotador = 'disponible'; // disponible, asignado_a_mi, asignado_a_otro, fuera_de_tiempo
      
      if (asignacion && asignacion.anotador_id === anotador.id) {
        estadoParaAnotador = 'asignado_a_mi';
        juegoFormateado.anotador_asignado = {
          id: asignacion.anotadores?.[0]?.id,
          nombre: asignacion.anotadores?.[0]?.nombre
        };
      } else if (asignacion) {
        estadoParaAnotador = 'asignado_a_otro';
        juegoFormateado.anotador_asignado = {
          id: asignacion.anotadores?.[0]?.id,
          nombre: asignacion.anotadores?.[0]?.nombre
        };
      } else if (!estaDisponible) {
        estadoParaAnotador = 'fuera_de_tiempo';
      }

      // Agregar información de estado y disponibilidad
      juegoFormateado.estado_para_anotador = estadoParaAnotador;
      juegoFormateado.puede_asignarse = (estadoParaAnotador === 'disponible' && estaDisponible);
      juegoFormateado.puede_anotar = (estadoParaAnotador === 'asignado_a_mi');
      
      // Agregar información de historial real
      const historialJuego = historialMap.get(juego.id);
      juegoFormateado.historial_anotacion = {
        veces_editado: historialJuego?.veces_editado || 0,
        ultima_edicion: historialJuego?.ultima_edicion || null,
        anotadores_que_editaron: historialJuego ? Array.from(historialJuego.anotadores) : [],
        total_ediciones: historialJuego?.ediciones.length || 0,
        tiene_estadisticas: historialJuego ? historialJuego.ediciones.length > 0 : false,
        detalle_ediciones: historialJuego?.ediciones || []
      };

      // Agregar todos los juegos al array principal
      todosLosJuegos.push(juegoFormateado);
    });

    // Organizar juegos por categorías para mejor visualización
    const misJuegos = todosLosJuegos.filter(j => j.estado_para_anotador === 'asignado_a_mi');
    const juegosDisponibles = todosLosJuegos.filter(j => j.puede_asignarse);
    const juegosAsignados = todosLosJuegos.filter(j => j.estado_para_anotador === 'asignado_a_otro');
    const juegosFueraTiempo = todosLosJuegos.filter(j => j.estado_para_anotador === 'fuera_de_tiempo');

    console.log(`Partidos procesados: ${juegos.length}, Total organizados: ${todosLosJuegos.length}`);
    
    return NextResponse.json({
      todosLosJuegos: todosLosJuegos.sort((a, b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime()),
      misJuegos,
      juegosDisponibles,
      juegosAsignados,
      juegosFueraTiempo,
      estadisticas: {
        total: todosLosJuegos.length,
        misJuegos: misJuegos.length,
        disponibles: juegosDisponibles.length,
        asignados: juegosAsignados.length,
        fueraTiempo: juegosFueraTiempo.length
      },
      debug: {
        totalPartidos: juegos.length,
        temporadaIds,
        anotadorId: anotador.id
      }
    });

  } catch (error) {
    console.error('Error obteniendo juegos disponibles:', error);
    return NextResponse.json({ error: 'Error del servidor' }, { status: 500 });
  }
}