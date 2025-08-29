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

// Columnas que intenta usar el trigger
const triggerColumns = [
  'hits',
  'h1',
  'h2', 
  'h3',
  'home_runs',
  'dobles',      // ← Esta parece que no existe
  'triples',     // ← Esta parece que no existe  
  'turnos',
  'promedio_bateo',
  'juegos_jugados'
];

async function checkColumns() {
  try {
    console.log('🔍 Verificando columnas que usa el trigger...\n');
    
    const existingColumns = [];
    const missingColumns = [];
    
    for (const column of triggerColumns) {
      try {
        const { data, error } = await supabase
          .from('estadisticas_jugadores')
          .select(column)
          .limit(1);
        
        if (error && error.message.includes('column') && error.message.includes('does not exist')) {
          missingColumns.push(column);
          console.log(`❌ NO EXISTE: ${column}`);
        } else {
          existingColumns.push(column);
          console.log(`✅ EXISTE: ${column}`);
        }
      } catch (err) {
        missingColumns.push(column);
        console.log(`❌ NO EXISTE: ${column}`);
      }
    }
    
    console.log('\n' + '='.repeat(50));
    
    if (missingColumns.length > 0) {
      console.log(`🚨 FALTAN ${missingColumns.length} COLUMNAS PARA EL TRIGGER:`);
      console.log('   ' + missingColumns.join(', '));
      
      console.log('\n🔧 EJECUTA ESTE SQL EN SUPABASE:');
      console.log('=' + '='.repeat(48) + '=');
      
      // Generar SQL para columnas faltantes
      let sql = `-- Agregar columnas faltantes para el trigger\n`;
      
      if (missingColumns.includes('dobles')) {
        sql += `ALTER TABLE estadisticas_jugadores ADD COLUMN dobles INTEGER DEFAULT 0;\n`;
      }
      if (missingColumns.includes('triples')) {
        sql += `ALTER TABLE estadisticas_jugadores ADD COLUMN triples INTEGER DEFAULT 0;\n`;
      }
      
      // Función trigger actualizada (sin usar columnas que no existen)
      sql += `\n-- Función trigger CORREGIDA\n`;
      sql += `CREATE OR REPLACE FUNCTION calcular_hits_totales()
RETURNS TRIGGER AS $$
BEGIN
    -- Calcular hits totales como suma de H1 + H2 + H3 + HR
    NEW.hits = COALESCE(NEW.h1, 0) + COALESCE(NEW.h2, 0) + COALESCE(NEW.h3, 0) + COALESCE(NEW.home_runs, 0);
    
    -- Solo actualizar columnas si existen
    ${missingColumns.includes('dobles') ? '-- ' : ''}NEW.dobles = COALESCE(NEW.h2, 0);
    ${missingColumns.includes('triples') ? '-- ' : ''}NEW.triples = COALESCE(NEW.h3, 0);
    
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
$$ LANGUAGE plpgsql;`;

      console.log(sql);
      console.log('=' + '='.repeat(48) + '=');
      
    } else {
      console.log('✅ Todas las columnas del trigger existen');
      
      // Crear función trigger simplificada
      console.log('\n🔧 TRIGGER SIMPLIFICADO (EJECUTA EN SUPABASE):');
      console.log('=' + '='.repeat(48) + '=');
      
      const simplifiedTrigger = `-- Función trigger simplificada (solo columnas que existen)
CREATE OR REPLACE FUNCTION calcular_hits_totales()
RETURNS TRIGGER AS $$
BEGIN
    -- Calcular hits totales
    NEW.hits = COALESCE(NEW.h1, 0) + COALESCE(NEW.h2, 0) + COALESCE(NEW.h3, 0) + COALESCE(NEW.home_runs, 0);
    
    -- Calcular promedio de bateo
    IF NEW.turnos > 0 THEN
        NEW.promedio_bateo = ROUND(NEW.hits::DECIMAL / NEW.turnos, 3);
    ELSE
        NEW.promedio_bateo = 0.000;
    END IF;
    
    -- Establecer juegos jugados
    NEW.juegos_jugados = 1;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;`;
      
      console.log(simplifiedTrigger);
      console.log('=' + '='.repeat(48) + '=');
    }
    
  } catch (err) {
    console.error('❌ Error:', err.message);
  }
}

checkColumns();