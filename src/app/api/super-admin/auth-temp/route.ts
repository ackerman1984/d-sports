import { NextRequest, NextResponse } from 'next/server';

// API temporal para probar super admin sin migración
export async function POST(request: NextRequest) {
  try {
    const { email, masterCode } = await request.json();

    if (!email || !masterCode) {
      return NextResponse.json(
        { error: 'Email y código maestro son requeridos' },
        { status: 400 }
      );
    }

    // Credenciales temporales hardcodeadas para pruebas
    const validCredentials = [
      { email: 'creator@baseball-saas.com', code: 'MASTER-2024-BASEBALL' },
      { email: 'admin@test.com', code: 'TEST123' }
    ];

    const isValid = validCredentials.some(
      cred => cred.email === email && cred.code === masterCode
    );

    if (!isValid) {
      return NextResponse.json(
        { error: 'Credenciales inválidas' },
        { status: 401 }
      );
    }

    // Crear token de sesión temporal
    const sessionToken = Buffer.from(`${email}:${masterCode}:${Date.now()}`).toString('base64');

    return NextResponse.json(
      { 
        message: 'Autenticación exitosa (modo temporal)',
        token: sessionToken,
        superAdmin: {
          id: 'temp-id',
          email: email,
          name: 'Super Admin (Temporal)'
        }
      },
      { status: 200 }
    );

  } catch (error) {
    console.error('Super admin auth error:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}