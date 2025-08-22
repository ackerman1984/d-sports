import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { createClient } from '@/lib/supabase/server';
import { authOptions } from '@/lib/auth/auth-options';

// POST - Registro automático de jugador
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const body = await request.json();
    const supabase = await createClient();

    // Verificar si ya existe un jugador para este usuario
    const { data: existingPlayer } = await supabase
      .from('jugadores')
      .select('id')
      .eq('id', session.user.id)
      .single();

    if (existingPlayer) {
      return NextResponse.json({ 
        message: 'Ya estás registrado como jugador',
        jugador: existingPlayer 
      });
    }

    // Actualizar datos básicos en tabla usuarios
    const usuarioData = {
      nombre: body.nombre || session.user.name || 'Jugador',
      updated_at: new Date().toISOString()
    };

    const { error: usuarioUpdateError } = await supabase
      .from('usuarios')
      .update(usuarioData)
      .eq('id', session.user.id);

    if (usuarioUpdateError) {
      console.error('Error updating usuario:', usuarioUpdateError);
      return NextResponse.json({ error: 'Error al actualizar datos del usuario' }, { status: 500 });
    }

    // Crear el perfil de jugador automáticamente
    const playerData = {
      id: session.user.id, // Usar mismo ID que usuario
      nombre: body.nombre || session.user.name || 'Jugador',
      email: session.user.email,
      foto_url: body.foto_url || null,
      equipo_id: body.equipo_id || null,
      liga_id: session.user.ligaId,
      numero_casaca: body.numero_casaca || null,
      posicion: body.posicion || 'No especificada',
      fecha_nacimiento: body.fecha_nacimiento || null,
      estado: 'activo',
      activo: true,
      created_by: null, // Auto-registro
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const { data: newPlayer, error: playerError } = await supabase
      .from('jugadores')
      .insert([playerData])
      .select('*')
      .single();

    if (playerError) {
      console.error('Error creating player profile:', playerError);
      return NextResponse.json({ error: 'Error al crear perfil de jugador' }, { status: 500 });
    }

    // Crear estadísticas iniciales
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

    return NextResponse.json({ 
      message: 'Perfil de jugador creado exitosamente',
      jugador: newPlayer
    }, { status: 201 });

  } catch (error) {
    console.error('Error in POST /api/jugador/registro:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}

// GET - Obtener información del jugador actual
export async function GET(_request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const supabase = await createClient();

    const { data: jugador, error } = await supabase
      .from('jugadores')
      .select(`
        *,
        equipo:equipos(*),
        estadisticas:estadisticas_jugador(*)
      `)
      .eq('id', session.user.id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // No encontrado - el jugador no está registrado
        return NextResponse.json({ 
          registrado: false,
          message: 'Jugador no registrado' 
        }, { status: 404 });
      }
      throw error;
    }

    return NextResponse.json({ 
      registrado: true,
      jugador 
    });

  } catch (error) {
    console.error('Error in GET /api/jugador/registro:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}