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
    const ligaId = session.user.ligaId;
    
    if (!ligaId) {
      return NextResponse.json({ error: 'Usuario sin liga asignada' }, { status: 400 });
    }

    // Obtener parámetro para incluir inactivas (por defecto solo activas)
    const url = new URL(_request.url);
    const incluirInactivas = url.searchParams.get('incluir_inactivas') === 'true';

    // Intentar consulta con campo activo, si falla, consultar sin él
    let temporadas;
    let error;

    try {
      let query = supabase
        .from('configuracion_temporada')
        .select('*')
        .eq('liga_id', ligaId);

      // Por defecto solo mostrar temporadas activas (solo si el campo existe)
      if (!incluirInactivas) {
        query = query.eq('activo', true);
      }

      const result = await query.order('created_at', { ascending: false });
      temporadas = result.data;
      error = result.error;
    } catch (fieldError) {
      console.log('Campo activo no existe, consultando sin filtro:', fieldError);
      // Si falla, intentar sin el campo activo
      const result = await supabase
        .from('configuracion_temporada')
        .select('*')
        .eq('liga_id', ligaId)
        .order('created_at', { ascending: false });
      
      temporadas = result.data;
      error = result.error;
      
      // Agregar campo activo por defecto a todas las temporadas
      if (temporadas) {
        temporadas = temporadas.map(t => ({ ...t, activo: true }));
      }
    }

    if (error) {
      console.error('Error fetching temporadas:', error);
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ 
      temporadas: temporadas || [],
      total: temporadas?.length || 0 
    });

  } catch (error) {
    console.error('Get temporadas error:', error);
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
    const { 
      nombre, 
      fecha_inicio, 
      fecha_fin, 
      playoffs_inicio,
      max_juegos_por_sabado,
      vueltas_programadas,
      auto_generar
    } = body;

    if (!nombre || !fecha_inicio || !fecha_fin) {
      return NextResponse.json(
        { error: 'Nombre, fecha de inicio y fecha de fin son requeridos' },
        { status: 400 }
      );
    }

    if (new Date(fecha_inicio) >= new Date(fecha_fin)) {
      return NextResponse.json(
        { error: 'La fecha de inicio debe ser anterior a la fecha de fin' },
        { status: 400 }
      );
    }

    const supabase = await createClient();
    const ligaId = session.user.ligaId;
    
    if (!ligaId) {
      return NextResponse.json({ error: 'Usuario sin liga asignada' }, { status: 400 });
    }

    // Verificar que no existe una temporada con el mismo nombre
    const { data: existingTemporada } = await supabase
      .from('configuracion_temporada')
      .select('id')
      .eq('liga_id', ligaId)
      .eq('nombre', nombre)
      .single();

    if (existingTemporada) {
      return NextResponse.json(
        { error: 'Ya existe una temporada con este nombre' },
        { status: 400 }
      );
    }

    // Crear la temporada
    const { data: temporada, error } = await supabase
      .from('configuracion_temporada')
      .insert({
        liga_id: ligaId,
        nombre,
        fecha_inicio,
        fecha_fin,
        playoffs_inicio: playoffs_inicio || null,
        max_juegos_por_sabado: max_juegos_por_sabado || 5,
        vueltas_programadas: vueltas_programadas || 2,
        auto_generar: auto_generar !== false,
        estado: 'configuracion'
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating temporada:', error);
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ 
      message: 'Temporada creada exitosamente',
      temporada 
    }, { status: 201 });

  } catch (error) {
    console.error('Create temporada error:', error);
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
    const temporadaId = url.searchParams.get('id');
    
    if (!temporadaId) {
      return NextResponse.json({ error: 'ID de temporada requerido' }, { status: 400 });
    }

    const body = await request.json();
    const { 
      nombre, 
      fecha_inicio, 
      fecha_fin, 
      playoffs_inicio,
      max_juegos_por_sabado,
      vueltas_programadas,
      auto_generar
    } = body;

    if (!nombre || !fecha_inicio || !fecha_fin) {
      return NextResponse.json(
        { error: 'Nombre, fecha de inicio y fecha de fin son requeridos' },
        { status: 400 }
      );
    }

    if (new Date(fecha_inicio) >= new Date(fecha_fin)) {
      return NextResponse.json(
        { error: 'La fecha de inicio debe ser anterior a la fecha de fin' },
        { status: 400 }
      );
    }

    const supabase = await createClient();
    const ligaId = session.user.ligaId;
    
    if (!ligaId) {
      return NextResponse.json({ error: 'Usuario sin liga asignada' }, { status: 400 });
    }

    // Verificar que la temporada existe y pertenece a la liga
    const { data: existingTemporada } = await supabase
      .from('configuracion_temporada')
      .select('id, estado')
      .eq('id', temporadaId)
      .eq('liga_id', ligaId)
      .single();

    if (!existingTemporada) {
      return NextResponse.json(
        { error: 'Temporada no encontrada' },
        { status: 404 }
      );
    }

    if (existingTemporada.estado === 'generado') {
      return NextResponse.json(
        { error: 'No se puede editar una temporada que ya tiene calendario generado' },
        { status: 400 }
      );
    }

    // Actualizar la temporada
    const { data: temporada, error } = await supabase
      .from('configuracion_temporada')
      .update({
        nombre,
        fecha_inicio,
        fecha_fin,
        playoffs_inicio: playoffs_inicio || null,
        max_juegos_por_sabado: max_juegos_por_sabado || 5,
        vueltas_programadas: vueltas_programadas || 2,
        auto_generar: auto_generar !== false
      })
      .eq('id', temporadaId)
      .select()
      .single();

    if (error) {
      console.error('Error updating temporada:', error);
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ 
      message: 'Temporada actualizada exitosamente',
      temporada 
    });

  } catch (error) {
    console.error('Update temporada error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const url = new URL(request.url);
    const temporadaId = url.searchParams.get('id');
    
    if (!temporadaId) {
      return NextResponse.json({ error: 'ID de temporada requerido' }, { status: 400 });
    }

    const supabase = await createClient();
    const ligaId = session.user.ligaId;
    
    if (!ligaId) {
      return NextResponse.json({ error: 'Usuario sin liga asignada' }, { status: 400 });
    }

    // Verificar que la temporada existe y pertenece a la liga
    const { data: existingTemporada } = await supabase
      .from('configuracion_temporada')
      .select('id, nombre, estado, activo')
      .eq('id', temporadaId)
      .eq('liga_id', ligaId)
      .single();

    if (!existingTemporada) {
      return NextResponse.json(
        { error: 'Temporada no encontrada' },
        { status: 404 }
      );
    }

    // Solo permitir eliminar temporadas inactivas
    if (existingTemporada.activo) {
      return NextResponse.json(
        { error: `No se puede eliminar una temporada activa. Primero desactiva la temporada "${existingTemporada.nombre}" y luego podrás eliminarla.` },
        { status: 400 }
      );
    }

    // Verificar si hay partidos asociados
    const { data: partidos } = await supabase
      .from('partidos_calendario')
      .select('id')
      .eq('temporada_id', temporadaId)
      .limit(1);

    if (partidos && partidos.length > 0) {
      return NextResponse.json(
        { error: 'No se puede eliminar una temporada que tiene partidos asociados. Primero elimina todos los partidos.' },
        { status: 400 }
      );
    }

    // Verificar si hay jornadas asociadas
    const { data: jornadas } = await supabase
      .from('jornadas')
      .select('id')
      .eq('temporada_id', temporadaId)
      .limit(1);

    if (jornadas && jornadas.length > 0) {
      // Eliminar jornadas primero (ya que no tienen partidos)
      const { error: jornadasError } = await supabase
        .from('jornadas')
        .delete()
        .eq('temporada_id', temporadaId);

      if (jornadasError) {
        console.error('Error eliminando jornadas:', jornadasError);
        return NextResponse.json({ error: 'Error eliminando jornadas asociadas' }, { status: 500 });
      }
    }

    // Eliminar la temporada
    const { error } = await supabase
      .from('configuracion_temporada')
      .delete()
      .eq('id', temporadaId);

    if (error) {
      console.error('Error deleting temporada:', error);
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ 
      message: `Temporada "${existingTemporada.nombre}" eliminada exitosamente`
    });

  } catch (error) {
    console.error('Delete temporada error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}