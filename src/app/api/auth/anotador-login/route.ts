import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { codigo } = body;

    if (!codigo) {
      return NextResponse.json(
        { error: 'Código de acceso requerido' },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // Buscar anotador por código de acceso
    const { data: anotador, error } = await supabase
      .from('anotadores')
      .select(`
        *,
        liga:ligas!liga_id (
          id,
          nombre,
          codigo,
          subdominio
        )
      `)
      .eq('codigo_acceso', codigo.toUpperCase())
      .eq('activo', true)
      .single();

    if (error || !anotador) {
      return NextResponse.json(
        { error: 'Código de acceso inválido o anotador inactivo' },
        { status: 401 }
      );
    }

    // Crear sesión temporal del anotador
    const sessionData = {
      anotador: {
        id: anotador.id,
        nombre: anotador.nombre,
        email: anotador.email,
        telefono: anotador.telefono,
        foto_url: anotador.foto_url,
        liga_id: anotador.liga_id,
        liga: anotador.liga
      },
      loginTime: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString() // 8 horas
    };

    // Guardar sesión en cookie
    const cookieStore = await cookies();
    cookieStore.set('anotador-session', JSON.stringify(sessionData), {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 8 * 60 * 60, // 8 horas
      path: '/'
    });

    // Log del acceso
    console.log(`Anotador ${anotador.nombre} (${anotador.email}) accedió a liga ${anotador.liga.nombre}`);

    return NextResponse.json({
      success: true,
      message: 'Acceso autorizado',
      anotador: {
        id: anotador.id,
        nombre: anotador.nombre,
        email: anotador.email,
        liga: anotador.liga.nombre
      }
    });

  } catch (error) {
    console.error('Anotador login error:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}