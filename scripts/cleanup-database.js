#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Faltan variables de entorno NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function cleanupDatabase() {
  try {
    console.log('🧹 Iniciando limpieza de base de datos...');

    // 1. Encontrar jugadores sin usuario_id válido
    console.log('\n📋 Buscando jugadores huérfanos...');
    const { data: jugadoresHuerfanos, error: jugadoresError } = await supabase
      .from('jugadores')
      .select('id, email, nombre, usuario_id')
      .is('usuario_id', null);

    if (jugadoresError) {
      console.error('❌ Error buscando jugadores huérfanos:', jugadoresError);
      return;
    }

    console.log(`🔍 Encontrados ${jugadoresHuerfanos?.length || 0} jugadores sin usuario_id`);
    if (jugadoresHuerfanos?.length > 0) {
      jugadoresHuerfanos.forEach(j => {
        console.log(`  - ${j.nombre} (${j.email}) - ID: ${j.id}`);
      });
    }

    // 2. Encontrar usuarios sin jugadores asociados
    console.log('\n👤 Buscando usuarios sin jugadores asociados...');
    const { data: todosUsuarios, error: usuariosError } = await supabase
      .from('usuarios')
      .select('id, email, nombre, role')
      .eq('role', 'jugador');

    if (usuariosError) {
      console.error('❌ Error buscando usuarios:', usuariosError);
      return;
    }

    const usuariosSinJugadores = [];
    for (const usuario of todosUsuarios || []) {
      const { data: jugadorAsociado } = await supabase
        .from('jugadores')
        .select('id')
        .eq('usuario_id', usuario.id)
        .single();

      if (!jugadorAsociado) {
        usuariosSinJugadores.push(usuario);
      }
    }

    console.log(`🔍 Encontrados ${usuariosSinJugadores.length} usuarios sin jugadores asociados`);
    if (usuariosSinJugadores.length > 0) {
      usuariosSinJugadores.forEach(u => {
        console.log(`  - ${u.nombre} (${u.email}) - ID: ${u.id}`);
      });
    }

    // 3. Encontrar registros duplicados por email
    console.log('\n📧 Buscando emails duplicados...');
    const { data: todosJugadores, error: todosJugadoresError } = await supabase
      .from('jugadores')
      .select('id, email, nombre, usuario_id');

    if (todosJugadoresError) {
      console.error('❌ Error obteniendo todos los jugadores:', todosJugadoresError);
      return;
    }

    const emailGroups = {};
    todosJugadores?.forEach(j => {
      if (!emailGroups[j.email]) {
        emailGroups[j.email] = [];
      }
      emailGroups[j.email].push(j);
    });

    const emailsDuplicados = Object.entries(emailGroups).filter(([email, jugadores]) => jugadores.length > 1);
    console.log(`🔍 Encontrados ${emailsDuplicados.length} emails duplicados`);
    emailsDuplicados.forEach(([email, jugadores]) => {
      console.log(`  - ${email}: ${jugadores.length} registros`);
      jugadores.forEach(j => {
        console.log(`    > ${j.nombre} - ID: ${j.id} - usuario_id: ${j.usuario_id || 'NULL'}`);
      });
    });

    // 4. Preguntar al usuario qué limpiar
    console.log('\n🤔 ¿Qué deseas hacer?');
    console.log('1. Limpiar jugadores huérfanos (sin usuario_id)');
    console.log('2. Limpiar usuarios sin jugadores asociados');
    console.log('3. Limpiar emails duplicados (mantener el más reciente)');
    console.log('4. Limpiar todo lo anterior');
    console.log('5. Solo mostrar información (no limpiar nada)');

    return {
      jugadoresHuerfanos,
      usuariosSinJugadores,
      emailsDuplicados
    };

  } catch (error) {
    console.error('💥 Error durante la limpieza:', error);
  }
}

