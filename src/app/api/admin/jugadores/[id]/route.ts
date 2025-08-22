import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { createClient } from '@/lib/supabase/server';
import { authOptions } from '@/lib/auth/auth-options';

// GET - Obtener un jugador específico por ID
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { id } = await params;
    const supabase = await createClient();
    
    const { data: jugador, error } = await supabase
      .from('jugadores')
      .select(`
        *,
        equipo:equipos(*),
        estadisticas:estadisticas_jugador(*)
      `)
      .eq('id', id)
      .eq('liga_id', session.user.ligaId)
      .single();

    if (error) {
      console.error('Error fetching player:', error);
      return NextResponse.json({ error: 'Jugador no encontrado' }, { status: 404 });
    }

    return NextResponse.json({ jugador });

  } catch (error) {
    console.error('Error in GET /api/admin/jugadores/[id]:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}

// PUT - Actualizar jugador específico
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const supabase = await createClient();

    const playerData = {
      ...body,
      updated_at: new Date().toISOString()
    };

    const { data: updatedPlayer, error } = await supabase
      .from('jugadores')
      .update(playerData)
      .eq('id', id)
      .eq('liga_id', session.user.ligaId)
      .select(`
        *,
        equipo:equipos(*)
      `)
      .single();

    if (error) {
      console.error('Error updating player:', error);
      return NextResponse.json({ error: 'Error al actualizar jugador' }, { status: 500 });
    }

    return NextResponse.json({ 
      jugador: updatedPlayer, 
      message: 'Jugador actualizado exitosamente' 
    });

  } catch (error) {
    console.error('Error in PUT /api/admin/jugadores/[id]:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}

// DELETE - Eliminar jugador específico
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { id } = await params;
    const supabase = await createClient();

    // Primero eliminar las estadísticas del jugador
    const { error: statsError } = await supabase
      .from('estadisticas_jugador')
      .delete()
      .eq('jugador_id', id);

    if (statsError) {
      console.warn('Error deleting player stats:', statsError);
    }

    // Luego eliminar el jugador
    const { error: playerError } = await supabase
      .from('jugadores')
      .delete()
      .eq('id', id)
      .eq('liga_id', session.user.ligaId);

    if (playerError) {
      console.error('Error deleting player:', playerError);
      return NextResponse.json({ error: 'Error al eliminar jugador' }, { status: 500 });
    }

    return NextResponse.json({ 
      message: 'Jugador eliminado exitosamente' 
    });

  } catch (error) {
    console.error('Error in DELETE /api/admin/jugadores/[id]:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}