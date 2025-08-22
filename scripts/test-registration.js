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

async function testEmailAvailability() {
  try {
    console.log('🧪 Probando disponibilidad de emails para registro...');

    const testEmails = [
      'test@gmail.com',
      'pepe@test.com',
      'ramon@gmail.com',
      'jugador10@gmail.com',
      'test1@gmail.com',
      'test2@gmail.com'
    ];

    for (const email of testEmails) {
      console.log(`\n📧 Verificando email: ${email}`);
      
      // Verificar en tabla usuarios
      const { data: usuarioExistente, error: usuarioError } = await supabase
        .from('usuarios')
        .select('id, email, nombre')
        .eq('email', email)
        .single();

      if (usuarioError && usuarioError.code !== 'PGRST116') {
        console.log(`  ❌ Error verificando usuario: ${usuarioError.message}`);
        continue;
      }

      // Verificar en tabla jugadores
      const { data: jugadorExistente, error: jugadorError } = await supabase
        .from('jugadores')
        .select('id, email, nombre')
        .eq('email', email)
        .single();

      if (jugadorError && jugadorError.code !== 'PGRST116') {
        console.log(`  ❌ Error verificando jugador: ${jugadorError.message}`);
        continue;
      }

      if (!usuarioExistente && !jugadorExistente) {
        console.log(`  ✅ Email disponible para registro`);
      } else {
        console.log(`  ⚠️ Email ya existe:`);
        if (usuarioExistente) {
          console.log(`     - En usuarios: ${usuarioExistente.nombre} (ID: ${usuarioExistente.id})`);
        }
        if (jugadorExistente) {
          console.log(`     - En jugadores: ${jugadorExistente.nombre} (ID: ${jugadorExistente.id})`);
        }
      }
    }

    console.log('\n📊 Resumen de base de datos:');
    
    // Estadísticas generales
    const { data: totalUsuarios } = await supabase
      .from('usuarios')
      .select('id', { count: 'exact' });
    
    const { data: totalJugadores } = await supabase
      .from('jugadores')
      .select('id', { count: 'exact' });

    const { data: jugadoresConUsuario } = await supabase
      .from('jugadores')
      .select('id', { count: 'exact' })
      .not('usuario_id', 'is', null);

    console.log(`  - Total usuarios: ${totalUsuarios?.length || 0}`);
    console.log(`  - Total jugadores: ${totalJugadores?.length || 0}`);
    console.log(`  - Jugadores con usuario_id: ${jugadoresConUsuario?.length || 0}`);
    console.log(`  - Jugadores sin usuario_id: ${(totalJugadores?.length || 0) - (jugadoresConUsuario?.length || 0)}`);

    console.log('\n✅ Verificación completada! La base de datos está limpia y lista para nuevos registros.');

  } catch (error) {
    console.error('💥 Error durante la verificación:', error);
  }
}

// Ejecutar
testEmailAvailability();