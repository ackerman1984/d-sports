import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const ligaId = searchParams.get('ligaId');
    const timestamp = searchParams.get('_t'); // Para bypass de cache

    console.log('Public equipos request - ligaId:', ligaId, 'timestamp:', timestamp);

    if (!ligaId) {
      return NextResponse.json({ error: 'Liga ID requerido' }, { status: 400 });
    }

    const supabase = await createClient();
    
    // Primero, verificar si la liga existe
    const { data: liga, error: ligaError } = await supabase
      .from('ligas')
      .select('id, nombre')
      .eq('id', ligaId)
      .single();

    if (ligaError || !liga) {
      console.error('Liga not found:', ligaError);
      return NextResponse.json({ error: 'Liga no encontrada' }, { status: 404 });
    }

    console.log('Liga found:', liga);
    
    // Obtener TODOS los equipos de la liga (sin filtro activo primero para debug)
    const { data: equipos, error } = await supabase
      .from('equipos')
      .select('id, nombre, color, logo_url, activo')
      .eq('liga_id', ligaId)
      .order('nombre');

    console.log('Equipos query result:', { equipos, error });

    if (error) {
      console.error('Error fetching equipos for registration:', error);
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    // Filtrar solo los activos
    const equiposActivos = (equipos || []).filter(equipo => equipo.activo);
    console.log('Equipos activos:', equiposActivos);

    return NextResponse.json({ equipos: equiposActivos }, { status: 200 });

  } catch (error) {
    console.error('Get public equipos error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}