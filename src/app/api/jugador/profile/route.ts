import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth-options';
import { createClient } from '@/lib/supabase/server';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';

// GET: Obtener perfil del jugador
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user || session.user.role !== 'jugador') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const supabase = await createClient();
    
    // Obtener datos del usuario (usar maybeSingle para evitar error si no existe)
    const { data: usuario, error: usuarioError } = await supabase
      .from('usuarios')
      .select('*')
      .eq('id', session.user.id)
      .maybeSingle();

    if (usuarioError) {
      console.error('Error obteniendo usuario:', usuarioError);
      return NextResponse.json({ error: 'Error al obtener datos del usuario' }, { status: 400 });
    }

    // Obtener datos del jugador desde tabla jugadores con equipo
    const { data: jugador, error: jugadorError } = await supabase
      .from('jugadores')
      .select(`
        nombre,
        email,
        numero_casaca, 
        fecha_nacimiento, 
        posicion, 
        foto_url,
        telefono,
        equipo_id,
        liga_id,
        estado,
        activo,
        equipo:equipos(
          id,
          nombre,
          color
        )
      `)
      .eq('id', session.user.id)
      .maybeSingle();

    if (jugadorError) {
      console.error('Error obteniendo jugador:', jugadorError);
      return NextResponse.json({ error: 'Error al obtener datos del jugador' }, { status: 400 });
    }

    // Si no encontramos datos ni en usuarios ni en jugadores, hay un problema
    if (!usuario && !jugador) {
      console.error('No se encontraron datos del usuario ni jugador para ID:', session.user.id);
      return NextResponse.json({ error: 'Perfil no encontrado' }, { status: 404 });
    }

    // Combinar datos - priorizar datos de tabla jugadores cuando existan
    const profile = {
      id: session.user.id,
      nombre: jugador?.nombre || usuario?.nombre || session.user.name || '',
      email: jugador?.email || usuario?.email || session.user.email || '',
      telefono: jugador?.telefono || '',
      numeroCasaca: jugador?.numero_casaca || null,
      fechaNacimiento: jugador?.fecha_nacimiento || '',
      posicion: jugador?.posicion || '',
      fotoUrl: jugador?.foto_url || '',
      equipoId: jugador?.equipo_id || null,
      ligaId: jugador?.liga_id || usuario?.liga_id || session.user.ligaId,
      role: usuario?.role || 'jugador',
      password_temporal: usuario?.password_temporal || false,
      equipo: jugador?.equipo || null
    };

    return NextResponse.json({ profile });

  } catch (error) {
    console.error('Error en GET profile:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}

// PUT: Actualizar perfil del jugador
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user || session.user.role !== 'jugador') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const body = await request.json();
    const { nombre, email, telefono, fechaNacimiento, posicion, fotoUrl, numeroCasaca } = body;

    console.log('🔄 ACTUALIZACIÓN COMPLETA - Datos recibidos:', { 
      nombre,
      email,
      telefono,
      fechaNacimiento, 
      posicion,
      fotoUrl: fotoUrl ? `imagen de ${fotoUrl.length} chars` : 'sin imagen',
      numeroCasaca,
      userId: session.user.id 
    });

    // Crear cliente directo con service role (igual que el script que funcionó)
    const supabase = createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    // 1. Actualizar tabla usuarios (campos básicos)
    console.log('📝 Actualizando tabla usuarios...');
    const { error: userError } = await supabase
      .from('usuarios')
      .update({
        nombre: nombre,
        updated_at: new Date().toISOString()
      })
      .eq('id', session.user.id);

    if (userError) {
      console.error('❌ Error actualizando usuarios:', userError);
      return NextResponse.json({ error: userError.message }, { status: 400 });
    }

    // 2. Actualizar tabla jugadores (campos específicos)
    console.log('📝 Actualizando tabla jugadores...');
    const updateData = {
      nombre: nombre,
      email: email,
      telefono: telefono || null,
      fecha_nacimiento: fechaNacimiento || null, // Null si está vacío
      posicion: posicion || null,
      foto_url: fotoUrl || null,
      numero_casaca: numeroCasaca || null,
      updated_at: new Date().toISOString()
    };

    const { data: updateResult, error: jugadorError } = await supabase
      .from('jugadores')
      .update(updateData)
      .eq('id', session.user.id)
      .select();

    console.log('✅ Resultado actualización:', {
      data: updateResult,
      error: jugadorError,
      affected: updateResult?.length || 0
    });

    if (jugadorError) {
      console.error('❌ Error actualizando jugadores:', jugadorError);
      return NextResponse.json({ error: jugadorError.message }, { status: 400 });
    }

    if (!updateResult || updateResult.length === 0) {
      console.error('❌ No se encontró el registro para actualizar');
      return NextResponse.json({ error: 'No se encontró el jugador para actualizar' }, { status: 404 });
    }

    console.log('🎉 Perfil actualizado exitosamente - registros afectados:', updateResult.length);
    return NextResponse.json({ 
      message: 'Perfil actualizado exitosamente',
      affected: updateResult.length,
      data: updateResult[0]
    });

  } catch (error) {
    console.error('💥 Error en PUT profile:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}