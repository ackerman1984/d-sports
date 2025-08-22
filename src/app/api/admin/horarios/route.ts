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

    const { data: horarios, error } = await supabase
      .from('horarios')
      .select('*')
      .eq('liga_id', ligaId)
      .order('orden', { ascending: true });

    if (error) {
      console.error('Error fetching horarios:', error);
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ 
      horarios: horarios || [],
      total: horarios?.length || 0 
    });

  } catch (error) {
    console.error('Get horarios error:', error);
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
    const { nombre, hora_inicio, hora_fin, activo_por_defecto, orden, descripcion } = body;

    if (!nombre || !hora_inicio || !hora_fin) {
      return NextResponse.json(
        { error: 'Nombre, hora de inicio y hora de fin son requeridos' },
        { status: 400 }
      );
    }

    const supabase = await createClient();
    const ligaId = session.user.ligaId;
    
    if (!ligaId) {
      return NextResponse.json({ error: 'Usuario sin liga asignada' }, { status: 400 });
    }

    // Verificar que no existe un horario con el mismo nombre
    const { data: existingHorario } = await supabase
      .from('horarios')
      .select('id')
      .eq('liga_id', ligaId)
      .eq('nombre', nombre)
      .single();

    if (existingHorario) {
      return NextResponse.json(
        { error: 'Ya existe un horario con este nombre' },
        { status: 400 }
      );
    }

    // Crear el horario
    const { data: nuevoHorario, error } = await supabase
      .from('horarios')
      .insert({
        liga_id: ligaId,
        nombre,
        hora_inicio,
        hora_fin,
        activo_por_defecto: activo_por_defecto !== false,
        orden: orden || 1,
        descripcion: descripcion || null
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating horario:', error);
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ 
      message: 'Horario creado exitosamente',
      horario: nuevoHorario 
    }, { status: 201 });

  } catch (error) {
    console.error('Create horario error:', error);
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
    const horarioId = url.searchParams.get('id');
    
    if (!horarioId) {
      return NextResponse.json({ error: 'ID de horario requerido' }, { status: 400 });
    }

    const body = await request.json();
    const { nombre, hora_inicio, hora_fin, activo_por_defecto, orden, descripcion } = body;

    if (!nombre || !hora_inicio || !hora_fin) {
      return NextResponse.json(
        { error: 'Nombre, hora de inicio y hora de fin son requeridos' },
        { status: 400 }
      );
    }

    const supabase = await createClient();
    const ligaId = session.user.ligaId;
    
    if (!ligaId) {
      return NextResponse.json({ error: 'Usuario sin liga asignada' }, { status: 400 });
    }

    // Verificar que el horario existe y pertenece a la liga
    const { data: existingHorario } = await supabase
      .from('horarios')
      .select('id')
      .eq('id', horarioId)
      .eq('liga_id', ligaId)
      .single();

    if (!existingHorario) {
      return NextResponse.json(
        { error: 'Horario no encontrado' },
        { status: 404 }
      );
    }

    // Actualizar el horario
    const { data: horario, error } = await supabase
      .from('horarios')
      .update({
        nombre,
        hora_inicio,
        hora_fin,
        activo_por_defecto: activo_por_defecto !== false,
        orden: orden || 1,
        descripcion: descripcion || null
      })
      .eq('id', horarioId)
      .select()
      .single();

    if (error) {
      console.error('Error updating horario:', error);
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ 
      message: 'Horario actualizado exitosamente',
      horario 
    });

  } catch (error) {
    console.error('Update horario error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}