import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const response = NextResponse.json({ message: 'Sesión cerrada exitosamente' });
    
    // Eliminar la cookie de sesión del anotador
    response.cookies.set('anotador_codigo', '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 0, // Eliminar inmediatamente
      path: '/'
    });

    return response;

  } catch (error) {
    console.error('Error cerrando sesión:', error);
    return NextResponse.json({ error: 'Error del servidor' }, { status: 500 });
  }
}