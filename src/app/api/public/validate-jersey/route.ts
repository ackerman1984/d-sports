import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const { equipoId, numeroCasaca } = await request.json();

    if (!equipoId || !numeroCasaca) {
      return NextResponse.json(
        { error: 'Missing equipoId or numeroCasaca' },
        { status: 400 }
      );
    }

    const supabase = await createClient();
    
    // Buscar si existe un jugador con ese número en el mismo equipo
    const { data: existingPlayer, error } = await supabase
      .from('usuarios')
      .select('id, nombre, numero_casaca')
      .eq('equipo_id', equipoId)
      .eq('numero_casaca', numeroCasaca)
      .eq('activo', true) // Solo considerar jugadores activos
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows found
      console.error('Error checking jersey number:', error);
      return NextResponse.json(
        { error: 'Error validating jersey number' },
        { status: 500 }
      );
    }

    if (existingPlayer) {
      return NextResponse.json({
        available: false,
        playerName: existingPlayer.nombre,
        message: `El número ${numeroCasaca} ya está ocupado por ${existingPlayer.nombre}`
      });
    }

    return NextResponse.json({
      available: true,
      message: `El número ${numeroCasaca} está disponible`
    });

  } catch (error) {
    console.error('Validate jersey error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}