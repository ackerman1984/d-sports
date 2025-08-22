const { createClient } = require('@supabase/supabase-js');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Error: Missing Supabase environment variables');
  console.error('Make sure you have NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in your .env.local file');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

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

async function populateDatabase() {
  try {
    console.log('🚀 Iniciando poblado de base de datos con datos de ejemplo...');
    
    // 1. Insertar ligas
    console.log('📊 Insertando ligas...');
    const { data: ligasInsertadas, error: ligasError } = await supabase
      .from('ligas')
      .upsert(sampleData.ligas, { onConflict: 'codigo' })
      .select();

    if (ligasError) {
      console.error('❌ Error insertando ligas:', ligasError);
      return;
    }

    console.log(`✅ ${ligasInsertadas.length} ligas insertadas correctamente`);
    
    // 2. Crear un mapa de códigos a IDs para los equipos
    const ligaMap = {};
    ligasInsertadas.forEach(liga => {
      ligaMap[liga.codigo] = liga.id;
    });

    // 3. Preparar equipos con liga_id correctos
    const equiposConLigaId = sampleData.equipos.map(equipo => ({
      ...equipo,
      liga_id: ligaMap[equipo.liga_codigo]
    }));

    // 4. Insertar equipos
    console.log('⚽ Insertando equipos...');
    const { data: equiposInsertados, error: equiposError } = await supabase
      .from('equipos')
      .upsert(equiposConLigaId, { onConflict: 'nombre,liga_id' })
      .select();

    if (equiposError) {
      console.error('❌ Error insertando equipos:', equiposError);
      return;
    }

    console.log(`✅ ${equiposInsertados.length} equipos insertados correctamente`);

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
      return;
    }

    console.log('\n📋 RESUMEN DE DATOS INSERTADOS:');
    verificacion.forEach(liga => {
      const equiposActivos = liga.equipos.filter(eq => eq.activo).length;
      console.log(`🏆 ${liga.nombre} (${liga.codigo})`);
      console.log(`   - Activa: ${liga.activa ? '✅' : '❌'}`);
      console.log(`   - Equipos activos: ${equiposActivos}/${liga.equipos.length}`);
      
      if (equiposActivos >= 2) {
        console.log('   - ✅ Lista para registro');
      } else {
        console.log('   - ⚠️ Necesita más equipos activos');
      }
      console.log('');
    });

    console.log('🎉 ¡Datos de ejemplo insertados correctamente!');
    console.log('💡 Ahora puedes recargar tu aplicación para ver las ligas disponibles');

  } catch (error) {
    console.error('❌ Error general:', error);
  }
}

// Ejecutar el script
populateDatabase();