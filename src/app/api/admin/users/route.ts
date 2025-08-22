import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth-options';
import { adminCreateUser, AdminCreateUserData } from '@/lib/auth/registration';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    
    const userData: AdminCreateUserData = {
      email: body.email,
      password: body.password,
      nombre: body.nombre,
      telefono: body.telefono,
      role: body.role,
      ligaId: session.user.ligaId,
      equipoId: body.equipoId,
      numeroCasaca: body.numeroCasaca,
    };

    // Validaciones
    if (!userData.email || !userData.password || !userData.nombre || !userData.role) {
      return NextResponse.json(
        { error: 'Missing required fields: email, password, nombre, role' },
        { status: 400 }
      );
    }

    if (!['anotador', 'jugador'].includes(userData.role)) {
      return NextResponse.json(
        { error: 'Role must be either anotador or jugador' },
        { status: 400 }
      );
    }

    // Si es jugador, crear en tabla 'jugadores' en lugar de 'usuarios'
    if (userData.role === 'jugador') {
      const supabase = await createClient();
      
      // Crear en tabla jugadores
      const { data: newJugador, error: jugadorError } = await supabase
        .from('jugadores')
        .insert({
          nombre: userData.nombre,
          email: userData.email,
          telefono: userData.telefono,
          equipo_id: userData.equipoId,
          numero_casaca: userData.numeroCasaca,
          liga_id: userData.ligaId,
          activo: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single();

      if (jugadorError) {
        console.error('Error creating jugador:', jugadorError);
        return NextResponse.json({ error: jugadorError.message }, { status: 400 });
      }

      console.log('✅ Jugador creado en tabla jugadores:', newJugador);

      return NextResponse.json({ 
        message: 'Jugador created successfully',
        user: {
          id: newJugador.id,
          email: newJugador.email,
          nombre: newJugador.nombre,
          role: 'jugador',
          ligaId: newJugador.liga_id,
        }
      }, { status: 201 });
    } else {
      // Para anotadores, usar el sistema original
      const { user, error } = await adminCreateUser(session.user.id, userData);

      if (error) {
        return NextResponse.json({ error }, { status: 400 });
      }

      return NextResponse.json({ 
        message: 'User created successfully',
        user: {
          id: user?.id,
          email: user?.email,
          nombre: user?.nombre,
          role: user?.role,
          ligaId: user?.ligaId,
        }
      }, { status: 201 });
    }

  } catch (error) {
    console.error('Admin user creation error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = await createClient();
    const { searchParams } = new URL(request.url);
    const role = searchParams.get('role');

    let allUsers: any[] = [];

    // DEBUGGING: Verificar cuántos jugadores hay en total
    const { data: allJugadores, error: debugError } = await supabase
      .from('jugadores')
      .select('id, nombre, email')
      .eq('liga_id', session.user.ligaId);
    
    console.log(`🔍 DEBUG: Total jugadores en tabla 'jugadores': ${allJugadores?.length || 0}`);
    if (allJugadores) {
      allJugadores.forEach(j => console.log(`   - ${j.nombre} (${j.email})`));
    }

    // Obtener usuarios de la tabla 'usuarios' (anotadores y algunos jugadores)
    let usuariosQuery = supabase
      .from('usuarios')
      .select('*, equipos(nombre)')
      .eq('liga_id', session.user.ligaId)
      .neq('id', session.user.id); // Exclude the admin themselves

    if (role && ['admin', 'anotador'].includes(role)) {
      usuariosQuery = usuariosQuery.eq('role', role);
    } else if (role === 'jugador') {
      usuariosQuery = usuariosQuery.eq('role', 'jugador');
    }

    const { data: usuarios, error: usuariosError } = await usuariosQuery.order('created_at', { ascending: false });

    if (usuariosError) {
      console.error('Error fetching usuarios:', usuariosError);
    } else {
      allUsers = [...(usuarios || [])];
    }

    // Obtener jugadores de la tabla 'jugadores' (que no estén en 'usuarios')
    if (!role || role === 'jugador') {
      const { data: jugadores, error: jugadoresError } = await supabase
        .from('jugadores')
        .select('*, equipo:equipos(nombre)')
        .eq('liga_id', session.user.ligaId)
        .order('created_at', { ascending: false });

      if (jugadoresError) {
        console.error('Error fetching jugadores:', jugadoresError);
      } else if (jugadores) {
        // Convertir jugadores al formato de usuarios
        const jugadoresFormatted = jugadores.map(jugador => ({
          id: jugador.id,
          email: jugador.email,
          nombre: jugador.nombre,
          telefono: jugador.telefono,
          role: 'jugador',
          equipos: jugador.equipo,
          numero_casaca: jugador.numero_casaca,
          activo: jugador.activo,
          created_at: jugador.created_at
        }));
        allUsers = [...allUsers, ...jugadoresFormatted];
      }
    }

    // Eliminar duplicados por email
    const uniqueUsers = allUsers.filter((user, index, self) => 
      index === self.findIndex(u => u.email === user.email)
    );

    // Ordenar por fecha de creación
    uniqueUsers.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    console.log(`📊 Total usuarios encontrados: ${uniqueUsers.length}`);
    console.log(`👥 Usuarios por rol:`, {
      jugadores: uniqueUsers.filter(u => u.role === 'jugador').length,
      anotadores: uniqueUsers.filter(u => u.role === 'anotador').length,
      admins: uniqueUsers.filter(u => u.role === 'admin').length
    });

    return NextResponse.json({ users: uniqueUsers }, { status: 200 });

  } catch (error) {
    console.error('Get users error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}