const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function verifyJugadorData() {
  console.log('🔍 Verificando consistencia de datos de jugadores...\n');

  try {
    // Obtener todos los jugadores de la tabla usuarios
    const { data: usuarios, error: usuariosError } = await supabase
      .from('usuarios')
      .select(`
        id, 
        nombre, 
        email, 
        role, 
        numero_casaca, 
        equipo_id, 
        posicion,
        foto_url,
        equipos:equipo_id(nombre)
      `)
      .eq('role', 'jugador');

    if (usuariosError) {
      console.error('❌ Error obteniendo usuarios jugadores:', usuariosError);
      return;
    }

    // Obtener datos de la tabla jugadores
    const { data: jugadores, error: jugadoresError } = await supabase
      .from('jugadores')
      .select('*');

    if (jugadoresError && jugadoresError.code !== 'PGRST116') {
      console.error('❌ Error obteniendo tabla jugadores:', jugadoresError);
      return;
    }

    console.log('📊 Resumen de datos:');
    console.log(`  • Usuarios con rol jugador: ${usuarios?.length || 0}`);
    console.log(`  • Registros en tabla jugadores: ${jugadores?.length || 0}`);
    console.log();

    if (usuarios && usuarios.length > 0) {
      console.log('👥 Jugadores registrados:');
      console.log('─'.repeat(80));

      for (const usuario of usuarios) {
        // Buscar datos complementarios en tabla jugadores
        const jugadorData = jugadores?.find(j => j.usuario_id === usuario.id);

        console.log(`🧑 ${usuario.nombre} (${usuario.email})`);
        console.log(`   ID: ${usuario.id}`);
        console.log(`   Equipo: ${usuario.equipos?.nombre || 'Sin equipo'} (ID: ${usuario.equipo_id || 'N/A'})`);
        console.log(`   Número: ${usuario.numero_casaca ? `#${usuario.numero_casaca}` : 'Sin asignar'}`);
        console.log(`   Posición (usuarios): ${usuario.posicion || 'N/A'}`);
        console.log(`   Foto (usuarios): ${usuario.foto_url ? 'Sí' : 'No'}`);
        
        if (jugadorData) {
          console.log(`   ┌─ Datos complementarios (tabla jugadores):`);
          console.log(`   │  Posición: ${jugadorData.posicion || 'N/A'}`);
          console.log(`   │  Fecha nacimiento: ${jugadorData.fecha_nacimiento || 'N/A'}`);
          console.log(`   │  Foto: ${jugadorData.foto_url ? 'Sí' : 'No'}`);
          console.log(`   └─ Estado: ${jugadorData.estado || 'N/A'}`);
        } else {
          console.log(`   ❌ Sin registro en tabla jugadores`);
        }
        
        console.log();
      }

      // Verificar consistencia
      console.log('🔎 Verificando consistencia...');
      let inconsistencias = 0;

      for (const usuario of usuarios) {
        const jugadorData = jugadores?.find(j => j.usuario_id === usuario.id);
        
        if (jugadorData) {
          // Verificar que los datos coincidan
          if (usuario.numero_casaca !== jugadorData.numero_casaca) {
            console.log(`⚠️  ${usuario.nombre}: Número de casaca inconsistente (usuarios: ${usuario.numero_casaca}, jugadores: ${jugadorData.numero_casaca})`);
            inconsistencias++;
          }
          
          if (usuario.foto_url !== jugadorData.foto_url) {
            console.log(`⚠️  ${usuario.nombre}: URL de foto inconsistente`);
            inconsistencias++;
          }
        }
      }

      if (inconsistencias === 0) {
        console.log('✅ Todos los datos son consistentes');
      } else {
        console.log(`❌ Se encontraron ${inconsistencias} inconsistencias`);
      }
    } else {
      console.log('ℹ️  No hay jugadores registrados');
    }

  } catch (error) {
    console.error('💥 Error:', error);
  }
}

verifyJugadorData().then(() => {
  console.log('\n✅ Verificación completada');
  process.exit(0);
}).catch(error => {
  console.error('Error fatal:', error);
  process.exit(1);
});