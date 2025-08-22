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
    const accion = url.searchParams.get('accion'); // 'activar' o 'desactivar'
    
    if (!temporadaId || !accion) {
      return NextResponse.json({ error: 'ID de temporada y acción requeridos' }, { status: 400 });
    }

    const supabase = await createClient();
    const ligaId = session.user.ligaId;
    
    if (!ligaId) {
      return NextResponse.json({ error: 'Usuario sin liga asignada' }, { status: 400 });
    }

    console.log(`🔄 ${accion} temporada ${temporadaId}`);

    // Verificar que la temporada existe
    const { data: existingTemporada } = await supabase
      .from('configuracion_temporada')
      .select('id, nombre, estado')
      .eq('id', temporadaId)
      .eq('liga_id', ligaId)
      .single();

    if (!existingTemporada) {
      return NextResponse.json({ error: 'Temporada no encontrada' }, { status: 404 });
    }

    // Simular activar/desactivar usando el campo 'estado'
    let nuevoEstado;
    let mensaje;

    if (accion === 'desactivar') {
      // Cambiar estado a 'cerrada' para simular inactiva
      nuevoEstado = 'cerrada';
      mensaje = `Temporada "${existingTemporada.nombre}" marcada como cerrada (inactiva)`;
    } else {
      // Cambiar estado a 'configuracion' para simular activa
      nuevoEstado = 'configuracion';
      mensaje = `Temporada "${existingTemporada.nombre}" reactivada (configuración)`;
    }

    const { data: temporada, error } = await supabase
      .from('configuracion_temporada')
      .update({
        estado: nuevoEstado,
        updated_at: new Date().toISOString()
      })
      .eq('id', temporadaId)
      .eq('liga_id', ligaId)
      .select('id, nombre, estado')
      .single();

    if (error) {
      console.error('Error updating temporada:', error);
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ 
      message: mensaje,
      temporada: { ...temporada, activo: accion === 'activar' },
      fallback_mode: true,
      note: 'Usando campo estado como alternativa. Para usar el sistema completo, reinicia tu proyecto Supabase.'
    });

  } catch (error) {
    console.error('Toggle temporada fallback error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}