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

async function limpiarTablaUsuarios() {
  try {
    console.log('🧹 Limpiando tabla usuarios directamente...');

    // 1. Obtener todos los usuarios sin jugadores asociados
    const { data: todosUsuarios, error: usuariosError } = await supabase
      .from('usuarios')
      .select('id, email, nombre, role')
      .eq('role', 'jugador');

    if (usuariosError) {
      console.error('❌ Error obteniendo usuarios:', usuariosError);
      return;
    }

    console.log(`📊 Total usuarios con role 'jugador': ${todosUsuarios?.length || 0}`);

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

    console.log(`🔍 Usuarios sin jugadores asociados: ${usuariosSinJugadores.length}`);

    if (usuariosSinJugadores.length === 0) {
      console.log('✅ No hay usuarios para limpiar');
      return;
    }

    // 2. Eliminar usuarios directamente de la tabla
    for (const usuario of usuariosSinJugadores) {
      console.log(`🗑️ Eliminando usuario: ${usuario.nombre} (${usuario.email})`);
      
      const { error: deleteError } = await supabase
        .from('usuarios')
        .delete()
        .eq('id', usuario.id);

      if (deleteError) {
        console.error(`❌ Error eliminando usuario ${usuario.id}:`, deleteError);
      } else {
        console.log(`✅ Usuario eliminado de tabla usuarios: ${usuario.nombre} (${usuario.email})`);
      }
    }

    console.log('\n🎯 Verificando resultado...');
    
    // 3. Verificar que se limpiaron correctamente
    const { data: usuariosRestantes, error: verificarError } = await supabase
      .from('usuarios')
      .select('id, email, nombre, role')
      .eq('role', 'jugador');

    if (verificarError) {
      console.error('❌ Error verificando usuarios restantes:', verificarError);
      return;
    }

    const usuariosRestantesSinJugadores = [];
    for (const usuario of usuariosRestantes || []) {
      const { data: jugadorAsociado } = await supabase
        .from('jugadores')
        .select('id')
        .eq('usuario_id', usuario.id)
        .single();

      if (!jugadorAsociado) {
        usuariosRestantesSinJugadores.push(usuario);
      }
    }

    console.log(`✅ Usuarios restantes sin jugadores: ${usuariosRestantesSinJugadores.length}`);
    if (usuariosRestantesSinJugadores.length > 0) {
      usuariosRestantesSinJugadores.forEach(u => {
        console.log(`  - ${u.nombre} (${u.email})`);
      });
    }

    console.log('\n✅ Limpieza completada!');

  } catch (error) {
    console.error('💥 Error durante la limpieza:', error);
  }
}

// Ejecutar
limpiarTablaUsuarios();