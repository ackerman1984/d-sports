import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const codigoAcceso = request.cookies.get('anotador_codigo')?.value;

    if (!codigoAcceso) {
      return NextResponse.json({ error: 'No hay sesión activa' }, { status: 401 });
    }

    const { data: anotador, error } = await supabase
      .from('anotadores')
      .select(`
        id,
        nombre,
        email,
        liga_id,
        ligas:liga_id (
          id,
          nombre,
          codigo
        )
      `)
      .eq('codigo_acceso', codigoAcceso)
      .single();

    if (error || !anotador) {
      return NextResponse.json({ error: 'Sesión inválida' }, { status: 401 });
    }

    // Safe access to liga data
    const ligaData = Array.isArray((anotador as any).ligas) ? (anotador as any).ligas[0] : (anotador as any).ligas;

    return NextResponse.json({
      session: {
        anotador: {
          id: anotador.id,
          nombre: anotador.nombre,
          email: anotador.email,
          liga_id: anotador.liga_id,
          liga: {
            id: ligaData?.id,
            nombre: ligaData?.nombre,
            codigo: ligaData?.codigo
          }
        }
      }
    });

  } catch (error) {
    console.error('Error en sesión de anotador:', error);
    return NextResponse.json({ error: 'Error del servidor' }, { status: 500 });
  }
}