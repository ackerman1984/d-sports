const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function createCalendarTables() {
  console.log('🗓️ Creando tablas del sistema de calendario...\n');

  const tables = [
    {
      name: 'configuracion_temporada',
      sql: `
        CREATE TABLE IF NOT EXISTS configuracion_temporada (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          liga_id UUID NOT NULL REFERENCES ligas(id) ON DELETE CASCADE,
          nombre VARCHAR(255) NOT NULL,
          fecha_inicio DATE NOT NULL,
          fecha_fin DATE NOT NULL,
          playoffs_inicio DATE,
          max_juegos_por_sabado INTEGER DEFAULT 5,
          vueltas_programadas INTEGER DEFAULT 2,
          estado VARCHAR(20) DEFAULT 'configuracion',
          auto_generar BOOLEAN DEFAULT true,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );
      `
    },
    {
      name: 'campos',
      sql: `
        CREATE TABLE IF NOT EXISTS campos (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          liga_id UUID NOT NULL REFERENCES ligas(id) ON DELETE CASCADE,
          nombre VARCHAR(100) NOT NULL,
          descripcion TEXT,
          ubicacion TEXT,
          activo BOOLEAN DEFAULT true,
          orden INTEGER DEFAULT 1,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );
      `
    },
    {
      name: 'horarios',
      sql: `
        CREATE TABLE IF NOT EXISTS horarios (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          liga_id UUID NOT NULL REFERENCES ligas(id) ON DELETE CASCADE,
          nombre VARCHAR(50) NOT NULL,
          hora_inicio TIME NOT NULL,
          hora_fin TIME NOT NULL,
          activo_por_defecto BOOLEAN DEFAULT true,
          orden INTEGER DEFAULT 1,
          descripcion TEXT,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );
      `
    },
    {
      name: 'jornadas',
      sql: `
        CREATE TABLE IF NOT EXISTS jornadas (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          temporada_id UUID NOT NULL REFERENCES configuracion_temporada(id) ON DELETE CASCADE,
          numero_jornada INTEGER NOT NULL,
          fecha DATE NOT NULL,
          vuelta INTEGER NOT NULL,
          ronda INTEGER,
          tipo VARCHAR(20) DEFAULT 'regular',
          estado VARCHAR(20) DEFAULT 'programada',
          capacidad_maxima INTEGER DEFAULT 5,
          partidos_programados INTEGER DEFAULT 0,
          notas TEXT,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );
      `
    },
    {
      name: 'partidos_calendario',
      sql: `
        CREATE TABLE IF NOT EXISTS partidos_calendario (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          jornada_id UUID NOT NULL REFERENCES jornadas(id) ON DELETE CASCADE,
          temporada_id UUID NOT NULL REFERENCES configuracion_temporada(id) ON DELETE CASCADE,
          equipo_local_id UUID REFERENCES equipos(id) ON DELETE CASCADE,
          equipo_visitante_id UUID REFERENCES equipos(id) ON DELETE CASCADE,
          campo_id UUID REFERENCES campos(id) ON DELETE SET NULL,
          horario_id UUID REFERENCES horarios(id) ON DELETE SET NULL,
          numero_partido INTEGER,
          vuelta INTEGER NOT NULL,
          es_bye BOOLEAN DEFAULT false,
          estado VARCHAR(20) DEFAULT 'programado',
          fecha_programada DATE,
          hora_programada TIME,
          reprogramado_desde UUID REFERENCES partidos_calendario(id),
          motivo_reprogramacion TEXT,
          fecha_reprogramacion TIMESTAMP WITH TIME ZONE,
          marcador_local INTEGER,
          marcador_visitante INTEGER,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );
      `
    }
  ];

  for (const table of tables) {
    try {
      console.log(`📝 Creando tabla ${table.name}...`);
      
      const { error } = await supabase
        .from('_supabase_admin')
        .select('*')
        .limit(1); // Solo para probar conectividad

      // Como no podemos usar RPC, vamos a usar un enfoque alternativo
      // Vamos a verificar si las tablas existen consultándolas
      
      const { data, error: checkError } = await supabase
        .from(table.name)
        .select('*')
        .limit(1);

      if (checkError && checkError.code === 'PGRST106') {
        console.log(`⚠️ Tabla ${table.name} no existe. Necesita ser creada manualmente.`);
      } else {
        console.log(`✅ Tabla ${table.name} ya existe o está accesible.`);
      }

    } catch (error) {
      console.log(`⚠️ Error verificando tabla ${table.name}:`, error.message);
    }
  }

  console.log('\n📋 Para crear las tablas, ejecuta estos SQLs en Supabase Dashboard:');
  console.log('\n-- 1. CONFIGURACION_TEMPORADA');
  console.log(`${tables[0].sql}`);
  
  console.log('\n-- 2. CAMPOS');
  console.log(`${tables[1].sql}`);
  
  console.log('\n-- 3. HORARIOS');
  console.log(`${tables[2].sql}`);
  
  console.log('\n-- 4. JORNADAS');
  console.log(`${tables[3].sql}`);
  
  console.log('\n-- 5. PARTIDOS_CALENDARIO');
  console.log(`${tables[4].sql}`);

  // Intentar crear datos iniciales
  await createInitialData();
}

async function createInitialData() {
  console.log('\n📋 Intentando crear datos iniciales...');
  
  try {
    // Verificar liga POLI
    const { data: liga, error: ligaError } = await supabase
      .from('ligas')
      .select('id, nombre')
      .eq('codigo', 'POLI')
      .single();

    if (ligaError || !liga) {
      console.log('⚠️ Liga POLI no encontrada');
      return;
    }

    console.log(`✅ Liga encontrada: ${liga.nombre}`);

    // Datos iniciales para insertar manualmente
    console.log('\n📊 Para insertar datos iniciales, usa estos SQLs:');
    
    console.log(`
-- CAMPOS INICIALES
INSERT INTO campos (liga_id, nombre, descripcion, orden) VALUES
('${liga.id}', 'Campo Principal', 'Campo principal de la liga', 1),
('${liga.id}', 'Campo Secundario', 'Campo secundario para partidos simultáneos', 2)
ON CONFLICT DO NOTHING;
    `);

    console.log(`
-- HORARIOS INICIALES  
INSERT INTO horarios (liga_id, nombre, hora_inicio, hora_fin, activo_por_defecto, orden, descripcion) VALUES
('${liga.id}', 'M1', '08:00', '11:30', true, 1, 'Matutino temprano'),
('${liga.id}', 'M2', '12:00', '14:30', true, 2, 'Matutino tardío'),
('${liga.id}', 'T1', '15:00', '17:30', false, 3, 'Vespertino (solo overflow)')
ON CONFLICT DO NOTHING;
    `);

  } catch (error) {
    console.log('⚠️ Error obteniendo datos iniciales:', error.message);
  }
}

createCalendarTables();