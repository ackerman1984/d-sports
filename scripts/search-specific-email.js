#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Faltan variables de entorno');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function searchSpecificEmail(email) {
  try {
    console.log(`🔍 Buscando exhaustivamente el email: ${email}`);
    
    let foundInAnyTable = false;

    // 1. Buscar en tabla usuarios
    console.log('\n👤 Buscando en tabla usuarios...');
    const { data: usuarios, error: usuariosError } = await supabase
      .from('usuarios')
      .select('*')
      .eq('email', email);

    if (usuariosError) {
      console.error('❌ Error buscando en usuarios:', usuariosError);
    } else if (usuarios && usuarios.length > 0) {
      foundInAnyTable = true;
      console.log(`✅ Encontrado ${usuarios.length} registro(s) en tabla usuarios:`);
      usuarios.forEach(u => {
        console.log(`  - ID: ${u.id}`);
        console.log(`  - Nombre: ${u.nombre}`);
        console.log(`  - Email: ${u.email}`);
        console.log(`  - Role: ${u.role}`);
        console.log(`  - Liga ID: ${u.liga_id}`);
        console.log(`  - Activo: ${u.activo}`);
        console.log(`  - Creado: ${u.created_at}`);
        console.log('  ---');
      });
    } else {
      console.log('❌ No encontrado en tabla usuarios');
    }

    // 2. Buscar en tabla jugadores
    console.log('\n🏃 Buscando en tabla jugadores...');
    const { data: jugadores, error: jugadoresError } = await supabase
      .from('jugadores')
      .select('*')
      .eq('email', email);

    if (jugadoresError) {
      console.error('❌ Error buscando en jugadores:', jugadoresError);
    } else if (jugadores && jugadores.length > 0) {
      foundInAnyTable = true;
      console.log(`✅ Encontrado ${jugadores.length} registro(s) en tabla jugadores:`);
      jugadores.forEach(j => {
        console.log(`  - ID: ${j.id}`);
        console.log(`  - Nombre: ${j.nombre}`);
        console.log(`  - Email: ${j.email}`);
        console.log(`  - Usuario ID: ${j.usuario_id}`);
        console.log(`  - Liga ID: ${j.liga_id}`);
        console.log(`  - Equipo ID: ${j.equipo_id}`);
        console.log(`  - Estado: ${j.estado}`);
        console.log(`  - Creado: ${j.created_at}`);
        console.log('  ---');
      });
    } else {
      console.log('❌ No encontrado en tabla jugadores');
    }

    // 3. Buscar en Supabase Auth usando admin API
    console.log('\n🔐 Buscando en Supabase Auth...');
    try {
      // Intentar obtener usuario por email desde auth
      const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers();
      
      if (authError) {
        console.error('❌ Error listando usuarios de auth:', authError);
      } else {
        const foundAuthUser = authUsers.users.find(user => user.email === email);
        if (foundAuthUser) {
          foundInAnyTable = true;
          console.log('✅ Encontrado en Supabase Auth:');
          console.log(`  - ID: ${foundAuthUser.id}`);
          console.log(`  - Email: ${foundAuthUser.email}`);
          console.log(`  - Email confirmado: ${foundAuthUser.email_confirmed_at ? 'Sí' : 'No'}`);
          console.log(`  - Último login: ${foundAuthUser.last_sign_in_at || 'Nunca'}`);
          console.log(`  - Creado: ${foundAuthUser.created_at}`);
          console.log(`  - Proveedor: ${foundAuthUser.app_metadata?.provider || 'email'}`);
        } else {
          console.log('❌ No encontrado en Supabase Auth');
        }
      }
    } catch (authSearchError) {
      console.error('❌ Error buscando en auth:', authSearchError);
    }

    // 4. Buscar en otras tablas relacionadas
    console.log('\n📊 Buscando en tabla estadisticas_jugador (por si hay referencias)...');
    const { data: estadisticas, error: statsError } = await supabase
      .from('estadisticas_jugador')
      .select('*, jugadores!inner(email)')
      .eq('jugadores.email', email);

    if (statsError) {
      console.error('❌ Error buscando en estadísticas:', statsError);
    } else if (estadisticas && estadisticas.length > 0) {
      foundInAnyTable = true;
      console.log(`✅ Encontrado ${estadisticas.length} registro(s) de estadísticas vinculadas`);
    } else {
      console.log('❌ No encontrado en estadísticas');
    }

    // 5. Resumen
    console.log('\n📋 RESUMEN:');
    if (foundInAnyTable) {
      console.log(`❌ El email ${email} SÍ existe en la base de datos`);
      console.log('🧹 Se necesita limpiar estos registros para poder usar el email');
      return { found: true, usuarios, jugadores };
    } else {
      console.log(`✅ El email ${email} NO existe en ninguna tabla`);
      console.log('🤔 El error puede ser por caché o alguna validación adicional');
      return { found: false, usuarios: [], jugadores: [] };
    }

  } catch (error) {
    console.error('💥 Error durante la búsqueda:', error);
    return { found: false, usuarios: [], jugadores: [] };
  }
}

