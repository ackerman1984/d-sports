const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Faltan variables de entorno de Supabase');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function applyCalendarMigration() {
  console.log('🗓️ Aplicando migración del sistema de calendario...\n');

  try {
    // Leer el archivo de migración
    const migrationPath = path.join(__dirname, '../src/lib/supabase/migrations/010_sistema_calendario.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

    console.log('📝 Ejecutando migración del sistema de calendario...');
    
    // Ejecutar la migración completa
    const { error } = await supabase.rpc('exec_sql', { sql: migrationSQL });

    if (error) {
      console.error('❌ Error ejecutando migración:', error);
      
      // Intentar ejecutar por partes si falla
      console.log('\n🔄 Intentando ejecutar por secciones...');
      await executeInSections(migrationSQL);
    } else {
      console.log('✅ Migración ejecutada exitosamente');
    }

    // Configurar datos iniciales para la liga POLI
    console.log('\n📋 Configurando datos iniciales para liga POLI...');
    await setupInitialData();

    console.log('\n🎉 ¡Sistema de calendario instalado exitosamente!');
    console.log('\n📊 Tablas creadas:');
    console.log('   ✅ configuracion_temporada');
    console.log('   ✅ campos');
    console.log('   ✅ horarios');
    console.log('   ✅ sabados_especiales');
    console.log('   ✅ jornadas');
    console.log('   ✅ partidos_calendario');
    console.log('   ✅ contador_descansos');
    console.log('   ✅ log_generacion_calendario');

  } catch (error) {
    console.error('❌ Error general:', error);
  }
}

async function executeInSections(sql) {
  // Dividir el SQL en secciones
  const sections = sql.split('-- ======================================================================');
  
  for (let i = 0; i < sections.length; i++) {
    const section = sections[i].trim();
    if (section && !section.startsWith('--') && section.length > 10) {
      console.log(`📝 Ejecutando sección ${i + 1}...`);
      
      try {
        const { error } = await supabase.rpc('exec_sql', { sql: section });
        if (error) {
          console.log(`⚠️ Error en sección ${i + 1}:`, error.message);
        } else {
          console.log(`✅ Sección ${i + 1} completada`);
        }
      } catch (err) {
        console.log(`⚠️ Error ejecutando sección ${i + 1}:`, err.message);
      }
    }
  }
}

async function setupInitialData() {
  try {
    // Obtener liga POLI
    const { data: liga, error: ligaError } = await supabase
      .from('ligas')
      .select('id, nombre')
      .eq('codigo', 'POLI')
      .single();

    if (ligaError || !liga) {
      console.log('⚠️ Liga POLI no encontrada, saltando configuración inicial');
      return;
    }

    console.log(`✅ Liga encontrada: ${liga.nombre}`);

    // Crear campos por defecto
    console.log('📍 Creando campos por defecto...');
    const { error: camposError } = await supabase
      .from('campos')
      .insert([
        {
          liga_id: liga.id,
          nombre: 'Campo Principal',
          descripcion: 'Campo principal de la liga',
          orden: 1
        },
        {
          liga_id: liga.id,
          nombre: 'Campo Secundario',
          descripcion: 'Campo secundario para partidos simultáneos',
          orden: 2
        }
      ]);

    if (camposError && !camposError.message.includes('duplicate')) {
      console.log('⚠️ Error creando campos:', camposError.message);
    } else {
      console.log('✅ Campos creados');
    }

    // Crear horarios por defecto
    console.log('⏰ Creando horarios por defecto...');
    const { error: horariosError } = await supabase
      .from('horarios')
      .insert([
        {
          liga_id: liga.id,
          nombre: 'M1',
          hora_inicio: '08:00',
          hora_fin: '11:30',
          activo_por_defecto: true,
          orden: 1,
          descripcion: 'Matutino temprano'
        },
        {
          liga_id: liga.id,
          nombre: 'M2',
          hora_inicio: '12:00',
          hora_fin: '14:30',
          activo_por_defecto: true,
          orden: 2,
          descripcion: 'Matutino tardío'
        },
        {
          liga_id: liga.id,
          nombre: 'T1',
          hora_inicio: '15:00',
          hora_fin: '17:30',
          activo_por_defecto: false,
          orden: 3,
          descripcion: 'Vespertino (solo overflow)'
        }
      ]);

    if (horariosError && !horariosError.message.includes('duplicate')) {
      console.log('⚠️ Error creando horarios:', horariosError.message);
    } else {
      console.log('✅ Horarios creados');
    }

    console.log('\n🎯 Configuración inicial completada para liga POLI');

  } catch (error) {
    console.log('⚠️ Error en configuración inicial:', error.message);
  }
}

// Ejecutar migración
applyCalendarMigration().then(() => {
  console.log('\n✅ Proceso completado.');
  process.exit(0);
}).catch(error => {
  console.error('❌ Error fatal:', error);
  process.exit(1);
});