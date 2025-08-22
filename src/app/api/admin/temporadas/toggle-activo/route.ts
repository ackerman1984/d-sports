import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth-options';
import { createClient } from '@/lib/supabase/server';

export async function PATCH(request: NextRequest) {
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
    const { data: existingTemporada, error: fetchError } = await supabase
      .from('configuracion_temporada')
      .select('id, nombre, activo')
      .eq('id', temporadaId)
      .eq('liga_id', ligaId)
      .single();

    if (fetchError) {
      console.error('Error fetching temporada:', fetchError);
      return NextResponse.json(
        { error: `Error buscando temporada: ${fetchError.message}` },
        { status: 500 }
      );
    }

    if (!existingTemporada) {
      return NextResponse.json(
        { error: 'Temporada no encontrada' },
        { status: 404 }
      );
    }

    // Cambiar el estado activo (si activo es null, asumir true por defecto)
    const estadoActual = existingTemporada.activo ?? true;
    const nuevoEstado = !estadoActual;

    const { data: temporada, error } = await supabase
      .from('configuracion_temporada')
      .update({
        activo: nuevoEstado,
        updated_at: new Date().toISOString()
      })
      .eq('id', temporadaId)
      .select()
      .single();

    if (error) {
      console.error('Error updating temporada activo:', error);
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ 
      message: `Temporada "${existingTemporada.nombre}" ${nuevoEstado ? 'activada' : 'desactivada'} exitosamente`,
      temporada,
      nuevoEstado
    });

  } catch (error) {
    console.error('Toggle temporada activo error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}