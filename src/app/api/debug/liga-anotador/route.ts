import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Obtener el código de anotador desde cookies
    const codigoAcceso = request.cookies.get('anotador_codigo')?.value;
    
    console.log('🔍 DEBUG - Código anotador:', codigoAcceso);
    
    if (!codigoAcceso) {
      return NextResponse.json({ error: 'No hay código de anotador' }, { status: 401 });
    }

    // 1. Obtener datos del anotador
    const { data: anotador, error: anotadorError } = await supabase
      .from('anotadores')
      .select('id, nombre, liga_id, codigo_acceso')
      .eq('codigo_acceso', codigoAcceso)
      .single();

    console.log('👤 Anotador encontrado:', anotador, 'Error:', anotadorError);

    if (anotadorError || !anotador) {
      return NextResponse.json({ error: 'Anotador no encontrado' }, { status: 404 });
    }

    // 2. Obtener información de la liga del anotador
    const { data: ligaAnotador, error: ligaError } = await supabase
      .from('ligas')
      .select('id, nombre, codigo_liga')
      .eq('id', anotador.liga_id)
      .single();

    console.log('🏟️ Liga del anotador:', ligaAnotador, 'Error:', ligaError);

    // 3. Obtener todas las temporadas de esa liga
    const { data: temporadas, error: temporadasError } = await supabase
      .from('configuracion_temporada')
      .select('id, nombre, estado, liga_id')
      .eq('liga_id', anotador.liga_id);

    console.log('📅 Temporadas de la liga:', temporadas?.length || 0, 'Error:', temporadasError);

    // 4. Obtener todos los juegos asociados a esas temporadas
    const temporadaIds = temporadas?.map(t => t.id) || [];
    const { data: juegos, error: juegosError } = await supabase
      .from('juegos')
      .select('id, liga_id, temporada_id, estado')
      .in('temporada_id', temporadaIds);

    console.log('⚾ Juegos encontrados:', juegos?.length || 0, 'Error:', juegosError);

    // 5. Verificar si hay juegos de otras ligas
    const { data: todosLosJuegos, error: todosJuegosError } = await supabase
      .from('juegos')
      .select('id, liga_id, temporada_id, estado, ligas:liga_id(nombre, codigo_liga)')
      .limit(10);

    console.log('🔍 Muestra de todos los juegos:', todosLosJuegos?.length || 0, 'Error:', todosJuegosError);

    // 6. Obtener anotadores de otras ligas para comparar
    const { data: otrosAnotadores, error: otrosAnotadoresError } = await supabase
      .from('anotadores')
      .select('id, nombre, liga_id, ligas:liga_id(nombre, codigo_liga)')
      .limit(5);

    console.log('👥 Muestra de otros anotadores:', otrosAnotadores?.length || 0);

    return NextResponse.json({
      debug: {
        anotador: {
          id: anotador.id,
          nombre: anotador.nombre,
          liga_id: anotador.liga_id,
          codigo_acceso: anotador.codigo_acceso
        },
        liga_anotador: ligaAnotador,
        temporadas: {
          total: temporadas?.length || 0,
          lista: temporadas
        },
        juegos: {
          total_en_liga: juegos?.length || 0,
          por_liga: juegos?.reduce((acc: any, juego: any) => {
            acc[juego.liga_id] = (acc[juego.liga_id] || 0) + 1;
            return acc;
          }, {}) || {},
          muestra: juegos?.slice(0, 3)
        },
        todos_los_juegos: {
          total: todosLosJuegos?.length || 0,
          por_liga: todosLosJuegos?.reduce((acc: any, juego: any) => {
            const ligaNombre = juego.ligas?.nombre || 'Sin liga';
            acc[ligaNombre] = (acc[ligaNombre] || 0) + 1;
            return acc;
          }, {}) || {},
          muestra: todosLosJuegos?.slice(0, 3)
        },
        otros_anotadores: otrosAnotadores?.map((a: any) => ({
          nombre: a.nombre,
          liga: a.ligas?.nombre || 'Sin liga'
        }))
      }
    });

  } catch (error) {
    console.error('❌ Error en debug liga-anotador:', error);
    return NextResponse.json({ 
      error: 'Error del servidor', 
      details: error instanceof Error ? error.message : 'Error desconocido' 
    }, { status: 500 });
  }
}