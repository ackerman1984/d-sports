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

    if (session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const supabase = await createClient();
    const ligaId = session.user.ligaId;
    
    if (!ligaId) {
      return NextResponse.json({ error: 'Usuario sin liga asignada' }, { status: 400 });
    }

    const { data: campos, error } = await supabase
      .from('campos')
      .select('*')
      .eq('liga_id', ligaId)
      .order('orden', { ascending: true });

    if (error) {
      console.error('Error fetching campos:', error);
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ 
      campos: campos || [],
      total: campos?.length || 0 
    });

  } catch (error) {
    console.error('Get campos error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { nombre, descripcion, activo, orden } = body;

    if (!nombre) {
      return NextResponse.json(
        { error: 'Nombre es requerido' },
        { status: 400 }
      );
    }

    const supabase = await createClient();
    const ligaId = session.user.ligaId;
    
    if (!ligaId) {
      return NextResponse.json({ error: 'Usuario sin liga asignada' }, { status: 400 });
    }

    // Verificar que no existe un campo con el mismo nombre
    const { data: existingCampo } = await supabase
      .from('campos')
      .select('id')
      .eq('liga_id', ligaId)
      .eq('nombre', nombre)
      .single();

    if (existingCampo) {
      return NextResponse.json(
        { error: 'Ya existe un campo con este nombre' },
        { status: 400 }
      );
    }

    // Crear el campo
    const { data: nuevoCampo, error } = await supabase
      .from('campos')
      .insert({
        liga_id: ligaId,
        nombre,
        descripcion: descripcion || null,
        activo: activo !== false,
        orden: orden || 1
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating campo:', error);
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ 
      message: 'Campo creado exitosamente',
      campo: nuevoCampo 
    }, { status: 201 });

  } catch (error) {
    console.error('Create campo error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const url = new URL(request.url);
    const campoId = url.searchParams.get('id');
    
    if (!campoId) {
      return NextResponse.json({ error: 'ID de campo requerido' }, { status: 400 });
    }

    const body = await request.json();
    const { nombre, descripcion, activo, orden } = body;

    if (!nombre) {
      return NextResponse.json(
        { error: 'Nombre es requerido' },
        { status: 400 }
      );
    }

    const supabase = await createClient();
    const ligaId = session.user.ligaId;
    
    if (!ligaId) {
      return NextResponse.json({ error: 'Usuario sin liga asignada' }, { status: 400 });
    }

    // Verificar que el campo existe y pertenece a la liga
    const { data: existingCampo } = await supabase
      .from('campos')
      .select('id')
      .eq('id', campoId)
      .eq('liga_id', ligaId)
      .single();

    if (!existingCampo) {
      return NextResponse.json(
        { error: 'Campo no encontrado' },
        { status: 404 }
      );
    }

    // Actualizar el campo
    const { data: campo, error } = await supabase
      .from('campos')
      .update({
        nombre,
        descripcion: descripcion || null,
        activo: activo !== false,
        orden: orden || 1
      })
      .eq('id', campoId)
      .select()
      .single();

    if (error) {
      console.error('Error updating campo:', error);
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ 
      message: 'Campo actualizado exitosamente',
      campo 
    });

  } catch (error) {
    console.error('Update campo error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}