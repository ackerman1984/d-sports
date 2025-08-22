import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(_request: NextRequest) {
  try {
    const supabase = await createClient();
    
    console.log('DEBUG: Fetching ALL ligas with detailed info...');
    
    // Obtener TODAS las ligas sin filtros
    const { data: ligas, error } = await supabase
      .from('ligas')
      .select(`
        id,
        nombre,
        codigo,
        subdominio,
        activa,
        created_at,
        equipos(id, nombre, activo)
      `)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching all ligas:', error);
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    // Agregar información detallada para cada liga
    const ligasDetalladas = (ligas || []).map((liga: any) => {
      const totalEquipos = liga.equipos?.length || 0;
      const equiposActivos = liga.equipos?.filter((equipo: any) => equipo.activo)?.length || 0;
      
      return {
        ...liga,
        estadisticas: {
          totalEquipos,
          equiposActivos,
          disponibleParaRegistro: liga.activa && equiposActivos > 0
        }
      };
    });

    console.log('DEBUG: All ligas detailed:', ligasDetalladas);

    return NextResponse.json({ 
      ligas: ligasDetalladas,
      resumen: {
        total: ligasDetalladas.length,
        activas: ligasDetalladas.filter(l => l.activa).length,
        conEquiposActivos: ligasDetalladas.filter(l => l.estadisticas.equiposActivos > 0).length,
        disponiblesParaRegistro: ligasDetalladas.filter(l => l.estadisticas.disponibleParaRegistro).length
      }
    }, { status: 200 });

  } catch (error) {
    console.error('DEBUG: Get all ligas error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}