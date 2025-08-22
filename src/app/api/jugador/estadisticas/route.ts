import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth-options';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const jugadorId = searchParams.get('jugadorId') || session.user.id;

    // Verificar que el usuario tenga permisos para ver estas estadísticas
    if (jugadorId !== session.user.id && session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Por ahora, como la tabla estadisticas_jugador no existe,
    // devolvemos estadísticas vacías para que la UI funcione
    console.log('Sistema de estadísticas no implementado aún - devolviendo estadísticas vacías');
    
    return NextResponse.json({
      estadisticas: {
        carreras: 0,
        hits: 0,
        errores: 0,
        ponches: 0,
        basesRobadas: 0,
        basePorBolas: 0,
        juegosJugados: 0,
        turnos: 0,
        homeRuns: 0,
        impulsadas: 0,
        promedioBateo: 0.000
      }
    });

  } catch (error) {
    console.error('Get player stats error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}