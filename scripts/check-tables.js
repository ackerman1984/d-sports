const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkTables() {
  console.log('🔍 Verificando tablas en la base de datos...\n');

  try {
    // Obtener lista de tablas
    const { data: tables, error: tablesError } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public')
      .order('table_name');

    if (tablesError) {
      console.error('Error obteniendo tablas:', tablesError);
      
      // Método alternativo: intentar acceder directamente a tablas conocidas
      console.log('\n🔄 Intentando método alternativo...\n');
      
      const tablasComunes = [
        'usuarios',
        'jugadores', 
        'equipos',
        'ligas',
        'juegos',
        'estadisticas_jugador',
        'anotador_juegos'
      ];

      for (const tabla of tablasComunes) {
        try {
          const { data, error } = await supabase
            .from(tabla)
            .select('*')
            .limit(1);

          if (error) {
            console.log(`❌ ${tabla}: No existe (${error.message})`);
          } else {
            console.log(`✅ ${tabla}: Existe${data ? ` (${data.length === 0 ? 'vacía' : 'con datos'})` : ''}`);
          }
        } catch (err) {
          console.log(`❌ ${tabla}: Error accediendo - ${err.message}`);
        }
      }

      return;
    }

    if (tables && tables.length > 0) {
      console.log('📊 Tablas encontradas:');
      tables.forEach(table => {
        console.log(`  • ${table.table_name}`);
      });

      console.log('\n🔢 Conteos de registros:');
      for (const table of tables) {
        try {
          const { data, error, count } = await supabase
            .from(table.table_name)
            .select('*', { count: 'exact', head: true });

          if (error) {
            console.log(`  • ${table.table_name}: Error (${error.message})`);
          } else {
            console.log(`  • ${table.table_name}: ${count} registros`);
          }
        } catch (err) {
          console.log(`  • ${table.table_name}: Error - ${err.message}`);
        }
      }
    } else {
      console.log('❌ No se encontraron tablas');
    }

  } catch (error) {
    console.error('Error:', error);
  }
}

checkTables().then(() => {
  console.log('\n✅ Verificación completada');
  process.exit(0);
}).catch(error => {
  console.error('Error fatal:', error);
  process.exit(1);
});