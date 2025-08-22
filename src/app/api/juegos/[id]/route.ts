import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth-options';
import { createClient } from '@/lib/supabase/server';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verificar que el usuario sea anotador o admin
    if (!['admin', 'anotador'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const supabase = await createClient();
    const { id } = await params;

    // Actualizar el juego
    const { data: updatedGame, error } = await supabase
      .from('juegos')
      .update({
        estado: body.estado,
        marcador_local: body.marcadorLocal,
        marcador_visitante: body.marcadorVisitante,
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ 
      message: 'Game updated successfully',
      juego: updatedGame 
    }, { status: 200 });

  } catch (error) {
    console.error('Update game error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}