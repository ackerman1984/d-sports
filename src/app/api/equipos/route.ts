import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth-options';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const ligaId = searchParams.get('ligaId') || session.user.ligaId;

    const supabase = await createClient();
    
    const { data: equipos, error } = await supabase
      .from('equipos')
      .select(`
        *,
        _count:jugadores(count)
      `)
      .eq('liga_id', ligaId)
      .order('nombre');

    if (error) {
      console.error('Error fetching teams:', error);
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ equipos }, { status: 200 });

  } catch (error) {
    console.error('Get equipos error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST - Crear nuevo equipo
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const body = await request.json();
    const supabase = await createClient();

    const equipoData = {
      nombre: body.nombre,
      color: body.color || '#2563EB',
      logo_url: body.logo_url || null,
      descripcion: body.descripcion || null,
      liga_id: session.user.ligaId,
      activo: body.activo !== undefined ? body.activo : true,
      created_at: new Date().toISOString()
    };

    const { data: newEquipo, error } = await supabase
      .from('equipos')
      .insert([equipoData])
      .select('*')
      .single();

    if (error) {
      console.error('Error creating team:', error);
      return NextResponse.json({ error: 'Error al crear equipo: ' + error.message }, { status: 500 });
    }

    return NextResponse.json({ 
      equipo: newEquipo, 
      message: 'Equipo creado exitosamente' 
    }, { status: 201 });

  } catch (error) {
    console.error('Error in POST /api/equipos:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}

// PUT - Actualizar equipo existente
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const body = await request.json();
    const { id, ...updateData } = body;
    
    if (!id) {
      return NextResponse.json({ error: 'ID de equipo requerido' }, { status: 400 });
    }

    const supabase = await createClient();

    const equipoData = {
      ...updateData,
      updated_at: new Date().toISOString()
    };

    const { data: updatedEquipo, error } = await supabase
      .from('equipos')
      .update(equipoData)
      .eq('id', id)
      .eq('liga_id', session.user.ligaId) // Verificar que pertenece a la liga
      .select('*')
      .single();

    if (error) {
      console.error('Error updating team:', error);
      return NextResponse.json({ error: 'Error al actualizar equipo: ' + error.message }, { status: 500 });
    }

    if (!updatedEquipo) {
      return NextResponse.json({ error: 'Equipo no encontrado' }, { status: 404 });
    }

    return NextResponse.json({ 
      equipo: updatedEquipo, 
      message: 'Equipo actualizado exitosamente' 
    });

  } catch (error) {
    console.error('Error in PUT /api/equipos:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}

// DELETE - Eliminar equipo
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const equipoId = searchParams.get('id');
    
    if (!equipoId) {
      return NextResponse.json({ error: 'ID de equipo requerido' }, { status: 400 });
    }

    const supabase = await createClient();

    // Primero actualizar los jugadores del equipo (quitarles el equipo)
    await supabase
      .from('jugadores')
      .update({ equipo_id: null })
      .eq('equipo_id', equipoId);

    // Luego eliminar el equipo
    const { error: equipoError } = await supabase
      .from('equipos')
      .delete()
      .eq('id', equipoId)
      .eq('liga_id', session.user.ligaId); // Verificar que pertenece a la liga

    if (equipoError) {
      console.error('Error deleting team:', equipoError);
      return NextResponse.json({ error: 'Error al eliminar equipo: ' + equipoError.message }, { status: 500 });
    }

    return NextResponse.json({ 
      message: 'Equipo eliminado exitosamente' 
    });

  } catch (error) {
    console.error('Error in DELETE /api/equipos:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}