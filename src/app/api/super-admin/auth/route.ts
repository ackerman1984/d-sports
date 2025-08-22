import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin-client';

export async function POST(request: NextRequest) {
  try {
    const { email, masterCode } = await request.json();

    if (!email || !masterCode) {
      return NextResponse.json(
        { error: 'Email y código maestro son requeridos' },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();

    // Verificar credenciales de super admin
    const { data: superAdmin, error } = await supabase
      .from('super_admins')
      .select('*')
      .eq('email', email)
      .eq('master_code', masterCode)
      .eq('active', true)
      .single();

    if (error || !superAdmin) {
      return NextResponse.json(
        { error: 'Credenciales inválidas' },
        { status: 401 }
      );
    }

    // Crear token de sesión temporal (en producción usar JWT)
    const sessionToken = Buffer.from(`${email}:${masterCode}:${Date.now()}`).toString('base64');

    return NextResponse.json(
      { 
        message: 'Autenticación exitosa',
        token: sessionToken,
        superAdmin: {
          id: superAdmin.id,
          email: superAdmin.email,
          name: superAdmin.name
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