import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth-options';
import { updateUserProfile } from '@/lib/auth/registration';
import { createClient } from '@/lib/supabase/server';

export async function GET(_request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = await createClient();
    
    // Obtener información completa del usuario
    const { data: profile, error } = await supabase
      .from('usuarios')
      .select(`
        *,
        equipos:equipo_id (
          id,
          nombre,
          color
        )
      `)
      .eq('id', session.user.id)
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    // Si es jugador, obtener información adicional de la tabla jugadores
    let fechaNacimiento = null;
    if (profile.role === 'jugador') {
      const { data: jugadorInfo } = await supabase
        .from('jugadores')
        .select('fecha_nacimiento')
        .eq('id', session.user.id)
        .single();
      
      fechaNacimiento = jugadorInfo?.fecha_nacimiento;
    }

    const userProfile = {
      id: profile.id,
      email: profile.email,
      nombre: profile.nombre,
      fechaNacimiento: fechaNacimiento,
      fotoUrl: profile.foto_url,
      numeroCasaca: profile.numero_casaca,
      equipoId: profile.equipo_id,
      posicion: profile.posicion,
      equipo: profile.equipos,
      role: profile.role,
      activo: profile.activo,
    };

    return NextResponse.json({ profile: userProfile }, { status: 200 });

  } catch (error) {
    console.error('Get profile error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    
    const updateData = {
      nombre: body.nombre,
      fechaNacimiento: body.fechaNacimiento,
      fotoUrl: body.fotoUrl,
      numeroCasaca: body.numeroCasaca,
      equipoId: body.equipoId,
      posicion: body.posicion,
      email: body.email,
    };

    // Validaciones específicas para jugadores
    if (session.user.role === 'jugador') {
      // Los jugadores no pueden cambiar su equipo a menos que sean admin
      if (body.equipoId && session.user.role === 'jugador') {
        // Solo permitir cambio de equipo si es admin o si no tenía equipo previamente
        const supabase = await createClient();
        const { data: currentUser } = await supabase
          .from('usuarios')
          .select('equipo_id')
          .eq('id', session.user.id)
          .single();
        
        if (currentUser?.equipo_id && currentUser.equipo_id !== body.equipoId) {
          delete updateData.equipoId; // Remover el cambio de equipo
        }
      }
    }

    const { user, error } = await updateUserProfile(session.user.id, updateData);

    if (error) {
      return NextResponse.json({ error }, { status: 400 });
    }

    // Obtener información completa actualizada
    const supabase = await createClient();
    const { data: updatedProfile } = await supabase
      .from('usuarios')
      .select(`
        *,
        equipos:equipo_id (
          id,
          nombre,
          color
        )
      `)
      .eq('id', session.user.id)
      .single();

    // Si es jugador, obtener información adicional de la tabla jugadores
    let updatedFechaNacimiento = null;
    if (updatedProfile.role === 'jugador') {
      const { data: updatedJugadorInfo } = await supabase
        .from('jugadores')
        .select('fecha_nacimiento')
        .eq('id', session.user.id)
        .single();
      
      updatedFechaNacimiento = updatedJugadorInfo?.fecha_nacimiento;
    }

    const profileResponse = {
      id: updatedProfile.id,
      email: updatedProfile.email,
      nombre: updatedProfile.nombre,
      fechaNacimiento: updatedFechaNacimiento,
      fotoUrl: updatedProfile.foto_url,
      numeroCasaca: updatedProfile.numero_casaca,
      equipoId: updatedProfile.equipo_id,
      posicion: updatedProfile.posicion,
      equipo: updatedProfile.equipos,
      role: updatedProfile.role,
      activo: updatedProfile.activo,
    };

    return NextResponse.json({ 
      message: 'Profile updated successfully',
      profile: profileResponse
    }, { status: 200 });

  } catch (error) {
    console.error('Update profile error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}