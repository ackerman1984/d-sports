import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

const sampleData = {
  ligas: [
    {
      nombre: 'Liga Municipal de Baseball',
      codigo: 'LMB2024',
      subdominio: 'municipal',
      activa: true
    },
    {
      nombre: 'Liga Juvenil de Baseball',
      codigo: 'LJB2024', 
      subdominio: 'juvenil',
      activa: true
    },
    {
      nombre: 'Liga Profesional Regional',
      codigo: 'LPR2024',
      subdominio: 'regional', 
      activa: true
    },
    {
      nombre: 'Liga Olimpo',
      codigo: 'OLIMPO2024',
      subdominio: 'olimpo',
      activa: true
    }
  ],
  equipos: [
    // Liga Municipal
    { nombre: 'Águilas Doradas', color: '#FFD700', liga_codigo: 'LMB2024', activo: true },
    { nombre: 'Tigres Azules', color: '#0066CC', liga_codigo: 'LMB2024', activo: true },
    { nombre: 'Leones Rojos', color: '#CC0000', liga_codigo: 'LMB2024', activo: true },
    { nombre: 'Panteras Verdes', color: '#00AA00', liga_codigo: 'LMB2024', activo: true },
    
    // Liga Juvenil  
    { nombre: 'Estrellas del Norte', color: '#4B0082', liga_codigo: 'LJB2024', activo: true },
    { nombre: 'Rayos del Sur', color: '#FF6600', liga_codigo: 'LJB2024', activo: true },
    { nombre: 'Huracanes del Este', color: '#008080', liga_codigo: 'LJB2024', activo: true },
    { nombre: 'Tornados del Oeste', color: '#800080', liga_codigo: 'LJB2024', activo: true },
    
    // Liga Regional
    { nombre: 'Conquistadores', color: '#B8860B', liga_codigo: 'LPR2024', activo: true },
    { nombre: 'Gladiadores', color: '#8B0000', liga_codigo: 'LPR2024', activo: true },
    { nombre: 'Spartanos', color: '#2F4F4F', liga_codigo: 'LPR2024', activo: true },
    
    // Liga Olimpo
    { nombre: 'Dioses del Olimpo', color: '#FFD700', liga_codigo: 'OLIMPO2024', activo: true },
    { nombre: 'Titanes Azules', color: '#0066CC', liga_codigo: 'OLIMPO2024', activo: true },
    { nombre: 'Héroes Carmesí', color: '#DC143C', liga_codigo: 'OLIMPO2024', activo: true },
    { nombre: 'Guerreros Verdes', color: '#228B22', liga_codigo: 'OLIMPO2024', activo: true }
  ]
};

export async function POST(_request: NextRequest) {
  try {
    const supabase = await createClient();
    
    console.log('🚀 Iniciando poblado de base de datos con datos de ejemplo...');
    
    // 1. Insertar ligas
    console.log('📊 Insertando ligas...');
    const { data: ligasInsertadas, error: ligasError } = await supabase
      .from('ligas')
      .insert(sampleData.ligas)
      .select();

    if (ligasError) {
      console.error('❌ Error insertando ligas:', ligasError);
      return NextResponse.json({ error: ligasError.message }, { status: 400 });
    }

    console.log(`✅ ${ligasInsertadas?.length || 0} ligas insertadas correctamente`);
    
    // 2. Crear un mapa de códigos a IDs para los equipos
    const ligaMap: Record<string, string> = {};
    ligasInsertadas?.forEach(liga => {
      ligaMap[liga.codigo] = liga.id;
    });

    // 3. Preparar equipos con liga_id correctos
    const equiposConLigaId = sampleData.equipos.map((equipo: any) => ({
      nombre: equipo.nombre,
      color: equipo.color,
      liga_id: ligaMap[equipo.liga_codigo],
      activo: equipo.activo
    }));

    // 4. Insertar equipos
    console.log('⚽ Insertando equipos...');
    const { data: equiposInsertados, error: equiposError } = await supabase
      .from('equipos')
      .insert(equiposConLigaId)
      .select();

    if (equiposError) {
      console.error('❌ Error insertando equipos:', equiposError);
      return NextResponse.json({ error: equiposError.message }, { status: 400 });
    }

    console.log(`✅ ${equiposInsertados?.length || 0} equipos insertados correctamente`);

    // 5. Verificar resultado final
    console.log('🔍 Verificando datos insertados...');
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

    return NextResponse.json({ 
      success: true,
      message: 'Datos de ejemplo insertados correctamente',
      ligasInsertadas: ligasInsertadas?.length || 0,
      equiposInsertados: equiposInsertados?.length || 0,
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