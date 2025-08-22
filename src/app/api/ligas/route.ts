import { NextRequest, NextResponse } from 'next/server';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';

export async function GET(_request: NextRequest) {
  try {
    // Usar directamente el service key para acceso completo
    const supabase = createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
    
    console.log('Fetching ligas for registration...');
    
    // Obtener todas las ligas con sus equipos para filtrar después
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
      .order('nombre', { ascending: true }); // Ordenar por nombre alfabéticamente

    console.log('All ligas from DB:', ligas);

    if (error) {
      console.error('Error fetching ligas:', error);
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    // Filtrar ligas que cumplan los criterios requeridos
    const ligasDisponibles = (ligas || [])
      .filter((liga: any) => {
        const totalEquipos = liga.equipos?.length || 0;
        const equiposActivos = liga.equipos?.filter((equipo: any) => equipo.activo === true || equipo.activo === 'true').length || 0;
        
        console.log(`Liga ${liga.nombre}: activa=${liga.activa} (tipo: ${typeof liga.activa}), total equipos=${totalEquipos}, equipos activos=${equiposActivos}`);
        
        // Criterios para mostrar en el formulario:
        // 1. Liga debe estar activa (no suspendida/cancelada)  
        // 2. Liga debe tener al menos 1 equipo activo
        const esLigaActiva = liga.activa === true || liga.activa === 'true';
        const tieneSuficientesEquipos = equiposActivos >= 1;
        
        const cumpleCriterios = esLigaActiva && tieneSuficientesEquipos;
        console.log(`Liga ${liga.nombre} cumple criterios: ${cumpleCriterios} (activa: ${esLigaActiva}, equipos activos: ${equiposActivos})`);
        
        return cumpleCriterios;
      })
      .map((liga: any) => ({
        id: liga.id,
        nombre: liga.nombre,
        codigo: liga.codigo,
        subdominio: liga.subdominio,
        activa: liga.activa,
        created_at: liga.created_at,
      }));

    console.log('Ligas disponibles para registro:', ligasDisponibles);

    return NextResponse.json({ ligas: ligasDisponibles }, { status: 200 });

  } catch (error) {
    console.error('Get ligas error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}