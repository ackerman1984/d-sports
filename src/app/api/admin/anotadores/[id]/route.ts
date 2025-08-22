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

    if (session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { id } = await params;

    const supabase = await createClient();

    // Obtener liga_id del usuario
    const ligaId = session.user.ligaId;
    
    if (!ligaId) {
      console.error('Usuario sin liga asignada:', session.user);
      return NextResponse.json({ error: 'Usuario sin liga asignada' }, { status: 400 });
    }

    console.log('Actualizando anotador:', id, 'para liga:', ligaId);

    // Verificar que el anotador pertenece a la liga del admin
    const { data: anotador, error: fetchError } = await supabase
      .from('anotadores')
      .select('*')
      .eq('id', id)
      .eq('liga_id', ligaId)
      .single();

    if (fetchError || !anotador) {
      return NextResponse.json({ error: 'Anotador no encontrado' }, { status: 404 });
    }


    // Si se está actualizando el código de acceso, verificar que no exista otro con el mismo código
    if (body.codigo_acceso && body.codigo_acceso !== anotador.codigo_acceso) {
      const { data: existingCode } = await supabase
        .from('anotadores')
        .select('id')
        .eq('codigo_acceso', body.codigo_acceso)
        .neq('id', id)
        .single();

      if (existingCode) {
        return NextResponse.json(
          { error: 'Ya existe otro anotador con este código de acceso' },
          { status: 400 }
        );
      }
    }

    // Actualizar el anotador
    const updateData: any = {
      updated_at: new Date().toISOString()
    };

    // Solo actualizar campos que se enviaron
    if (body.nombre !== undefined) updateData.nombre = body.nombre;
    if (body.telefono !== undefined) updateData.telefono = body.telefono;
    if (body.email !== undefined) updateData.email = body.email;
    if (body.foto_url !== undefined) updateData.foto_url = body.foto_url;
    if (body.codigo_acceso !== undefined) updateData.codigo_acceso = body.codigo_acceso;
    if (body.activo !== undefined) updateData.activo = body.activo;

    const { data: updatedAnotador, error } = await supabase
      .from('anotadores')
      .update(updateData)
      .eq('id', id)
      .eq('liga_id', ligaId)
      .select()
      .single();

    if (error) {
      console.error('Error updating anotador:', error);
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ 
      message: 'Anotador actualizado exitosamente',
      anotador: updatedAnotador 
    });

  } catch (error) {
    console.error('Update anotador error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = await params;
    const supabase = await createClient();

    // Obtener liga_id del usuario
    const ligaId = session.user.ligaId;
    
    if (!ligaId) {
      console.error('Usuario sin liga asignada:', session.user);
      return NextResponse.json({ error: 'Usuario sin liga asignada' }, { status: 400 });
    }

    // Verificar que el anotador pertenece a la liga del admin
    const { data: anotador, error: fetchError } = await supabase
      .from('anotadores')
      .select('*')
      .eq('id', id)
      .eq('liga_id', ligaId)
      .single();

    if (fetchError || !anotador) {
      return NextResponse.json({ error: 'Anotador no encontrado' }, { status: 404 });
    }

    // En lugar de eliminar, mejor desactivar
    const { error } = await supabase
      .from('anotadores')
      .update({ 
        activo: false,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .eq('liga_id', ligaId);

    if (error) {
      console.error('Error deactivating anotador:', error);
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ 
      message: 'Anotador desactivado exitosamente' 
    });

  } catch (error) {
    console.error('Delete anotador error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}