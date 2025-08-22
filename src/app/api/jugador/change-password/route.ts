import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth-options';
import { createAdminClient } from '@/lib/supabase/admin-client';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    console.log('🔐 Starting password change request');
    
    const session = await getServerSession(authOptions);
    
    if (!session?.user || session.user.role !== 'jugador') {
      console.log('❌ Unauthorized access attempt');
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const body = await request.json();
    const { currentPassword, newPassword } = body;

    console.log('🔍 Password change for user:', session.user.id);

    // Validaciones básicas
    if (!currentPassword || !newPassword) {
      return NextResponse.json({ 
        error: 'Contraseña actual y nueva contraseña son requeridas' 
      }, { status: 400 });
    }

    if (currentPassword === newPassword) {
      return NextResponse.json({ 
        error: 'La nueva contraseña debe ser diferente a la actual' 
      }, { status: 400 });
    }

    // Validar nueva contraseña
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*(),.?":{}|<>]).{8,}$/;
    if (!passwordRegex.test(newPassword)) {
      return NextResponse.json({ 
        error: 'La nueva contraseña debe tener al menos 8 caracteres, una mayúscula, una minúscula, un número y un carácter especial' 
      }, { status: 400 });
    }

    // Verificar contraseña actual usando signInWithPassword
    const testClient = createAdminClient();
    
    console.log('🔐 Verifying current password...');
    const { data: signInData, error: signInError } = await testClient.auth.signInWithPassword({
      email: session.user.email!,
      password: currentPassword,
    });

    if (signInError || !signInData.user) {
      console.log('❌ Current password verification failed:', signInError?.message);
      return NextResponse.json({ 
        error: 'La contraseña actual es incorrecta' 
      }, { status: 400 });
    }

    console.log('✅ Current password verified');

    // Cambiar contraseña usando admin client
    const adminClient = createAdminClient();
    
    console.log('🔄 Updating password...');
    const { data: updateData, error: updateError } = await adminClient.auth.admin.updateUserById(
      session.user.id,
      {
        password: newPassword
      }
    );

    if (updateError) {
      console.error('❌ Error updating password:', updateError);
      return NextResponse.json({ 
        error: 'Error al actualizar la contraseña: ' + updateError.message 
      }, { status: 500 });
    }

    console.log('✅ Password updated successfully');

    // Actualizar flag password_temporal en base de datos
    const supabase = await createClient();
    
    console.log('🔄 Updating password_temporal flags...');
    
    // Actualizar en tabla usuarios
    const { error: usuarioUpdateError } = await adminClient
      .from('usuarios')
      .update({ 
        password_temporal: false,
        updated_at: new Date().toISOString()
      })
      .eq('id', session.user.id);

    if (usuarioUpdateError) {
      console.warn('⚠️ Warning: Could not update usuarios password_temporal flag:', usuarioUpdateError);
    }

    // Actualizar en tabla jugadores  
    const { error: jugadorUpdateError } = await adminClient
      .from('jugadores')
      .update({ 
        password_temporal: false,
        updated_at: new Date().toISOString()
      })
      .eq('id', session.user.id);

    if (jugadorUpdateError) {
      console.warn('⚠️ Warning: Could not update jugadores password_temporal flag:', jugadorUpdateError);
    }

    console.log('✅ Password change completed successfully');

    return NextResponse.json({ 
      message: 'Contraseña actualizada exitosamente. Ya puedes usar el sistema con normalidad.',
      success: true
    });

  } catch (error) {
    console.error('💥 Error in password change:', error);
    return NextResponse.json({ 
      error: 'Error interno del servidor: ' + (error instanceof Error ? error.message : 'Error desconocido')
    }, { status: 500 });
  }
}