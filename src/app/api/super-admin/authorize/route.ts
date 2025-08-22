import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin-client';

export async function POST(request: NextRequest) {
  try {
    const { ligaId, authorizedBy, action, reason } = await request.json();

    if (!ligaId || !authorizedBy || !action) {
      return NextResponse.json(
        { error: 'Datos incompletos' },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();

    // Verificar que la liga existe
    const { data: liga, error: ligaError } = await supabase
      .from('ligas')
      .select('*')
      .eq('id', ligaId)
      .single();

    if (ligaError || !liga) {
      return NextResponse.json(
        { error: 'Liga no encontrada' },
        { status: 404 }
      );
    }

    const updateData: Record<string, string | boolean | null> = {};

    switch (action) {
      case 'authorize':
        updateData.activa = true;
        updateData.suspendida = false;
        updateData.razon_suspension = null;
        updateData.fecha_suspension = null;
        break;

      case 'suspend':
        if (!reason) {
          return NextResponse.json(
            { error: 'Razón de suspensión requerida' },
            { status: 400 }
          );
        }
        updateData.activa = false;
        updateData.suspendida = true;
        updateData.razon_suspension = reason;
        updateData.fecha_suspension = new Date().toISOString();
        break;

      case 'reactivate':
        updateData.activa = true;
        updateData.suspendida = false;
        updateData.razon_suspension = null;
        updateData.fecha_suspension = null;
        break;

      default:
        return NextResponse.json(
          { error: 'Acción no válida' },
          { status: 400 }
        );
    }

    // Actualizar la liga
    const { error: updateError } = await supabase
      .from('ligas')
      .update(updateData)
      .eq('id', ligaId);

    if (updateError) {
      return NextResponse.json(
        { error: updateError.message },
        { status: 500 }
      );
    }

    // El trigger automáticamente creará el log de acceso
    
    return NextResponse.json(
      { message: `Liga ${action === 'authorize' ? 'autorizada' : action === 'suspend' ? 'suspendida' : 'reactivada'} exitosamente` },
      { status: 200 }
    );

  } catch (error) {
    console.error('Error in authorize action:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}