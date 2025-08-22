import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth-options';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const supabase = await createClient();

    // Obtener liga_id del usuario
    const ligaId = session.user.ligaId;
    
    if (!ligaId) {
      console.error('Usuario sin liga asignada:', session.user);
      return NextResponse.json({ error: 'Usuario sin liga asignada' }, { status: 400 });
    }

    // Obtener historial de anotaciones para la liga del admin
    const { data: historial, error } = await supabase
      .from('anotador_juegos')
      .select(`
        id,
        fecha_asignacion,
        fecha_completado,
        notas,
        anotadores:anotador_id (
          id,
          nombre,
          email
        ),
        juegos:juego_id (
          id,
          fecha,
          estado,
          equipo_local:equipo_local_id (
            nombre
          ),
          equipo_visitante:equipo_visitante_id (
            nombre
          )
        )
      `)
      .eq('anotadores.liga_id', ligaId)
      .order('fecha_asignacion', { ascending: false });

    if (error) {
      console.error('Error obteniendo historial:', error);
      return NextResponse.json({ error: 'Error obteniendo historial' }, { status: 500 });
    }

    // Formatear los datos para el frontend
    const historialFormateado = historial?.map((item: any) => ({
      id: item.id,
      anotador: {
        id: Array.isArray(item.anotadores) ? item.anotadores[0]?.id : item.anotadores?.id,
        nombre: Array.isArray(item.anotadores) ? item.anotadores[0]?.nombre : item.anotadores?.nombre,
        email: Array.isArray(item.anotadores) ? item.anotadores[0]?.email : item.anotadores?.email
      },
      juego: {
        id: item.juegos?.id,
        fecha: item.juegos?.fecha,
        estado: item.juegos?.estado,
        equipos: `${item.juegos?.equipo_local?.nombre} vs ${item.juegos?.equipo_visitante?.nombre}`
      },
      fecha_asignacion: item.fecha_asignacion,
      fecha_completado: item.fecha_completado,
      notas: item.notas,
      estado: item.fecha_completado ? 'completado' : 'asignado'
    })) || [];

    return NextResponse.json({
      historial: historialFormateado
    });

  } catch (error) {
    console.error('Error en historial de anotadores:', error);
    return NextResponse.json({ error: 'Error del servidor' }, { status: 500 });
  }
}