async function cleanSpecificEmail(email) {
  console.log(`\n🧹 Limpiando todos los registros de ${email}...`);
  
  try {
    // 1. Eliminar de estadísticas primero
    const { error: statsError } = await supabase
      .from('estadisticas_jugador')
      .delete()
      .in('jugador_id', 
        supabase
          .from('jugadores')
          .select('id')
          .eq('email', email)
      );

    if (statsError) {
      console.warn('⚠️ Error eliminando estadísticas:', statsError);
    } else {
      console.log('✅ Estadísticas eliminadas');
    }

    // 2. Eliminar de tabla jugadores
    const { error: jugadoresError } = await supabase
      .from('jugadores')
      .delete()
      .eq('email', email);

    if (jugadoresError) {
      console.error('❌ Error eliminando jugadores:', jugadoresError);
    } else {
      console.log('✅ Registros de jugadores eliminados');
    }

    // 3. Eliminar de tabla usuarios
    const { error: usuariosError } = await supabase
      .from('usuarios')
      .delete()
      .eq('email', email);

    if (usuariosError) {
      console.error('❌ Error eliminando usuarios:', usuariosError);
    } else {
      console.log('✅ Registros de usuarios eliminados');
    }

    // 4. Eliminar de Supabase Auth
    try {
      const { data: authUsers, error: authListError } = await supabase.auth.admin.listUsers();
      if (!authListError) {
        const foundAuthUser = authUsers.users.find(user => user.email === email);
        if (foundAuthUser) {
          const { error: authDeleteError } = await supabase.auth.admin.deleteUser(foundAuthUser.id);
          if (authDeleteError) {
            console.error('❌ Error eliminando de auth:', authDeleteError);
          } else {
            console.log('✅ Usuario eliminado de Supabase Auth');
          }
        } else {
          console.log('✅ No había usuario en Supabase Auth');
        }
      }
    } catch (authError) {
      console.error('❌ Error con Supabase Auth:', authError);
    }

    console.log('\n✅ Limpieza completada!');
    
  } catch (error) {
    console.error('💥 Error durante la limpieza:', error);
  }
}

// Ejecutar si es llamado directamente
if (require.main === module) {
  const email = process.argv[2] || 'jugador1@gmail.com';
  const action = process.argv[3]; // 'clean' para limpiar
  
  searchSpecificEmail(email).then(async (result) => {
    if (result.found && action === 'clean') {
      await cleanSpecificEmail(email);
      
      // Verificar que se limpió
      console.log('\n🔍 Verificando limpieza...');
      const verification = await searchSpecificEmail(email);
      if (!verification.found) {
        console.log('✅ Email completamente limpio y disponible para registro!');
      } else {
        console.log('⚠️ Aún quedan algunos registros, revisar manualmente');
      }
    } else if (result.found) {
      console.log('\n💡 Para limpiar este email, ejecuta:');
      console.log(`node scripts/search-specific-email.js ${email} clean`);
    }
  }).catch(console.error);
}

module.exports = { searchSpecificEmail, cleanSpecificEmail };