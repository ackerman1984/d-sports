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
    const nuevoEstado = url.searchParams.get('activo') === 'true';
    
    if (!temporadaId) {
      return NextResponse.json({ error: 'ID de temporada requerido' }, { status: 400 });
    }

    const supabase = await createClient();
    const ligaId = session.user.ligaId;
    
    if (!ligaId) {
      return NextResponse.json({ error: 'Usuario sin liga asignada' }, { status: 400 });
    }

    console.log(`🔄 Cambiando estado de temporada ${temporadaId} a ${nuevoEstado ? 'activa' : 'inactiva'}`);

    // Intentar actualizar directamente
    try {
      const { data: temporada, error } = await supabase
        .from('configuracion_temporada')
        .update({
          activo: nuevoEstado,
          updated_at: new Date().toISOString()
        })
        .eq('id', temporadaId)
        .eq('liga_id', ligaId)
        .select('id, nombre')
        .single();

      if (error) {
        console.error('Error updating temporada:', error);
        
        // Verificar si es un error de caché de esquema
        if (error.message.includes('schema cache') || error.message.includes('activo')) {
          return NextResponse.json({ 
            error: 'El campo "activo" existe pero Supabase necesita reiniciar. Ve a tu dashboard → Project Settings → Restart Project. O espera unos minutos e intenta de nuevo.',
            needsRestart: true,
            troubleshooting: [
              '1. Ve a tu dashboard de Supabase',
              '2. Project Settings → General',
              '3. Haz clic en "Restart Project"',
              '4. Espera 2-3 minutos',
              '5. Intenta de nuevo'
            ]
          }, { status: 400 });
        }
        
        return NextResponse.json({ error: error.message }, { status: 400 });
      }

      if (!temporada) {
        return NextResponse.json({ error: 'Temporada no encontrada' }, { status: 404 });
      }

      return NextResponse.json({ 
        message: `Temporada "${temporada.nombre || 'Sin nombre'}" ${nuevoEstado ? 'activada' : 'desactivada'} exitosamente`,
        temporada: { ...temporada, activo: nuevoEstado },
        nuevoEstado
      });

    } catch (updateError) {
      console.error('Error en actualización directa:', updateError);
      
      // Si falla, verificar que la temporada existe primero
      const { data: existingTemporada } = await supabase
        .from('configuracion_temporada')
        .select('id, nombre')
        .eq('id', temporadaId)
        .eq('liga_id', ligaId)
        .single();

      if (!existingTemporada) {
        return NextResponse.json({ error: 'Temporada no encontrada' }, { status: 404 });
      }

      // Campo activo no existe, pero la temporada sí
      return NextResponse.json({ 
        error: 'Campo activo no configurado correctamente. Reinicia tu proyecto en Supabase o usa el botón "Configurar Sistema".',
        needsSetup: true,
        needsRestart: true
      }, { status: 400 });
    }

  } catch (error) {
    console.error('Toggle temporada simple error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}