import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth-options';
import { createAdminClient } from '@/lib/supabase/admin-client';

export async function POST(request: NextRequest) {
  try {
    console.log('🐛 DEBUG: Starting jugador creation test');
    
    const session = await getServerSession(authOptions);
    console.log('🐛 Session check:', {
      exists: !!session,
      user: session?.user?.id,
      role: session?.user?.role,
      ligaId: session?.user?.ligaId
    });
    
    if (!session || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const body = await request.json();
    console.log('🐛 Request body:', body);

    // Paso 1: Verificar variables de entorno
    console.log('🐛 PASO 1: Verificando variables de entorno');
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return NextResponse.json({ error: 'SUPABASE_SERVICE_ROLE_KEY missing' }, { status: 500 });
    }
    console.log('✅ Variables de entorno OK');

    // Paso 2: Crear admin client
    console.log('🐛 PASO 2: Creando admin client');
    const adminClient = createAdminClient();
    console.log('✅ Admin client creado');

    // Paso 3: Crear usuario Auth
    console.log('🐛 PASO 3: Creando usuario Auth');
    const temporalPassword = 'Temporal123!';
    const testEmail = body.email || 'debug-' + Date.now() + '@test.com';
    
    const { data: authUser, error: authError } = await adminClient.auth.admin.createUser({
      email: testEmail,
      password: temporalPassword,
      email_confirm: true,
    });

    if (authError) {
      console.log('❌ Auth error:', authError);
      return NextResponse.json({ 
        error: 'Auth creation failed',
        details: authError,
        step: 'auth_creation'
      }, { status: 500 });
    }
    console.log('✅ Usuario Auth creado:', authUser.user.id);

    // Paso 4: Crear perfil usuario
    console.log('🐛 PASO 4: Creando perfil usuario');
    const userData = {
      id: authUser.user.id,
      email: testEmail,
      nombre: body.nombre || 'Test User',
      role: 'jugador',
      liga_id: session.user.ligaId,
      activo: true,
      password_temporal: true,
    };
    
    const { data: newUser, error: userError } = await adminClient
      .from('usuarios')
      .insert([userData])
      .select()
      .single();

    if (userError) {
      console.log('❌ User profile error:', userError);
      // Cleanup auth user
      await adminClient.auth.admin.deleteUser(authUser.user.id);
      return NextResponse.json({ 
        error: 'User profile creation failed',
        details: userError,
        step: 'user_profile'
      }, { status: 500 });
    }
    console.log('✅ Perfil usuario creado:', newUser.id);

    // Paso 5: Crear jugador
    console.log('🐛 PASO 5: Creando jugador');
    const playerData = {
      id: authUser.user.id,
      nombre: body.nombre || 'Test User',
      email: testEmail,
      telefono: body.telefono || null,
      foto_url: body.foto_url || null,
      equipo_id: body.equipo_id || null,
      liga_id: session.user.ligaId,
      numero_casaca: body.numero_casaca || null,
      posicion: body.posicion || 'No especificada',
      fecha_nacimiento: body.fecha_nacimiento || null,
      estado: body.estado || 'activo',
      activo: true,
      password_temporal: true,
      created_by: session.user.id,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const { data: newPlayer, error: playerError } = await adminClient
      .from('jugadores')
      .insert([playerData])
      .select()
      .single();

    if (playerError) {
      console.log('❌ Player creation error:', playerError);
      // Cleanup
      await adminClient.auth.admin.deleteUser(authUser.user.id);
      return NextResponse.json({ 
        error: 'Player creation failed',
        details: playerError,
        step: 'player_creation'
      }, { status: 500 });
    }
    console.log('✅ Jugador creado:', newPlayer.id);

    return NextResponse.json({ 
      success: true,
      message: 'Debug creation successful',
      data: {
        authUser: authUser.user.id,
        userProfile: newUser.id,
        player: newPlayer.id,
        credentials: {
          email: testEmail,
          password: temporalPassword
        }
      }
    });

  } catch (error) {
    console.error('🐛 DEBUG ERROR:', error);
    return NextResponse.json({ 
      error: 'Debug creation failed',
      details: error instanceof Error ? error.message : error
    }, { status: 500 });
  }
}