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

async function testColumn() {
  try {
    console.log('🔍 Intentando hacer una consulta SELECT con juegos_jugados...');
    
    // Intentar seleccionar la columna juegos_jugados
    const { data, error } = await supabase
      .from('estadisticas_jugadores')
      .select('juegos_jugados')
      .limit(1);
    
    if (error) {
      if (error.message.includes('column') && error.message.includes('does not exist')) {
        console.log('❌ La columna juegos_jugados NO EXISTE');
        console.log('');
        console.log('🚨 SOLUCIÓN:');
        console.log('1. Ve al dashboard de Supabase: https://app.supabase.com/');
        console.log('2. Selecciona tu proyecto');
        console.log('3. Ve a "SQL Editor"');
        console.log('4. Ejecuta este comando:');
        console.log('');
        console.log('   ALTER TABLE estadisticas_jugadores ADD COLUMN juegos_jugados INTEGER DEFAULT 1;');
        console.log('');
        console.log('5. Luego ejecuta esto para actualizar la función trigger:');
        console.log('');
        console.log(`   CREATE OR REPLACE FUNCTION calcular_hits_totales()
   RETURNS TRIGGER AS $$
   BEGIN
       NEW.hits = COALESCE(NEW.h1, 0) + COALESCE(NEW.h2, 0) + COALESCE(NEW.h3, 0) + COALESCE(NEW.home_runs, 0);
       NEW.dobles = COALESCE(NEW.h2, 0);
       NEW.triples = COALESCE(NEW.h3, 0);
       
       IF NEW.turnos > 0 THEN
           NEW.promedio_bateo = ROUND(NEW.hits::DECIMAL / NEW.turnos, 3);
       ELSE
           NEW.promedio_bateo = 0.000;
       END IF;
       
       NEW.juegos_jugados = 1;
       
       RETURN NEW;
   END;
   $$ LANGUAGE plpgsql;`);
      } else {
        console.error('❌ Error diferente:', error);
      }
    } else {
      console.log('✅ La columna juegos_jugados YA EXISTE');
      console.log('📊 Datos encontrados:', data?.length || 0, 'registros');
    }
    
  } catch (err) {
    console.error('❌ Error:', err.message);
  }
}

testColumn();