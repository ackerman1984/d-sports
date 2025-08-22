import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { codigo } = body;

    // Validaciones
    if (!codigo) {
      return NextResponse.json(
        { error: 'Código de acceso es requerido' },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    console.log('🔐 Intento de login anotador:', {
      codigo: codigo.toUpperCase(),
      timestamp: new Date().toISOString()
    });

    // Buscar anotador solo por código
    const { data: anotador, error: searchError } = await supabase
      .from('anotadores')
      .select(`
        id,
        nombre,
        email,
        codigo_acceso,
        activo,
        liga_id,
        ligas:liga_id (
          id,
          nombre,
          codigo
        )
      `)
      .eq('codigo_acceso', codigo.toUpperCase())
      .eq('activo', true)
      .single();

    console.log('Anotador encontrado:', anotador);

    if (searchError || !anotador) {
      console.log('Login fallido: Anotador no encontrado con código:', codigo.toUpperCase());
      return NextResponse.json(
        { error: 'Código de acceso inválido. Verifica tu código.' },
        { status: 401 }
      );
    }

    if (!anotador.activo) {
      return NextResponse.json(
        { error: 'Tu cuenta está desactivada. Contacta al administrador.' },
        { status: 401 }
      );
    }

    console.log('Login exitoso para anotador:', anotador.nombre);

    // Crear respuesta con cookie de sesión
    const response = NextResponse.json({
      success: true,
      message: 'Login exitoso',
      anotador: {
        id: anotador.id,
        nombre: anotador.nombre,
        email: anotador.email,
        liga: {
          id: Array.isArray(anotador.ligas) ? anotador.ligas[0]?.id : anotador.ligas?.id,
          nombre: Array.isArray(anotador.ligas) ? anotador.ligas[0]?.nombre : anotador.ligas?.nombre,
          codigo: Array.isArray(anotador.ligas) ? anotador.ligas[0]?.codigo : anotador.ligas?.codigo
        }
      }
    });

    // Establecer cookie de sesión del anotador (válida por 24 horas)
    response.cookies.set('anotador_codigo', codigo.toUpperCase(), {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24, // 24 horas
      path: '/'
    });

    return response;

  } catch (error) {
    console.error('Error en login de anotador:', error);
    return NextResponse.json({ error: 'Error del servidor' }, { status: 500 });
  }
}