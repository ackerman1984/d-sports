const { createClient } = require('@supabase/supabase-js');

// Cargar variables de entorno
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Variables de entorno de Supabase no encontradas');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Columnas que necesita el sistema de anotación
const requiredColumns = [
  'h1',
  'h2', 
  'h3',
  'turnos',
  'juego_id',
  'juegos_jugados',
  'promedio_bateo'
];

async function checkMissingColumns() {
  try {
    console.log('🔍 Verificando columnas requeridas en estadisticas_jugadores...\n');
    
    const missingColumns = [];
    
    for (const column of requiredColumns) {
      try {
        const { data, error } = await supabase
          .from('estadisticas_jugadores')
          .select(column)
          .limit(1);
        
        if (error && error.message.includes('column') && error.message.includes('does not exist')) {
          missingColumns.push(column);
          console.log(`❌ Falta: ${column}`);
        } else {
          console.log(`✅ Existe: ${column}`);
        }
      } catch (err) {
        missingColumns.push(column);
        console.log(`❌ Falta: ${column}`);
      }
    }
    
    console.log('\n' + '='.repeat(50));
    
    if (missingColumns.length === 0) {
      console.log('🎉 ¡Todas las columnas requeridas existen!');
      return;
    }
    
    console.log(`🚨 FALTAN ${missingColumns.length} COLUMNAS:`);
    console.log('   ' + missingColumns.join(', '));
    
    console.log('\n🔧 EJECUTA ESTE SQL EN SUPABASE:');
    console.log('=' + '='.repeat(48) + '=');
    
    // Generar SQL para agregar columnas faltantes
    let sql = `-- Agregar columnas faltantes a estadisticas_jugadores\n`;
    
    if (missingColumns.includes('h1')) {
      sql += `ALTER TABLE estadisticas_jugadores ADD COLUMN h1 INTEGER DEFAULT 0;\n`;
    }
    if (missingColumns.includes('h2')) {
      sql += `ALTER TABLE estadisticas_jugadores ADD COLUMN h2 INTEGER DEFAULT 0;\n`;
    }
    if (missingColumns.includes('h3')) {
      sql += `ALTER TABLE estadisticas_jugadores ADD COLUMN h3 INTEGER DEFAULT 0;\n`;
    }
    if (missingColumns.includes('turnos')) {
      sql += `ALTER TABLE estadisticas_jugadores ADD COLUMN turnos INTEGER DEFAULT 0;\n`;
    }
    if (missingColumns.includes('juego_id')) {
      sql += `ALTER TABLE estadisticas_jugadores ADD COLUMN juego_id UUID;\n`;
    }
    if (missingColumns.includes('juegos_jugados')) {
      sql += `ALTER TABLE estadisticas_jugadores ADD COLUMN juegos_jugados INTEGER DEFAULT 1;\n`;
    }
    if (missingColumns.includes('promedio_bateo')) {
      sql += `ALTER TABLE estadisticas_jugadores ADD COLUMN promedio_bateo DECIMAL(4,3) DEFAULT 0.000;\n`;
    }
    
    // Crear/actualizar función trigger
    sql += `\n-- Función trigger para cálculos automáticos\n`;
    sql += `CREATE OR REPLACE FUNCTION calcular_hits_totales()
RETURNS TRIGGER AS $$
BEGIN
    -- Calcular hits totales como suma de H1 + H2 + H3 + HR
    NEW.hits = COALESCE(NEW.h1, 0) + COALESCE(NEW.h2, 0) + COALESCE(NEW.h3, 0) + COALESCE(NEW.home_runs, 0);
    
    -- Actualizar dobles y triples en las columnas existentes para compatibilidad
    NEW.dobles = COALESCE(NEW.h2, 0);
    NEW.triples = COALESCE(NEW.h3, 0);
    
    -- Calcular promedio de bateo si hay turnos
    IF NEW.turnos > 0 THEN
        NEW.promedio_bateo = ROUND(NEW.hits::DECIMAL / NEW.turnos, 3);
    ELSE
        NEW.promedio_bateo = 0.000;
    END IF;
    
    -- Establecer juegos jugados
    NEW.juegos_jugados = 1;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Crear trigger si no existe
DROP TRIGGER IF EXISTS calcular_hits_trigger ON estadisticas_jugadores;
CREATE TRIGGER calcular_hits_trigger
    BEFORE INSERT OR UPDATE ON estadisticas_jugadores
    FOR EACH ROW
    EXECUTE FUNCTION calcular_hits_totales();`;
    
    console.log(sql);
    console.log('=' + '='.repeat(48) + '=');
    
    console.log('\n📋 PASOS:');
    console.log('1. Copia TODO el SQL de arriba');
    console.log('2. Ve a https://app.supabase.com/');
    console.log('3. Selecciona tu proyecto');
    console.log('4. Ve a "SQL Editor"');
    console.log('5. Pega y ejecuta el SQL completo');
    
  } catch (err) {
    console.error('❌ Error:', err.message);
  }
}

checkMissingColumns();