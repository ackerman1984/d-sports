import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';

// Endpoint para vincular automáticamente jugadores cuando se registren
export async function POST(request: NextRequest) {
  try {
    console.log('🔗 VINCULAR JUGADOR - Inicio');
    
    const body = await request.json();
    const { email, userId } = body;

    if (!email || !userId) {
      return NextResponse.json({ 
        error: 'Email y userId son requeridos' 
      }, { status: 400 });
    }

    // Usar service role para operaciones de vinculación
    const supabase = createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    console.log('🔍 Buscando jugador con email:', email);
    console.log('🆔 Usuario Auth ID:', userId);

    // Buscar si hay un jugador creado por admin con este email
    const { data: jugadorExistente, error: jugadorError } = await supabase
      .from('jugadores')
      .select(`
        id,
        nombre,
        email,
        liga_id,
        estado,
        password_temporal,
        equipo:equipos(id, nombre, liga_id)
      `)
      .eq('email', email)
      .single();

    if (jugadorError) {
      console.log('❌ No se encontró jugador pre-creado:', jugadorError.message);
      return NextResponse.json({ 
        error: 'No hay jugador pre-creado con este email',
        needsCreation: true 
      }, { status: 404 });
    }

    console.log('✅ Jugador encontrado:', jugadorExistente.nombre);

    // Verificar si ya está vinculado
    if (jugadorExistente.id === userId) {
      console.log('ℹ️ Jugador ya está vinculado correctamente');
      return NextResponse.json({ 
        message: 'Jugador ya vinculado',
        jugador: jugadorExistente,
        alreadyLinked: true
      });
    }

    // PASO 1: Actualizar el ID del jugador para que coincida con el Auth ID
    console.log('🔄 Actualizando ID del jugador...');
    
    // Primero verificar si ya existe un usuario con el Auth ID
    const { data: usuarioExistente } = await supabase
      .from('usuarios')
      .select('id, email')
      .eq('id', userId)
      .single();

    if (usuarioExistente) {
      // Ya existe un usuario en la tabla usuarios, solo actualizar jugador
      console.log('👤 Usuario ya existe, solo vinculando jugador...');
      
      const { error: updateJugadorError } = await supabase
        .from('jugadores')
        .update({ 
          id: userId,
          updated_at: new Date().toISOString()
        })
        .eq('email', email);

      if (updateJugadorError) {
        console.error('❌ Error actualizando jugador:', updateJugadorError);
        return NextResponse.json({ 
          error: 'Error vinculando jugador: ' + updateJugadorError.message 
        }, { status: 500 });
      }
    } else {
      // Crear usuario en tabla usuarios y actualizar jugador
      console.log('👤 Creando entrada en usuarios y vinculando...');
      
      // Crear usuario
      const { error: createUsuarioError } = await supabase
        .from('usuarios')
        .insert([{
          id: userId,
          email: email,
          nombre: jugadorExistente.nombre,
          role: 'jugador',
          liga_id: jugadorExistente.liga_id,
          activo: true,
          password_temporal: jugadorExistente.password_temporal || false,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }]);

      if (createUsuarioError) {
        console.error('❌ Error creando usuario:', createUsuarioError);
        return NextResponse.json({ 
          error: 'Error creando perfil de usuario: ' + createUsuarioError.message 
        }, { status: 500 });
      }

      // Actualizar jugador con nuevo ID
      const { error: updateJugadorError } = await supabase
        .from('jugadores')
        .update({ 
          id: userId,
          updated_at: new Date().toISOString()
        })
        .eq('email', email);

      if (updateJugadorError) {
        console.error('❌ Error actualizando jugador:', updateJugadorError);
        return NextResponse.json({ 
          error: 'Error vinculando jugador: ' + updateJugadorError.message 
        }, { status: 500 });
      }
    }

    // PASO 2: Actualizar estadísticas si existen
    const { error: updateStatsError } = await supabase
      .from('estadisticas_jugador')
      .update({ 
        jugador_id: userId,
        updated_at: new Date().toISOString()
      })
      .eq('jugador_id', jugadorExistente.id);

    if (updateStatsError) {
      console.warn('⚠️ Error actualizando estadísticas:', updateStatsError);
    }

    console.log('✅ Vinculación completada exitosamente');

    return NextResponse.json({ 
      message: 'Jugador vinculado exitosamente',
      jugador: {
        ...jugadorExistente,
        id: userId
      },
      linked: true
    });

  } catch (error) {
    console.error('💥 Error en vincular-jugador:', error);
    return NextResponse.json({ 
      error: 'Error interno del servidor: ' + (error instanceof Error ? error.message : 'Error desconocido')
    }, { status: 500 });
  }
}