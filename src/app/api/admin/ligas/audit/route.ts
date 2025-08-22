import { NextRequest, NextResponse } from 'next/server';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';

export async function GET(_request: NextRequest) {
  try {
    // Usar directamente el service key para acceso completo
    const supabase = createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
    
    console.log('Auditing ligas for minimum team requirements...');
    
    // Obtener todas las ligas con sus equipos
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
      .order('nombre', { ascending: true });

    if (error) {
      console.error('Error fetching ligas:', error);
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    // Analizar todas las ligas
    const auditResult = (ligas || []).map((liga: any) => {
      const totalEquipos = liga.equipos?.length || 0;
      const equiposActivos = liga.equipos?.filter((equipo: any) => equipo.activo === true || equipo.activo === 'true').length || 0;
      
      return {
        id: liga.id,
        nombre: liga.nombre,
        codigo: liga.codigo,
        subdominio: liga.subdominio,
        activa: liga.activa,
        totalEquipos,
        equiposActivos,
        cumpleRequisito: equiposActivos >= 2,
        equipos: liga.equipos?.map((equipo: any) => ({
          nombre: equipo.nombre,
          activo: equipo.activo
        })) || []
      };
    });

    // Separar ligas que NO cumplen el requisito
    const ligasParaEliminar = auditResult.filter(liga => !liga.cumpleRequisito);
    const ligasValidas = auditResult.filter(liga => liga.cumpleRequisito);

    console.log(`Total ligas: ${auditResult.length}`);
    console.log(`Ligas válidas (2+ equipos activos): ${ligasValidas.length}`);
    console.log(`Ligas para eliminar (<2 equipos activos): ${ligasParaEliminar.length}`);

    return NextResponse.json({
      resumen: {
        total: auditResult.length,
        validas: ligasValidas.length,
        paraEliminar: ligasParaEliminar.length
      },
      ligasParaEliminar: ligasParaEliminar.map((liga: any) => ({
        id: liga.id,
        nombre: liga.nombre,
        codigo: liga.codigo,
        subdominio: liga.subdominio,
        equiposActivos: liga.equiposActivos,
        equipos: liga.equipos
      })),
      ligasValidas: ligasValidas.map((liga: any) => ({
        id: liga.id,
        nombre: liga.nombre,
        codigo: liga.codigo,
        equiposActivos: liga.equiposActivos
      }))
    }, { status: 200 });

  } catch (error) {
    console.error('Audit error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}