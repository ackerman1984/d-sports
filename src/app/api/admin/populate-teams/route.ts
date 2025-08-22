import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(_request: NextRequest) {
  try {
    const supabase = await createClient();
    
    console.log('🚀 Poblando equipos para ligas existentes sin equipos...');
    
    // 1. Obtener ligas que no tienen equipos
    const { data: ligas, error: ligasError } = await supabase
      .from('ligas')
      .select(`
        id,
        nombre,
        codigo,
        subdominio,
        equipos(id)
      `);

    if (ligasError) {
      console.error('❌ Error obteniendo ligas:', ligasError);
      return NextResponse.json({ error: ligasError.message }, { status: 400 });
    }

    // Filtrar ligas sin equipos
    const ligasSinEquipos = ligas?.filter((liga: any) => 
      !liga.equipos || liga.equipos.length === 0
    ) || [];

    console.log(`📊 Encontradas ${ligasSinEquipos.length} ligas sin equipos`);

    let totalEquiposCreados = 0;

    // 2. Crear equipos para cada liga sin equipos
    for (const liga of ligasSinEquipos) {
      console.log(`⚽ Creando equipos para ${liga.nombre}...`);
      
      // Equipos basados en el código de la liga
      let equipos: any[] = [];
      
      if (liga.codigo === 'LMB2024') {
        equipos = [
          { nombre: 'Águilas Doradas', color: '#FFD700', liga_id: liga.id, activo: true },
          { nombre: 'Tigres Azules', color: '#0066CC', liga_id: liga.id, activo: true },
          { nombre: 'Leones Rojos', color: '#CC0000', liga_id: liga.id, activo: true },
          { nombre: 'Panteras Verdes', color: '#00AA00', liga_id: liga.id, activo: true }
        ];
      } else if (liga.codigo === 'LJB2024') {
        equipos = [
          { nombre: 'Estrellas del Norte', color: '#4B0082', liga_id: liga.id, activo: true },
          { nombre: 'Rayos del Sur', color: '#FF6600', liga_id: liga.id, activo: true },
          { nombre: 'Huracanes del Este', color: '#008080', liga_id: liga.id, activo: true },
          { nombre: 'Tornados del Oeste', color: '#800080', liga_id: liga.id, activo: true }
        ];
      } else if (liga.codigo === 'LPR2024') {
        equipos = [
          { nombre: 'Conquistadores', color: '#B8860B', liga_id: liga.id, activo: true },
          { nombre: 'Gladiadores', color: '#8B0000', liga_id: liga.id, activo: true },
          { nombre: 'Spartanos', color: '#2F4F4F', liga_id: liga.id, activo: true }
        ];
      } else if (liga.codigo === 'DEMO2025') {
        equipos = [
          { nombre: 'Demonios Rojos', color: '#DC143C', liga_id: liga.id, activo: true },
          { nombre: 'Ángeles Blancos', color: '#F8F8FF', liga_id: liga.id, activo: true },
          { nombre: 'Dragones Verdes', color: '#228B22', liga_id: liga.id, activo: true },
          { nombre: 'Fénix Dorados', color: '#FFD700', liga_id: liga.id, activo: true }
        ];
      } else if (liga.codigo === 'OLIMPO2024' || liga.subdominio === 'olimpo') {
        equipos = [
          { nombre: 'Dioses del Olimpo', color: '#FFD700', liga_id: liga.id, activo: true },
          { nombre: 'Titanes Azules', color: '#0066CC', liga_id: liga.id, activo: true },
          { nombre: 'Héroes Carmesí', color: '#DC143C', liga_id: liga.id, activo: true },
          { nombre: 'Guerreros Verdes', color: '#228B22', liga_id: liga.id, activo: true }
        ];
      } else {
        // Equipos genéricos basados en el nombre de la liga
        const nombreLiga = liga.nombre.toLowerCase();
        if (nombreLiga.includes('olimpo') || nombreLiga.includes('olympic')) {
          equipos = [
            { nombre: 'Dioses del Olimpo', color: '#FFD700', liga_id: liga.id, activo: true },
            { nombre: 'Titanes Azules', color: '#0066CC', liga_id: liga.id, activo: true },
            { nombre: 'Héroes Carmesí', color: '#DC143C', liga_id: liga.id, activo: true },
            { nombre: 'Guerreros Verdes', color: '#228B22', liga_id: liga.id, activo: true }
          ];
        } else if (nombreLiga.includes('juvenil') || nombreLiga.includes('junior')) {
          equipos = [
            { nombre: 'Cachorros Azules', color: '#4169E1', liga_id: liga.id, activo: true },
            { nombre: 'Potros Rojos', color: '#FF4500', liga_id: liga.id, activo: true },
            { nombre: 'Lobos Grises', color: '#696969', liga_id: liga.id, activo: true }
          ];
        } else if (nombreLiga.includes('senior') || nombreLiga.includes('veterano')) {
          equipos = [
            { nombre: 'Veteranos de Oro', color: '#DAA520', liga_id: liga.id, activo: true },
            { nombre: 'Leyendas Plateadas', color: '#C0C0C0', liga_id: liga.id, activo: true },
            { nombre: 'Maestros del Juego', color: '#8B4513', liga_id: liga.id, activo: true }
          ];
        } else {
          // Equipos completamente genéricos con nombres más creativos
          equipos = [
            { nombre: 'Rayos Dorados', color: '#FFD700', liga_id: liga.id, activo: true },
            { nombre: 'Águilas Azules', color: '#1E90FF', liga_id: liga.id, activo: true },
            { nombre: 'Tigres Rojos', color: '#DC143C', liga_id: liga.id, activo: true },
            { nombre: 'Panteras Verdes', color: '#228B22', liga_id: liga.id, activo: true }
          ];
        }
      }

      // Insertar equipos
      const { data: equiposInsertados, error: equiposError } = await supabase
        .from('equipos')
        .insert(equipos)
        .select();

      if (equiposError) {
        console.error(`❌ Error insertando equipos para ${liga.nombre}:`, equiposError);
        continue;
      }

      console.log(`✅ ${equiposInsertados?.length || 0} equipos creados para ${liga.nombre}`);
      totalEquiposCreados += equiposInsertados?.length || 0;
    }

    // 3. Verificar resultado final
    const { data: verificacion, error: verifyError } = await supabase
      .from('ligas')
      .select(`
        id,
        nombre,
        codigo,
        activa,
        equipos(id, nombre, activo)
      `);

    if (verifyError) {
      console.error('❌ Error verificando datos:', verifyError);
      return NextResponse.json({ error: verifyError.message }, { status: 400 });
    }

    const resumen = verificacion?.map((liga: any) => {
      const equiposActivos = liga.equipos?.filter((eq: any) => eq.activo).length || 0;
      return {
        liga: liga.nombre,
        codigo: liga.codigo,
        activa: liga.activa,
        equiposActivos,
        totalEquipos: liga.equipos?.length || 0,
        listaParaRegistro: liga.activa && equiposActivos >= 2
      };
    });

    const ligasDisponibles = resumen?.filter(r => r.listaParaRegistro).length || 0;

    return NextResponse.json({ 
      success: true,
      message: `Equipos poblados correctamente. ${ligasDisponibles} ligas ahora disponibles para registro`,
      totalEquiposCreados,
      ligasProcesadas: ligasSinEquipos.length,
      resumen
    }, { status: 200 });

  } catch (error) {
    console.error('❌ Error general:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}