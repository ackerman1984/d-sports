import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth-options';
import { createClient } from '@/lib/supabase/server';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ temporadaId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { temporadaId } = await params;
    const supabase = await createClient();
    const ligaId = session.user.ligaId;

    console.log('🔍 DEBUG - Diagnosticando calendario temporada:', temporadaId, 'liga:', ligaId);

    // 1. Verificar temporada
    const { data: temporada, error: temporadaError } = await supabase
      .from('configuracion_temporada')
      .select('*')
      .eq('id', temporadaId)
      .eq('liga_id', ligaId)
      .single();

    console.log('📅 Temporada encontrada:', temporada, 'Error:', temporadaError);

    // 2. Verificar jornadas
    const { data: jornadas, error: jornadasError } = await supabase
      .from('jornadas')
      .select('*')
      .eq('temporada_id', temporadaId);

    console.log('📋 Jornadas encontradas:', jornadas?.length || 0, 'Error:', jornadasError);

    // 3. Verificar partidos_calendario
    const { data: partidosCalendario, error: partidosError } = await supabase
      .from('partidos_calendario')
      .select(`
        *,
        equipo_local:equipo_local_id (id, nombre),
        equipo_visitante:equipo_visitante_id (id, nombre)
      `)
      .eq('temporada_id', temporadaId);

    console.log('🏟️ Partidos calendario encontrados:', partidosCalendario?.length || 0, 'Error:', partidosError);

    // 4. Verificar juegos existentes
    const { data: juegosExistentes, error: juegosError } = await supabase
      .from('juegos')
      .select('*')
      .eq('temporada_id', temporadaId);

    console.log('⚾ Juegos existentes:', juegosExistentes?.length || 0, 'Error:', juegosError);

    // 5. Verificar estructura de una jornada con partidos
    let jornadaConPartidos = null;
    if (jornadas && jornadas.length > 0) {
      const { data: jornadaDetalle } = await supabase
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
        .eq('id', jornadas[0].id)
        .single();
      
      jornadaConPartidos = jornadaDetalle;
      console.log('🔍 Detalle primera jornada:', jornadaDetalle);
    }

    return NextResponse.json({
      debug: {
        temporadaId,
        ligaId,
        temporada: {
          encontrada: !!temporada,
          estado: temporada?.estado,
          error: temporadaError?.message
        },
        jornadas: {
          total: jornadas?.length || 0,
          error: jornadasError?.message,
          sample: jornadas?.[0]
        },
        partidos_calendario: {
          total: partidosCalendario?.length || 0,
          error: partidosError?.message,
          partidos_con_equipos: partidosCalendario?.filter(p => p.equipo_local && p.equipo_visitante)?.length || 0,
          partidos_bye: partidosCalendario?.filter(p => p.es_bye)?.length || 0,
          sample: partidosCalendario?.[0]
        },
        juegos_existentes: {
          total: juegosExistentes?.length || 0,
          error: juegosError?.message
        },
        jornada_detalle: jornadaConPartidos
      }
    });

  } catch (error) {
    console.error('❌ Error en debug:', error);
    return NextResponse.json({ error: 'Error del servidor', details: error }, { status: 500 });
  }
}