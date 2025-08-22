import { NextRequest, NextResponse } from 'next/server';
import { registerUser, RegisterUserData } from '@/lib/auth/registration';
import { Role } from '@/types/beisbol';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    const userData: RegisterUserData = {
      email: body.email,
      password: body.password,
      nombre: body.nombre,
      role: body.role as Role,
      ligaId: body.ligaId,
      // Campos específicos para tablas separadas
      telefono: body.telefono,
      fechaNacimiento: body.fechaNacimiento,
      fotoUrl: body.fotoUrl,
      numeroCasaca: body.numeroCasaca,
      equipoId: body.equipoId,
      posicion: body.posicion,
    };

    // Validaciones básicas
    if (!userData.email || !userData.password || !userData.nombre || !userData.role || !userData.ligaId) {
      return NextResponse.json(
        { error: 'Missing required fields: email, password, nombre, role, ligaId' },
        { status: 400 }
      );
    }

    // Validaciones específicas por rol
    if (userData.role === 'jugador') {
      if (!userData.equipoId) {
        return NextResponse.json(
          { error: 'Jugadores must be assigned to a team (equipoId required)' },
          { status: 400 }
        );
      }
      if (!userData.numeroCasaca) {
        return NextResponse.json(
          { error: 'Jugadores must have a jersey number (numeroCasaca required)' },
          { status: 400 }
        );
      }

      // Validar que el número de playera no esté ocupado en el mismo equipo
      const supabase = await createClient();
      const { data: existingPlayer, error: checkError } = await supabase
        .from('jugadores')
        .select('id, nombre, numero_casaca')
        .eq('equipo_id', userData.equipoId)
        .eq('numero_casaca', userData.numeroCasaca)
        .single();

      if (checkError && checkError.code !== 'PGRST116') { // PGRST116 = no rows found
        console.error('Error checking jersey number:', checkError);
        return NextResponse.json(
          { error: 'Error validating jersey number' },
          { status: 500 }
        );
      }

      if (existingPlayer) {
        return NextResponse.json(
          { error: `El número de playera ${userData.numeroCasaca} ya está ocupado por ${existingPlayer.nombre} en este equipo` },
          { status: 400 }
        );
      }
    }

    const { user, error } = await registerUser(userData);

    if (error) {
      return NextResponse.json({ error }, { status: 400 });
    }

    return NextResponse.json({ 
      message: 'User registered successfully',
      user: {
        id: user?.id,
        email: user?.email,
        nombre: user?.nombre,
        role: user?.role,
        ligaId: user?.ligaId,
      }
    }, { status: 201 });

  } catch (error) {
    console.error('Registration error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}