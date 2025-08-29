const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function cleanPitcherStats() {
  try {
    console.log('🧹 Iniciando limpieza de estadísticas de pitcher...');

    // 1. Revisar datos existentes en estadisticas_pitcher
    const { data: pitcherStats, error: pitcherError } = await supabase
      .from('estadisticas_pitcher')
      .select('*');

    if (pitcherError) {
      console.error('❌ Error consultando estadisticas_pitcher:', pitcherError);
      return;
    }

    console.log(`📊 Encontradas ${pitcherStats.length} filas en estadisticas_pitcher`);

    // 2. Verificar si hay datos no-cero (datos reales)
    const hasRealData = pitcherStats.some(stat => 
      stat.lanzamientos > 0 || 
      stat.ponches > 0 || 
      stat.bases_por_bolas > 0 || 
      stat.golpes_bateador > 0 || 
      stat.balk > 0
    );

    console.log(`🔍 ¿Hay datos reales en estadisticas_pitcher? ${hasRealData ? 'SÍ' : 'NO'}`);

    if (!hasRealData) {
      console.log('🗑️ Todas las estadísticas están en cero. Eliminando filas vacías...');
      
      const { error: deleteError } = await supabase
        .from('estadisticas_pitcher')
        .delete()
        .eq('lanzamientos', 0)
        .eq('ponches', 0)
        .eq('bases_por_bolas', 0)
        .eq('golpes_bateador', 0)
        .eq('balk', 0);

      if (deleteError) {
        console.error('❌ Error eliminando filas vacías:', deleteError);
        return;
      }

      console.log('✅ Filas vacías eliminadas exitosamente');
    }

    // 3. Verificar si hay columnas de pitcher en estadisticas_jugadores que necesitan migración
    const { data: playerStats, error: playerError } = await supabase
      .from('estadisticas_jugadores')
      .select('id, jugador_id, juego_id, lanzamientos, ponches_pitcher, bases_por_bolas_pitcher, golpes_bateador, balk')
      .not('lanzamientos', 'is', null)
      .limit(5);

    if (playerError && playerError.code !== 'PGRST116') {
      console.error('❌ Error consultando estadisticas_jugadores:', playerError);
      return;
    }

    if (playerStats && playerStats.length > 0) {
      console.log(`🔄 Encontradas ${playerStats.length} filas con datos de pitcher en estadisticas_jugadores`);
      console.log('📋 Ejemplo de datos a migrar:', playerStats[0]);

      const migrateData = await askUserConfirmation('¿Deseas migrar estos datos a estadisticas_pitcher? (y/N)');
      
      if (migrateData) {
        // Migrar datos reales de pitcher de estadisticas_jugadores a estadisticas_pitcher
        console.log('🔄 Iniciando migración de datos...');
        
        // Este comando se ejecutará manualmente después de la confirmación
        console.log(`
📝 COMANDO SQL PARA EJECUTAR EN SUPABASE:

-- Migrar datos de pitcher con valores > 0
INSERT INTO estadisticas_pitcher (
    juego_id, 
    jugador_id, 
    liga_id,
    lanzamientos,
    ponches,
    bases_por_bolas,
    golpes_bateador,
    balk
)
SELECT DISTINCT
    e.juego_id,
    e.jugador_id,
    j.liga_id,
    COALESCE(e.lanzamientos, 0),
    COALESCE(e.ponches_pitcher, 0),
    COALESCE(e.bases_por_bolas_pitcher, 0),
    COALESCE(e.golpes_bateador, 0),
    COALESCE(e.balk, 0)
FROM estadisticas_jugadores e
JOIN jugadores j ON e.jugador_id = j.id
WHERE (e.lanzamientos > 0 OR e.ponches_pitcher > 0 OR e.bases_por_bolas_pitcher > 0 OR e.golpes_bateador > 0 OR e.balk > 0)
ON CONFLICT (juego_id, jugador_id) DO UPDATE SET
    lanzamientos = EXCLUDED.lanzamientos,
    ponches = EXCLUDED.ponches,
    bases_por_bolas = EXCLUDED.bases_por_bolas,
    golpes_bateador = EXCLUDED.golpes_bateador,
    balk = EXCLUDED.balk;

-- Después de verificar la migración, limpiar columnas de estadisticas_jugadores:
-- ALTER TABLE estadisticas_jugadores DROP COLUMN IF EXISTS lanzamientos;
-- ALTER TABLE estadisticas_jugadores DROP COLUMN IF EXISTS ponches_pitcher;  
-- ALTER TABLE estadisticas_jugadores DROP COLUMN IF EXISTS bases_por_bolas_pitcher;
-- ALTER TABLE estadisticas_jugadores DROP COLUMN IF EXISTS golpes_bateador;
-- ALTER TABLE estadisticas_jugadores DROP COLUMN IF EXISTS balk;
        `);
      }
    } else {
      console.log('ℹ️ No se encontraron columnas de pitcher en estadisticas_jugadores o están vacías');
    }

    // 4. Mostrar resumen final
    const { data: finalPitcherStats, error: finalError } = await supabase
      .from('estadisticas_pitcher')
      .select('id');

    if (!finalError) {
      console.log(`✅ Limpieza completada. Filas restantes en estadisticas_pitcher: ${finalPitcherStats.length}`);
    }

    console.log(`
📋 RESUMEN:
- estadisticas_pitcher: Tabla separada para estadísticas de pitcheo
- Datos vacíos: ${hasRealData ? 'Conservados (hay datos reales)' : 'Eliminados'}
- Estructura: Lista para recibir nuevas estadísticas de pitcher

🎯 RECOMENDACIÓN:
${hasRealData ? 
  '- Revisar manualmente si los datos en estadisticas_pitcher son correctos' :
  '- La tabla estadisticas_pitcher está limpia y lista para nuevos datos'
}
- Las nuevas estadísticas de pitcher se guardarán automáticamente en estadisticas_pitcher
- Las estadísticas de bateo siguen en estadisticas_jugadores
    `);

  } catch (error) {
    console.error('💥 Error durante la limpieza:', error);
  }
}

function askUserConfirmation(question) {
  // En un entorno real, usarías readline o similar
  // Por ahora, retorna false para modo automático
  console.log(`❓ ${question}`);
  console.log('ℹ️ Retornando false por defecto (modo automático)');
  return false;
}

// Ejecutar si se llama directamente
if (require.main === module) {
  cleanPitcherStats().catch(console.error);
}

module.exports = { cleanPitcherStats };