import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth-options';
import { createClient } from '@/lib/supabase/server';
import { RoundRobinGenerator } from '@/lib/calendar/round-robin-generator';
import { ScheduleGenerator } from '@/lib/calendar/schedule-generator';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ temporadaId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { temporadaId } = await params;
    
    if (!temporadaId) {
      return NextResponse.json({ error: 'Temporada ID requerido' }, { status: 400 });
    }

    const supabase = await createClient();
    const ligaId = session.user.ligaId;
    
    if (!ligaId) {
      return NextResponse.json({ error: 'Usuario sin liga asignada' }, { status: 400 });
    }

    // 1. Obtener configuración de la temporada
    const { data: temporada, error: temporadaError } = await supabase
      .from('configuracion_temporada')
      .select('*')
      .eq('id', temporadaId)
      .eq('liga_id', ligaId)
      .single();

    if (temporadaError || !temporada) {
      return NextResponse.json({ error: 'Temporada no encontrada' }, { status: 404 });
    }

    if (temporada.estado === 'generado') {
      return NextResponse.json({ 
        error: 'El calendario ya ha sido generado para esta temporada' 
      }, { status: 400 });
    }

    // 2. Obtener equipos de la liga
    const { data: equipos, error: equiposError } = await supabase
      .from('equipos')
      .select('id, nombre, logo_url')
      .eq('liga_id', ligaId)
      .eq('activo', true)
      .order('nombre');

    if (equiposError || !equipos || equipos.length < 2) {
      return NextResponse.json({ 
        error: 'Se necesitan al menos 2 equipos activos para generar el calendario' 
      }, { status: 400 });
    }

    // 3. Obtener campos disponibles
    const { data: campos, error: camposError } = await supabase
      .from('campos')
      .select('*')
      .eq('liga_id', ligaId)
      .eq('activo', true)
      .order('orden');

    if (camposError || !campos || campos.length === 0) {
      return NextResponse.json({ 
        error: 'Se necesita al menos un campo activo para generar el calendario' 
      }, { status: 400 });
    }

    // 4. Obtener horarios disponibles
    const { data: horarios, error: horariosError } = await supabase
      .from('horarios')
      .select('*')
      .eq('liga_id', ligaId)
      .eq('activo_por_defecto', true)
      .order('orden');

    if (horariosError || !horarios || horarios.length === 0) {
      return NextResponse.json({ 
        error: 'Se necesita al menos un horario activo para generar el calendario' 
      }, { status: 400 });
    }

    // 5. Generar Round Robin
    const configuracionRoundRobin = {
      equipos: equipos.map((equipo: any) => ({
        id: equipo.id,
        nombre: equipo.nombre,
        activo: true // Todos los equipos que llegan aquí están activos
      })),
      vueltas: temporada.vueltas_programadas || 2,
      alternarLocalVisitante: true // Alternar local/visitante entre vueltas
    };

    const resultadoRoundRobin = RoundRobinGenerator.generar(configuracionRoundRobin);

    if (!resultadoRoundRobin.exito) {
      return NextResponse.json({ 
        error: `Error generando Round Robin: ${resultadoRoundRobin.error}` 
      }, { status: 500 });
    }

    // 6. Asignar fechas y horarios
    const configuracionJornadas = {
      fechaInicio: new Date(temporada.fecha_inicio),
      fechaFin: new Date(temporada.fecha_fin),
      maxJuegosPorSabado: temporada.max_juegos_por_sabado || 5,
      campos: campos.map((campo: any) => ({
        id: campo.id,
        nombre: campo.nombre,
        activo: campo.activo,
        orden: campo.orden
      })),
      horarios: horarios.map((horario: any) => ({
        id: horario.id,
        nombre: horario.nombre,
        horaInicio: horario.hora_inicio,
        horaFin: horario.hora_fin,
        activoPorDefecto: horario.activo_por_defecto,
        orden: horario.orden
      })),
      sabadosEspeciales: [], // Por ahora array vacío
      semanasFlexCada: 0 // Deshabilitar semanas flex por ahora
    };

    const resultadoJornadas = ScheduleGenerator.generar(
      resultadoRoundRobin.rondas!,
      configuracionJornadas
    );

    if (!resultadoJornadas.exito) {
      return NextResponse.json({ 
        error: `Error asignando fechas: ${resultadoJornadas.error}` 
      }, { status: 500 });
    }

    // 7. Limpiar calendario existente (si existe)
    console.log('🧹 Limpiando calendario existente...');
    
    // Eliminar juegos existentes (para anotadores)
    const { error: deleteJuegosError } = await supabase
      .from('juegos')
      .delete()
      .eq('temporada_id', temporadaId);
    
    if (deleteJuegosError) {
      console.log('⚠️ Error eliminando juegos:', deleteJuegosError.message);
    }
    
    // Eliminar partidos existentes
    const { error: deletePartidosError } = await supabase
      .from('partidos_calendario')
      .delete()
      .eq('temporada_id', temporadaId);
    
    if (deletePartidosError) {
      console.log('⚠️ Error eliminando partidos:', deletePartidosError.message);
    }
    
    // Eliminar jornadas existentes  
    const { error: deleteJornadasError } = await supabase
      .from('jornadas')
      .delete()
      .eq('temporada_id', temporadaId);
    
    if (deleteJornadasError) {
      console.log('⚠️ Error eliminando jornadas:', deleteJornadasError.message);
    }
    
    console.log('✅ Calendario anterior eliminado');

    // 8. Guardar nuevo calendario en base de datos
    
    try {
      // Crear jornadas
      for (const jornada of resultadoJornadas.jornadas!) {
        const { data: jornadaCreada, error: jornadaError } = await supabase
          .from('jornadas')
          .insert({
            temporada_id: temporadaId,
            numero_jornada: jornada.numero,
            fecha: jornada.fecha.toISOString().split('T')[0],
            vuelta: 1, // Por ahora vuelta fija
            tipo: 'regular',
            estado: 'programada',
            capacidad_maxima: 5,
            partidos_programados: jornada.partidos.length
          })
          .select()
          .single();

        if (jornadaError) {
          throw new Error(`Error creando jornada ${jornada.numero}: ${jornadaError.message}`);
        }

        // Crear partidos de la jornada
        for (const partido of jornada.partidos) {
          const { error: partidoError } = await supabase
            .from('partidos_calendario')
            .insert({
              jornada_id: jornadaCreada.id,
              temporada_id: temporadaId,
              equipo_local_id: partido.equipoLocal.id,
              equipo_visitante_id: partido.equipoVisitante?.id || null,
              campo_id: partido.campo?.id || null,
              horario_id: partido.horario?.id || null,
              numero_partido: 1, // Por ahora fijo
              vuelta: 1, // Por ahora fijo
              es_bye: partido.equipoVisitante === null,
              estado: 'programado',
              fecha_programada: jornada.fecha.toISOString().split('T')[0],
              hora_programada: partido.horario?.horaInicio || null
            });

          if (partidoError) {
            throw new Error(`Error creando partido: ${partidoError.message}`);
          }
        }
      }

      // Crear partidos en tabla juegos para anotadores
      console.log('📝 Creando partidos para anotadores...');
      
      for (const jornada of resultadoJornadas.jornadas!) {
        for (const partido of jornada.partidos) {
          // Solo crear partidos que no sean BYE
          if (partido.equipoVisitante) {
            // Construir fecha y hora completa
            let fechaCompleta = jornada.fecha.toISOString().split('T')[0];
            if (partido.horario?.horaInicio) {
              fechaCompleta += `T${partido.horario.horaInicio}:00`;
            } else {
              fechaCompleta += `T12:00:00`;
            }

            const { error: juegoError } = await supabase
              .from('juegos')
              .insert({
                liga_id: ligaId,
                temporada_id: temporadaId,
                equipo_local_id: partido.equipoLocal.id,
                equipo_visitante_id: partido.equipoVisitante.id,
                fecha: fechaCompleta,
                estado: 'programado',
                marcador_local: 0,
                marcador_visitante: 0
              });

            if (juegoError) {
              console.log('⚠️ Error creando juego:', juegoError.message);
            }
          }
        }
      }
      
      console.log('✅ Partidos creados para anotadores');

      // Actualizar estado de temporada
      const { error: updateError } = await supabase
        .from('configuracion_temporada')
        .update({ 
          estado: 'generado',
          fecha_generacion: new Date().toISOString()
        })
        .eq('id', temporadaId);

      if (updateError) {
        throw new Error(`Error actualizando temporada: ${updateError.message}`);
      }

      // Transaction completed successfully

      return NextResponse.json({
        message: 'Calendario generado exitosamente',
        estadisticas: {
          equipos: equipos.length,
          totalPartidos: resultadoJornadas.jornadas!.reduce((total, j) => total + j.partidos.length, 0),
          totalJornadas: resultadoJornadas.jornadas!.length,
          vueltas: temporada.vueltas_programadas,
          fechaInicio: temporada.fecha_inicio,
          fechaFin: temporada.fecha_fin
        }
      }, { status: 201 });

    } catch (error) {
      console.error('Error guardando calendario:', error);
      return NextResponse.json({ 
        error: `Error guardando calendario: ${error instanceof Error ? error.message : 'Error desconocido'}` 
      }, { status: 500 });
    }

  } catch (error) {
    console.error('Generate calendar error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ temporadaId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { temporadaId } = await params;
    const supabase = await createClient();
    const ligaId = session.user.ligaId;

    console.log('🔍 GET Calendar - temporadaId:', temporadaId, 'ligaId:', ligaId);

    // Verificar que la temporada pertenece a la liga del usuario
    const { data: temporada, error: temporadaError } = await supabase
      .from('configuracion_temporada')
      .select('id, nombre, estado, liga_id')
      .eq('id', temporadaId)
      .eq('liga_id', ligaId)
      .single();

    if (temporadaError || !temporada) {
      console.log('❌ Temporada no encontrada:', temporadaError?.message);
      return NextResponse.json({ error: 'Temporada no encontrada' }, { status: 404 });
    }

    console.log('✅ Temporada encontrada:', temporada);

    // Obtener calendario generado
    const { data: jornadas, error } = await supabase
      .from('jornadas')
      .select(`
        *,
        partidos_calendario (
          *,
          equipo_local:equipo_local_id (id, nombre, logo_url),
          equipo_visitante:equipo_visitante_id (id, nombre, logo_url),
          campo:campo_id (id, nombre),
          horario:horario_id (id, nombre, hora_inicio, hora_fin)
        )
      `)
      .eq('temporada_id', temporadaId)
      .order('numero_jornada');

    if (error) {
      console.log('❌ Error obteniendo jornadas:', error.message);
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    console.log('📅 Jornadas encontradas:', jornadas?.length || 0);

    return NextResponse.json({ jornadas: jornadas || [] });

  } catch (error) {
    console.error('Get calendar error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}