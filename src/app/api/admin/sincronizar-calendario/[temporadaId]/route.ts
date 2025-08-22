import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth-options';
import { createClient } from '@/lib/supabase/server';

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

    // 1. Verificar que la temporada existe y está generada
    const { data: temporada, error: temporadaError } = await supabase
      .from('configuracion_temporada')
      .select('*')
      .eq('id', temporadaId)
      .eq('liga_id', ligaId)
      .single();

    if (temporadaError || !temporada) {
      return NextResponse.json({ error: 'Temporada no encontrada' }, { status: 404 });
    }

    if (temporada.estado !== 'generado') {
      return NextResponse.json({ 
        error: 'Solo se pueden sincronizar temporadas con calendario generado' 
      }, { status: 400 });
    }

    // 2. Obtener partidos del calendario existente
    console.log('🔍 Obteniendo jornadas y partidos...');
    const { data: jornadas, error: jornadasError } = await supabase
      .from('jornadas')
      .select(`
        *,
        partidos_calendario (
          *,
          equipo_local:equipo_local_id (id, nombre),
          equipo_visitante:equipo_visitante_id (id, nombre),
          campo:campo_id (id, nombre),
          horario:horario_id (id, nombre, hora_inicio, hora_fin)
        )
      `)
      .eq('temporada_id', temporadaId)
      .order('numero_jornada');

    console.log('📊 Resultado consulta jornadas:', {
      jornadas: jornadas?.length || 0,
      error: jornadasError?.message,
      primeraJornada: jornadas?.[0] ? {
        id: jornadas[0].id,
        numero: jornadas[0].numero_jornada,
        partidos: jornadas[0].partidos_calendario?.length || 0
      } : null
    });

    if (jornadasError || !jornadas) {
      console.log('❌ Error obteniendo jornadas:', jornadasError);
      return NextResponse.json({ error: 'Error obteniendo calendario existente' }, { status: 500 });
    }

    if (jornadas.length === 0) {
      console.log('⚠️ No hay jornadas para esta temporada');
      return NextResponse.json({ 
        message: 'No hay jornadas para sincronizar',
        estadisticas: { jornadas: 0, partidosCreados: 0 }
      }, { status: 200 });
    }

    // 2.1 Verificar si la consulta anidada funcionó, si no, obtener partidos por separado
    const totalPartidosAnidados = jornadas.reduce((total, j) => total + (j.partidos_calendario?.length || 0), 0);
    console.log(`📈 Total partidos en consulta anidada: ${totalPartidosAnidados}`);

    if (totalPartidosAnidados === 0) {
      console.log('🔄 Consulta anidada falló, obteniendo partidos por separado...');
      
      // Obtener partidos directamente
      const { data: partidosDirectos, error: partidosError } = await supabase
        .from('partidos_calendario')
        .select(`
          *,
          equipo_local:equipo_local_id (id, nombre),
          equipo_visitante:equipo_visitante_id (id, nombre),
          campo:campo_id (id, nombre),
          horario:horario_id (id, nombre, hora_inicio, hora_fin)
        `)
        .eq('temporada_id', temporadaId);

      console.log(`📊 Partidos directos encontrados: ${partidosDirectos?.length || 0}`);

      if (partidosDirectos && partidosDirectos.length > 0) {
        // Agrupar partidos por jornada
        const partidosPorJornada = new Map();
        partidosDirectos.forEach(partido => {
          if (!partidosPorJornada.has(partido.jornada_id)) {
            partidosPorJornada.set(partido.jornada_id, []);
          }
          partidosPorJornada.get(partido.jornada_id).push(partido);
        });

        // Asignar partidos a jornadas
        jornadas.forEach(jornada => {
          jornada.partidos_calendario = partidosPorJornada.get(jornada.id) || [];
          console.log(`📅 Jornada ${jornada.numero_jornada}: ${jornada.partidos_calendario.length} partidos asignados`);
        });
      }
    }

    // 3. Limpiar juegos existentes para anotadores
    console.log('🧹 Limpiando juegos existentes...');
    const { error: deleteJuegosError } = await supabase
      .from('juegos')
      .delete()
      .eq('temporada_id', temporadaId);
    
    if (deleteJuegosError) {
      console.log('⚠️ Error eliminando juegos:', deleteJuegosError.message);
    }

    // 4. Crear juegos desde el calendario existente
    console.log('📝 Recreando partidos para anotadores...');
    console.log(`📊 Datos encontrados: ${jornadas.length} jornadas`);
    
    let partidosCreados = 0;
    let partidosProcessed = 0;
    let partidosBye = 0;
    
    for (const jornada of jornadas) {
      console.log(`🔍 Procesando jornada ${jornada.numero_jornada}: ${jornada.partidos_calendario?.length || 0} partidos`);
      
      if (!jornada.partidos_calendario || jornada.partidos_calendario.length === 0) {
        console.log(`⚠️ Jornada ${jornada.numero_jornada} no tiene partidos`);
        continue;
      }
      
      for (const partido of jornada.partidos_calendario) {
        partidosProcessed++;
        console.log(`🏟️ Procesando partido: ${partido.equipo_local_id} vs ${partido.equipo_visitante_id}, es_bye: ${partido.es_bye}`);
        
        // Solo crear partidos que no sean BYE
        if (partido.equipo_visitante_id && !partido.es_bye) {
          // Construir fecha y hora completa
          let fechaCompleta = partido.fecha_programada;
          if (partido.hora_programada) {
            // Limpiar y normalizar hora_programada
            let hora = partido.hora_programada;
            
            // Si ya tiene formato HH:MM:SS, usar como está
            if (hora.match(/^\d{2}:\d{2}:\d{2}$/)) {
              fechaCompleta += `T${hora}`;
            }
            // Si tiene formato HH:MM, agregar segundos
            else if (hora.match(/^\d{2}:\d{2}$/)) {
              fechaCompleta += `T${hora}:00`;
            }
            // Si solo tiene números, asumir que son horas
            else {
              fechaCompleta += `T${hora}:00:00`;
            }
          } else {
            fechaCompleta += `T12:00:00`;
          }
          
          console.log(`🕐 Hora original: '${partido.hora_programada}' → Fecha construida: '${fechaCompleta}'`);

          const { error: juegoError } = await supabase
            .from('juegos')
            .insert({
              liga_id: ligaId,
              temporada_id: temporadaId,
              equipo_local_id: partido.equipo_local_id,
              equipo_visitante_id: partido.equipo_visitante_id,
              fecha: fechaCompleta,
              estado: partido.estado || 'programado',
              marcador_local: 0,
              marcador_visitante: 0
            });

          if (juegoError) {
            console.log('⚠️ Error creando juego:', juegoError.message);
          } else {
            partidosCreados++;
            console.log(`✅ Juego creado: ${partidosCreados}`);
          }
        } else {
          if (partido.es_bye) {
            partidosBye++;
            console.log(`⏭️ Partido BYE omitido`);
          } else {
            console.log(`❌ Partido rechazado: falta equipo visitante`);
          }
        }
      }
    }
    
    console.log(`✅ Resumen: ${partidosCreados} partidos creados, ${partidosBye} BYEs omitidos, ${partidosProcessed} procesados total`);

    return NextResponse.json({
      message: 'Calendario sincronizado exitosamente',
      estadisticas: {
        jornadas: jornadas.length,
        partidosCreados,
        partidosProcessed,
        partidosBye,
        temporada: temporada.nombre
      }
    }, { status: 200 });

  } catch (error) {
    console.error('Sincronizar calendario error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}