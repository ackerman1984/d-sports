import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth-options';
import { createClient } from '@supabase/supabase-js';

export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user || session.user.role !== 'jugador') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const body = await request.json();
    const { fechaNacimiento, posicion } = body;
    
    console.log('🧪 TEST UPDATE - Datos recibidos:', {
      fechaNacimiento, 
      posicion,
      userId: session.user.id
    });

    // Crear cliente directo con service role
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    // Actualización super simple
    const { data: updateResult, error: updateError } = await supabase
      .from('jugadores')
      .update({
        fecha_nacimiento: fechaNacimiento,
        posicion: posicion,
        updated_at: new Date().toISOString()
      })
      .eq('id', session.user.id)
      .select();

    console.log('🧪 TEST UPDATE - Resultado:', {
      data: updateResult,
      error: updateError,
      affected: updateResult?.length || 0
    });

    if (updateError) {
      console.error('❌ Error en test update:', updateError);
      return NextResponse.json({ error: updateError.message }, { status: 400 });
    }

    return NextResponse.json({ 
      message: 'Test update exitoso',
      affected: updateResult?.length || 0,
      data: updateResult
    });

  } catch (error) {
    console.error('💥 Error en test update:', error);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}