import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { createClient } from '@/lib/supabase/server';
import { authOptions } from '@/lib/auth/auth-options';

// POST - Crear equipos de ejemplo (Blanco y Negro)
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'No autorizado - Solo administradores' }, { status: 401 });
    }

    const supabase = await createClient();

    // Verificar si ya existen equipos
    const { data: existingTeams } = await supabase
      .from('equipos')
      .select('nombre')
      .eq('liga_id', session.user.ligaId);

    if (existingTeams && existingTeams.length >= 2) {
      return NextResponse.json({ 
        message: 'Los equipos ya existen',
        equipos: existingTeams 
      });
    }

    // Crear equipos de ejemplo
    const equiposData = [
      {
        nombre: 'Equipo Blanco',
        color: '#FFFFFF',
        liga_id: session.user.ligaId,
        activo: true,
        created_at: new Date().toISOString()
      },
      {
        nombre: 'Equipo Negro',
        color: '#000000',
        liga_id: session.user.ligaId,
        activo: true,
        created_at: new Date().toISOString()
      }
    ];

    const { data: newEquipos, error } = await supabase
      .from('equipos')
      .insert(equiposData)
      .select('*');

    if (error) {
      console.error('Error creating teams:', error);
      return NextResponse.json({ error: 'Error al crear equipos: ' + error.message }, { status: 500 });
    }

    return NextResponse.json({ 
      message: 'Equipos creados exitosamente',
      equipos: newEquipos
    }, { status: 201 });

  } catch (error) {
    console.error('Error in POST /api/seed/equipos:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}

// GET - Verificar equipos existentes
export async function GET(_request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const supabase = await createClient();
    
    const { data: equipos, error } = await supabase
      .from('equipos')
      .select('*')
      .eq('liga_id', session.user.ligaId)
      .order('nombre');

    if (error) {
      console.error('Error fetching teams:', error);
      return NextResponse.json({ error: 'Error al obtener equipos' }, { status: 500 });
    }

    return NextResponse.json({ 
      equipos: equipos || [],
      total: equipos?.length || 0,
      liga_id: session.user.ligaId
    });

  } catch (error) {
    console.error('Error in GET /api/seed/equipos:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}