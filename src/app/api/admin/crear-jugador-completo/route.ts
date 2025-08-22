import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth-options';
import { createAdminClient } from '@/lib/supabase/admin-client';

export async function POST(request: NextRequest) {
  try {
    console.log('🚀 CREAR JUGADOR COMPLETO - Inicio');
    
    const session = await getServerSession(authOptions);
    
    if (!session || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const body = await request.json();
    const { nombre, email, password, telefono, fecha_nacimiento, numero_casaca, equipo_id, posicion, estado } = body;

    console.log('📧 Creando cuenta para:', email);

    // Validaciones básicas
    if (!nombre || !email || !password || !equipo_id) {
      return NextResponse.json({ 
        error: 'Nombre, email, contraseña y equipo son obligatorios' 
      }, { status: 400 });
    }

    // Usar admin client para operaciones completas
    const supabase = createAdminClient();

    // PASO 0: Verificar si el email ya existe en Auth o base de datos
    console.log('🔍 Verificando si el email ya existe...');
    
    // Verificar en jugadores primero
    const { data: existingPlayer } = await supabase
      .from('jugadores')
      .select('id, email')
      .eq('email', email)
      .eq('liga_id', session.user.ligaId)
      .single();

    if (existingPlayer) {
      return NextResponse.json({ 
        error: 'Ya existe un jugador con este email en la liga' 
      }, { status: 400 });
    }

    // Verificar si ya existe en Auth (para evitar duplicados)
    try {
      const { data: existingAuthUsers } = await supabase.auth.admin.listUsers();
      const userExists = existingAuthUsers.users.some(user => user.email === email);

      if (userExists) {
        // Buscar y eliminar usuario duplicado si no tiene datos en la DB
        const existingAuthUser = existingAuthUsers.users.find(user => user.email === email);
        if (existingAuthUser) {
          // Verificar si tiene datos en usuarios table
          const { data: existingUserProfile } = await supabase
            .from('usuarios')
            .select('id')
            .eq('id', existingAuthUser.id)
            .single();

          if (!existingUserProfile) {
            // Es un usuario Auth huérfano, eliminarlo
            console.log('🗑️ Eliminando usuario Auth huérfano:', existingAuthUser.id);
            await supabase.auth.admin.deleteUser(existingAuthUser.id);
          } else {
            return NextResponse.json({ 
              error: 'Ya existe una cuenta completa con este email' 
            }, { status: 400 });
          }
        }
      }
    } catch (cleanupError) {
      console.warn('⚠️ Error en limpieza de usuarios duplicados:', cleanupError);
    }

    // PASO 1: Crear usuario en Supabase Auth PRIMERO
    console.log('🔐 Creando cuenta Auth...');
    console.log('📧 Email:', email);
    console.log('🔑 Password length:', password.length);
    
    let { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: email,
      password: password,
      email_confirm: true,
      user_metadata: {
        name: nombre,
        liga_id: session.user.ligaId,
        role: 'jugador'
      }
    });

    if (authError || !authData.user) {
      console.error('❌ Error creating Auth user:', authError);
      
      // Si el error es que ya existe, intentar obtener el usuario existente
      if (authError?.code === 'email_exists') {
        try {
          const { data: existingUsers } = await supabase.auth.admin.listUsers();
          const existingUser = existingUsers.users.find(u => u.email === email);
          if (existingUser) {
            console.log('🔄 Usando usuario Auth existente:', existingUser.id);
            authData = { user: existingUser };
          } else {
            return NextResponse.json({ 
              error: 'Email ya está en uso pero no se puede acceder al usuario' 
            }, { status: 400 });
          }
        } catch (findError) {
          console.error('❌ Error buscando usuario existente:', findError);
          return NextResponse.json({ 
            error: 'Error al crear cuenta Auth: ' + (authError?.message || 'Error desconocido')
          }, { status: 500 });
        }
      } else {
        return NextResponse.json({ 
          error: 'Error al crear cuenta Auth: ' + (authError?.message || 'Error desconocido')
        }, { status: 500 });
      }
    }

    const usuarioId = authData.user.id;
    console.log('✅ Usuario Auth creado con ID:', usuarioId);

    // PASO 2: Crear perfil en tabla usuarios (siempre para jugadores nuevos)
    console.log('👤 Creando perfil de usuario...');
    const userData = {
      id: usuarioId,
      email: email,
      nombre: nombre,
      role: 'jugador',
      liga_id: session.user.ligaId,
      activo: true,
      password_temporal: true, // Marcar para cambio de contraseña
    };

    const { data: newUser, error: userError } = await supabase
      .from('usuarios')
      .upsert([userData])
      .select()
      .single();

    if (userError) {
      console.error('❌ Error creating user profile:', userError);
      return NextResponse.json({ 
        error: 'Error al crear perfil de usuario: ' + userError.message 
      }, { status: 500 });
    }

    console.log('✅ Perfil de usuario creado');

    // PASO 3: Crear jugador
    console.log('⚾ Creando jugador...');
    const playerData = {
      id: usuarioId,
      nombre: nombre,
      email: email,
      telefono: telefono || null,
      fecha_nacimiento: fecha_nacimiento || null,
      numero_casaca: numero_casaca ? parseInt(numero_casaca.toString()) : null,
      equipo_id: equipo_id,
      liga_id: session.user.ligaId,
      posicion: posicion || 'No especificada',
      estado: estado || 'activo',
      activo: true,
      password_temporal: true,
      created_by: session.user.id,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const { data: newPlayer, error: playerError } = await supabase
      .from('jugadores')
      .upsert([playerData])
      .select(`
        *,
        equipo:equipos(*)
      `)
      .single();

    if (playerError) {
      console.error('❌ Error creating player:', playerError);
      // Cleanup: eliminar perfil de usuario
      await supabase.from('usuarios').delete().eq('id', usuarioId);
      return NextResponse.json({ 
        error: 'Error al crear jugador: ' + playerError.message 
      }, { status: 500 });
    }

    console.log('✅ Jugador creado exitosamente');

    // PASO 4: Crear estadísticas iniciales
    const { error: statsError } = await supabase
      .from('estadisticas_jugador')
      .insert([{
        jugador_id: newPlayer.id,
        temporada: '2025',
        juegos_jugados: 0,
        turnos_al_bate: 0,
        hits: 0,
        carreras_anotadas: 0,
        carreras_impulsadas: 0,
        home_runs: 0,
        dobles: 0,
        triples: 0,
        bases_robadas: 0,
        ponches: 0,
        bases_por_bolas: 0,
        errores: 0,
        promedio_bateo: 0.000,
        porcentaje_embase: 0.000,
        porcentaje_slugging: 0.000,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }]);

    if (statsError) {
      console.warn('⚠️ Error creating initial stats:', statsError);
    }

    // Respuesta exitosa
    const message = `✅ ¡Jugador creado exitosamente!

👤 **${nombre}** ya puede hacer login directamente
📧 **Email**: ${email}
🔑 **Contraseña**: ${password}

📋 **INSTRUCCIONES PARA EL JUGADOR:**
1️⃣ Ir directamente al formulario de Login
2️⃣ Usar email: ${email}
3️⃣ Usar contraseña: ${password}
4️⃣ ¡Listo! Ya puede acceder a su cuenta

⚠️ **IMPORTANTE**: Debe cambiar su contraseña en el primer login`;

    return NextResponse.json({ 
      jugador: newPlayer, 
      message,
      credenciales: {
        email: email,
        password: password
      },
      success: true
    }, { status: 201 });

  } catch (error) {
    console.error('💥 Error in crear-jugador-completo:', error);
    return NextResponse.json({ 
      error: 'Error interno del servidor: ' + (error instanceof Error ? error.message : 'Error desconocido')
    }, { status: 500 });
  }
}