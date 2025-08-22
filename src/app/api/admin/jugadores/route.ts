import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin-client';
import { authOptions } from '@/lib/auth/auth-options';
import { randomUUID } from 'crypto';

// GET - Obtener todos los jugadores
export async function GET(_request: NextRequest) {
  try {
    console.log('🚀 Starting GET /api/admin/jugadores');
    console.log('🍪 Headers:', Object.keys(_request.headers));
    console.log('🍪 Cookie header:', _request.headers.get('cookie'));
    
    const session = await getServerSession(authOptions);
    console.log('👤 Full session object:', JSON.stringify(session, null, 2));
    console.log('👤 Session user:', session?.user);
    console.log('👤 User role:', session?.user?.role);
    console.log('👤 Liga ID:', session?.user?.ligaId);
    
    if (!session) {
      console.log('❌ No session found');
      return NextResponse.json({ error: 'No hay sesión activa' }, { status: 401 });
    }
    
    if (!session.user) {
      console.log('❌ No user in session');
      return NextResponse.json({ error: 'No hay usuario en la sesión' }, { status: 401 });
    }
    
    if (session.user.role !== 'admin') {
      console.log('❌ User is not admin, role:', session.user.role);
      return NextResponse.json({ error: 'Usuario no es administrador' }, { status: 403 });
    }

    console.log('🔧 Creating Supabase client...');
    const supabase = await createClient();
    console.log('✅ Supabase client created');
    
    // Primero intentemos una consulta simple
    console.log('🔍 Querying jugadores for liga_id:', session.user.ligaId);
    
    // Consulta con manejo explícito de relaciones
    const { data: jugadores, error } = await supabase
      .from('jugadores')
      .select(`
        id,
        nombre,
        email,
        fecha_nacimiento,
        numero_casaca,
        estado,
        foto_url,
        liga_id,
        equipo_id,
        created_at,
        updated_at,
        equipo:equipos(
          id,
          nombre,
          color,
          descripcion
        )
      `)
      .eq('liga_id', session.user.ligaId)
      .order('created_at', { ascending: false });

    console.log('📊 Query result - Error:', error);
    console.log('📊 Query result - Data count:', jugadores?.length || 0);
    if (jugadores && jugadores.length > 0) {
      console.log('👤 First player sample:', JSON.stringify(jugadores[0], null, 2));
    }

    if (error) {
      console.error('❌ Database error:', error);
      return NextResponse.json({ 
        error: 'Error al obtener jugadores', 
        details: error.message,
        code: error.code 
      }, { status: 500 });
    }

    console.log('✅ Success! Found', jugadores?.length || 0, 'players');
    return NextResponse.json({ jugadores: jugadores || [] });

  } catch (error) {
    console.error('💥 Unexpected error in GET /api/admin/jugadores:', error);
    return NextResponse.json({ 
      error: 'Error interno del servidor',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// POST - Crear nuevo jugador
export async function POST(request: NextRequest) {
  try {
    console.log('🚀 Starting POST /api/admin/jugadores');
    
    const session = await getServerSession(authOptions);
    console.log('👤 POST Session user:', session?.user);
    console.log('👤 POST Liga ID:', session?.user?.ligaId);
    
    if (!session || session.user.role !== 'admin') {
      console.log('❌ POST No autorizado');
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const body = await request.json();

    // Validar campos requeridos
    if (!body.nombre || !body.email) {
      return NextResponse.json({ 
        error: 'Nombre y email son campos requeridos' 
      }, { status: 400 });
    }

    // Implementar flujo de contraseña temporal
    console.log('🔧 Creando jugador con contraseña temporal...');
    
    // Verificar variables de entorno necesarias
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      console.error('❌ SUPABASE_SERVICE_ROLE_KEY no está configurada');
      return NextResponse.json({ 
        error: 'Error de configuración del servidor: falta SUPABASE_SERVICE_ROLE_KEY' 
      }, { status: 500 });
    }

    // Verificar que el liga_id sea válido
    if (!session.user.ligaId) {
      console.error('❌ Usuario admin sin liga_id');
      return NextResponse.json({ 
        error: 'Usuario administrador no tiene liga asignada' 
      }, { status: 400 });
    }

    const supabase = await createClient();
    
    // Verificar que la liga existe
    const { data: liga, error: ligaError } = await supabase
      .from('ligas')
      .select('id, nombre')
      .eq('id', session.user.ligaId)
      .single();

    if (ligaError || !liga) {
      console.error('❌ Liga no válida:', session.user.ligaId, ligaError);
      return NextResponse.json({ 
        error: 'Liga no válida o no existe' 
      }, { status: 400 });
    }

    console.log('✅ Liga válida:', liga.nombre);

    // Verificar si el jugador ya existe por email y liga
    const { data: existingPlayer } = await supabase
      .from('jugadores')
      .select('id, email')
      .eq('email', body.email)
      .eq('liga_id', session.user.ligaId)
      .single();

    if (existingPlayer) {
      return NextResponse.json({ 
        error: 'Ya existe un jugador con este email en la liga' 
      }, { status: 400 });
    }
    
    // SOLUCIÓN DEFINITIVA: Crear jugador sin Auth automático
    // El jugador se registra posteriormente y el sistema los vincula por email
    console.log('🔧 Creando jugador para registro posterior...');
    
    const usuarioId = randomUUID();
    const temporalPassword = 'Temporal123!'; // Sugerencia para el admin
    
    console.log('🆔 ID generado para jugador:', usuarioId);
    console.log('📧 Email del jugador:', body.email);
    console.log('💡 Contraseña sugerida:', temporalPassword);

    // Crear el jugador con todos los datos específicos
    const playerData = {
      id: usuarioId,
      nombre: body.nombre,
      email: body.email,
      telefono: body.telefono || null,
      foto_url: body.foto_url || null,
      equipo_id: body.equipo_id || null,
      liga_id: session.user.ligaId,
      numero_casaca: body.numero_casaca || null,
      posicion: body.posicion || 'No especificada',
      fecha_nacimiento: body.fecha_nacimiento || null,
      estado: 'pendiente_registro', // Especial para jugadores sin Auth
      activo: true,
      password_temporal: true,
      created_by: session.user.id,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    console.log('📝 Creando jugador con datos:');
    console.log('   - Nombre:', playerData.nombre);
    console.log('   - Email:', playerData.email);
    console.log('   - ID:', playerData.id);
    console.log('   - Liga ID:', playerData.liga_id);
    console.log('📊 Datos completos del jugador:', JSON.stringify(playerData, null, 2));

    const { data: newPlayer, error: playerError } = await supabase
      .from('jugadores')
      .insert([playerData])
      .select(`
        *,
        equipo:equipos(*)
      `)
      .single();

    if (playerError) {
      console.error('Error creating player:', playerError);
      return NextResponse.json({ 
        error: 'Error al crear jugador: ' + playerError.message,
        details: playerError
      }, { status: 500 });
    }

    // Crear estadísticas iniciales para el jugador
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
      console.warn('Error creating initial stats:', statsError);
    }

    const message = `✅ Jugador creado exitosamente! 

👤 **${body.nombre}** ha sido registrado en el sistema
📧 **Email**: ${body.email}
🏟️ **Equipo**: Asignado

📋 **INSTRUCCIONES PARA EL JUGADOR:**

1️⃣ **Ir a**: [Tu URL de login]/login
2️⃣ **Click en "Crear cuenta"** 
3️⃣ **Registrarse con email**: ${body.email}
4️⃣ **Usar contraseña sugerida**: ${temporalPassword} (o cualquier otra)
5️⃣ **Acceder normalmente** al sistema

ℹ️ **Nota**: Una vez registrado, el jugador será vinculado automáticamente a este perfil.`;

    return NextResponse.json({ 
      jugador: newPlayer, 
      message,
      instrucciones: {
        email: body.email,
        passwordSugerida: temporalPassword,
        pasos: [
          "Ir a la página de login",
          "Click en 'Crear cuenta'", 
          "Registrarse con el email proporcionado",
          "Usar contraseña sugerida o crear una propia",
          "Acceder al sistema normalmente"
        ]
      }
    }, { status: 201 });

  } catch (error) {
    console.error('Error in POST /api/admin/jugadores:', error);
    return NextResponse.json({ 
      error: 'Error interno del servidor: ' + (error instanceof Error ? error.message : 'Error desconocido'),
      details: error instanceof Error ? error.stack : error
    }, { status: 500 });
  }
}

// PUT - Actualizar jugador existente
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const body = await request.json();
    const { id, ...updateData } = body;
    
    if (!id) {
      return NextResponse.json({ error: 'ID de jugador requerido' }, { status: 400 });
    }

    const supabase = await createClient();

    const playerData = {
      ...updateData,
      updated_at: new Date().toISOString()
    };

    const { data: updatedPlayer, error } = await supabase
      .from('jugadores')
      .update(playerData)
      .eq('id', id)
      .eq('liga_id', session.user.ligaId) // Verificar que pertenece a la liga
      .select(`
        *,
        equipo:equipos(*)
      `)
      .single();

    if (error) {
      console.error('Error updating player:', error);
      return NextResponse.json({ error: 'Error al actualizar jugador' }, { status: 500 });
    }

    if (!updatedPlayer) {
      return NextResponse.json({ error: 'Jugador no encontrado' }, { status: 404 });
    }

    // Actualizar también la tabla usuarios (solo campos básicos)
    const usuarioUpdateData = {
      nombre: updateData.nombre,
    };

    const { error: usuarioError } = await supabase
      .from('usuarios')
      .update(usuarioUpdateData)
      .eq('id', id);

    if (usuarioError) {
      console.warn('Error updating usuario:', usuarioError);
    }

    return NextResponse.json({ 
      jugador: updatedPlayer, 
      message: 'Jugador actualizado exitosamente' 
    });

  } catch (error) {
    console.error('Error in PUT /api/admin/jugadores:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}

// DELETE - Eliminar jugador
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const playerId = searchParams.get('id');
    
    if (!playerId) {
      return NextResponse.json({ error: 'ID de jugador requerido' }, { status: 400 });
    }

    const supabase = await createClient();

    // Primero eliminar las estadísticas del jugador
    const { error: statsError } = await supabase
      .from('estadisticas_jugador')
      .delete()
      .eq('jugador_id', playerId);

    if (statsError) {
      console.warn('Error deleting player stats:', statsError);
    }

    // Luego eliminar el jugador
    const { error: playerError } = await supabase
      .from('jugadores')
      .delete()
      .eq('id', playerId)
      .eq('liga_id', session.user.ligaId); // Verificar que pertenece a la liga

    if (playerError) {
      console.error('Error deleting player:', playerError);
      return NextResponse.json({ error: 'Error al eliminar jugador' }, { status: 500 });
    }

    return NextResponse.json({ 
      message: 'Jugador eliminado exitosamente' 
    });

  } catch (error) {
    console.error('Error in DELETE /api/admin/jugadores:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}