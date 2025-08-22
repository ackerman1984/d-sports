import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth-options';
import { createClient } from '@/lib/supabase/server';

export async function GET(_request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = await createClient();
    
    const { data: equipos, error } = await supabase
      .from('equipos')
      .select(`
        *,
        jugadores(id)
      `)
      .eq('liga_id', session.user.ligaId)
      .order('nombre');

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    // Debug logging
    console.log('🔍 Liga ID:', session.user.ligaId);
    console.log('📊 Equipos encontrados:', equipos?.length);
    
    // Agregar conteo de jugadores
    const equiposConConteo = equipos?.map((equipo: any) => {
      console.log(`🏟️ Equipo: ${equipo.nombre}, Jugadores: ${equipo.jugadores?.length || 0}`);
      return {
        ...equipo,
        jugadoresCount: equipo.jugadores?.length || 0,
      };
    }) || [];

    console.log('✅ Equipos con conteo:', equiposConConteo.map((e: any) => ({ nombre: e.nombre, jugadoresCount: e.jugadoresCount })));

    return NextResponse.json({ equipos: equiposConConteo }, { status: 200 });

  } catch (error) {
    console.error('Get equipos error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { nombre, color, logo_url, descripcion, activo } = body;

    if (!nombre || !color) {
      return NextResponse.json(
        { error: 'Nombre y color son requeridos' },
        { status: 400 }
      );
    }

    const supabase = await createClient();
    
    const { data: equipo, error } = await supabase
      .from('equipos')
      .insert({
        liga_id: session.user.ligaId,
        nombre,
        color,
        logo_url: logo_url || null,
        descripcion: descripcion || null,
        activo: activo !== undefined ? activo : true,
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ 
      message: 'Equipo creado exitosamente',
      equipo 
    }, { status: 201 });

  } catch (error) {
    console.error('Create equipo error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PUT - Actualizar equipo existente
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { id, ...updateData } = body;
    
    if (!id) {
      return NextResponse.json({ error: 'ID de equipo requerido' }, { status: 400 });
    }

    const supabase = await createClient();

    const { data: updatedEquipo, error } = await supabase
      .from('equipos')
      .update({
        ...updateData,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .eq('liga_id', session.user.ligaId)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    if (!updatedEquipo) {
      return NextResponse.json({ error: 'Equipo no encontrado' }, { status: 404 });
    }

    return NextResponse.json({ 
      message: 'Equipo actualizado exitosamente',
      equipo: updatedEquipo 
    });

  } catch (error) {
    console.error('Update equipo error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE - Eliminar equipo
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const equipoId = searchParams.get('id');
    
    if (!equipoId) {
      return NextResponse.json({ error: 'ID de equipo requerido' }, { status: 400 });
    }

    const supabase = await createClient();

    // Primero verificar cuántos jugadores tiene el equipo
    const { count: jugadoresCount } = await supabase
      .from('jugadores')
      .select('*', { count: 'exact', head: true })
      .eq('equipo_id', equipoId);

    // Quitar el equipo a los jugadores
    if (jugadoresCount && jugadoresCount > 0) {
      await supabase
        .from('jugadores')
        .update({ equipo_id: null })
        .eq('equipo_id', equipoId);
    }

    // Eliminar el equipo
    const { error: equipoError } = await supabase
      .from('equipos')
      .delete()
      .eq('id', equipoId)
      .eq('liga_id', session.user.ligaId);

    if (equipoError) {
      return NextResponse.json({ error: equipoError.message }, { status: 400 });
    }

    return NextResponse.json({ 
      message: jugadoresCount && jugadoresCount > 0 
        ? `Equipo eliminado exitosamente. ${jugadoresCount} jugadores fueron desasignados del equipo.`
        : 'Equipo eliminado exitosamente'
    });

  } catch (error) {
    console.error('Delete equipo error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}