async function limpiarJugadoresHuerfanos(jugadores) {
  if (!jugadores || jugadores.length === 0) {
    console.log('✅ No hay jugadores huérfanos para limpiar');
    return;
  }

  console.log(`🧹 Limpiando ${jugadores.length} jugadores huérfanos...`);
  
  for (const jugador of jugadores) {
    // Eliminar estadísticas primero
    const { error: statsError } = await supabase
      .from('estadisticas_jugador')
      .delete()
      .eq('jugador_id', jugador.id);

    if (statsError) {
      console.warn(`⚠️ Error eliminando estadísticas del jugador ${jugador.id}:`, statsError);
    }

    // Eliminar jugador
    const { error: playerError } = await supabase
      .from('jugadores')
      .delete()
      .eq('id', jugador.id);

    if (playerError) {
      console.error(`❌ Error eliminando jugador ${jugador.id}:`, playerError);
    } else {
      console.log(`✅ Eliminado jugador huérfano: ${jugador.nombre} (${jugador.email})`);
    }
  }
}

async function limpiarUsuariosSinJugadores(usuarios) {
  if (!usuarios || usuarios.length === 0) {
    console.log('✅ No hay usuarios sin jugadores para limpiar');
    return;
  }

  console.log(`🧹 Limpiando ${usuarios.length} usuarios sin jugadores...`);
  
  for (const usuario of usuarios) {
    const { error } = await supabase.auth.admin.deleteUser(usuario.id);

    if (error) {
      console.error(`❌ Error eliminando usuario ${usuario.id}:`, error);
    } else {
      console.log(`✅ Eliminado usuario sin jugador: ${usuario.nombre} (${usuario.email})`);
    }
  }
}

async function limpiarEmailsDuplicados(emailsDuplicados) {
  if (!emailsDuplicados || emailsDuplicados.length === 0) {
    console.log('✅ No hay emails duplicados para limpiar');
    return;
  }

  console.log(`🧹 Limpiando ${emailsDuplicados.length} emails duplicados...`);
  
  for (const [email, jugadores] of emailsDuplicados) {
    // Ordenar por fecha de creación (más reciente primero)
    const jugadoresOrdenados = [...jugadores].sort((a, b) => {
      // Si uno tiene usuario_id y otro no, mantener el que tiene usuario_id
      if (a.usuario_id && !b.usuario_id) return -1;
      if (!a.usuario_id && b.usuario_id) return 1;
      return 0; // Si ambos tienen o no tienen usuario_id, mantener el orden
    });

    const mantener = jugadoresOrdenados[0];
    const eliminar = jugadoresOrdenados.slice(1);

    console.log(`📧 Email ${email}: manteniendo jugador ${mantener.id}, eliminando ${eliminar.length} duplicados`);

    for (const jugador of eliminar) {
      // Eliminar estadísticas primero
      const { error: statsError } = await supabase
        .from('estadisticas_jugador')
        .delete()
        .eq('jugador_id', jugador.id);

      if (statsError) {
        console.warn(`⚠️ Error eliminando estadísticas del jugador ${jugador.id}:`, statsError);
      }

      // Eliminar jugador
      const { error: playerError } = await supabase
        .from('jugadores')
        .delete()
        .eq('id', jugador.id);

      if (playerError) {
        console.error(`❌ Error eliminando jugador duplicado ${jugador.id}:`, playerError);
      } else {
        console.log(`✅ Eliminado duplicado: ${jugador.nombre} (ID: ${jugador.id})`);
      }
    }
  }
}

// Ejecutar si es llamado directamente
if (require.main === module) {
  const arg = process.argv[2];
  
  cleanupDatabase().then(async (result) => {
    if (!result) return;

    const { jugadoresHuerfanos, usuariosSinJugadores, emailsDuplicados } = result;

    switch (arg) {
      case '1':
        await limpiarJugadoresHuerfanos(jugadoresHuerfanos);
        break;
      case '2':
        await limpiarUsuariosSinJugadores(usuariosSinJugadores);
        break;
      case '3':
        await limpiarEmailsDuplicados(emailsDuplicados);
        break;
      case '4':
        await limpiarJugadoresHuerfanos(jugadoresHuerfanos);
        await limpiarUsuariosSinJugadores(usuariosSinJugadores);
        await limpiarEmailsDuplicados(emailsDuplicados);
        break;
      default:
        console.log('\n📋 Información mostrada. Para limpiar, ejecuta:');
        console.log('node scripts/cleanup-database.js [1|2|3|4]');
        break;
    }

    console.log('\n✅ Proceso completado.');
  }).catch(console.error);
}

module.exports = {
  cleanupDatabase,
  limpiarJugadoresHuerfanos,
  limpiarUsuariosSinJugadores,
  limpiarEmailsDuplicados
};