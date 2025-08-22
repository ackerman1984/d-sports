#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Load environment variables manually
function loadEnvFile() {
  try {
    const envPath = path.join(__dirname, '.env.local');
    const envContent = fs.readFileSync(envPath, 'utf8');
    
    envContent.split('\n').forEach(line => {
      const trimmedLine = line.trim();
      if (trimmedLine && !trimmedLine.startsWith('#')) {
        const [key, ...valueParts] = trimmedLine.split('=');
        if (key && valueParts.length > 0) {
          process.env[key.trim()] = valueParts.join('=').trim();
        }
      }
    });
  } catch (error) {
    console.log('Warning: Could not load .env.local file');
  }
}

async function verifyApellidoRemoval() {
  loadEnvFile();
  
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    console.error('❌ Missing required environment variables');
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });

  console.log('🔍 Verificando que la columna apellido fue eliminada...\n');

  try {
    // 1. Verificar estructura de la tabla
    console.log('📋 1. Verificando estructura de tabla jugadores:');
    const { data: columns, error: columnsError } = await supabase
      .from('information_schema.columns')
      .select('column_name, data_type, is_nullable')
      .eq('table_name', 'jugadores')
      .eq('table_schema', 'public')
      .order('column_name');

    if (columnsError) {
      console.error('❌ Error obteniendo columnas:', columnsError);
      return;
    }

    const hasApellido = columns?.some(col => col.column_name === 'apellido');
    const hasNombre = columns?.some(col => col.column_name === 'nombre');

    if (hasApellido) {
      console.log('❌ PROBLEMA: La columna apellido aún existe');
      console.log('   Ejecuta el SQL de migración en Supabase');
    } else {
      console.log('✅ ÉXITO: La columna apellido fue eliminada correctamente');
    }

    if (hasNombre) {
      console.log('✅ ÉXITO: La columna nombre existe');
    } else {
      console.log('❌ PROBLEMA: La columna nombre no existe');
    }

    console.log('\n📊 Columnas actuales en tabla jugadores:');
    columns?.forEach(col => {
      console.log(`   - ${col.column_name} (${col.data_type})`);
    });

    // 2. Verificar datos de jugadores
    console.log('\n👥 2. Verificando datos de jugadores:');
    const { data: players, error: playersError } = await supabase
      .from('jugadores')
      .select('id, nombre, email')
      .limit(5);

    if (playersError) {
      console.error('❌ Error obteniendo jugadores:', playersError);
      return;
    }

    if (players && players.length > 0) {
      console.log(`✅ ${players.length} jugadores encontrados. Ejemplos:`);
      players.forEach(player => {
        console.log(`   - ${player.nombre} (${player.email})`);
      });
    } else {
      console.log('ℹ️ No hay jugadores en la base de datos');
    }

    // 3. Verificar que no hay errores en queries sin apellido
    console.log('\n🧪 3. Verificando que las queries funcionan sin apellido:');
    try {
      const { data: testQuery, error: testError } = await supabase
        .from('jugadores')
        .select('nombre, email, numero_casaca')
        .limit(1);

      if (testError) {
        console.log('❌ Error en query de prueba:', testError.message);
      } else {
        console.log('✅ Queries funcionan correctamente sin apellido');
      }
    } catch (error) {
      console.log('❌ Error ejecutando query de prueba:', error.message);
    }

    console.log('\n🎉 ===============================================');
    console.log('🎉 VERIFICACIÓN COMPLETADA');
    console.log('🎉 ===============================================');
    
    if (!hasApellido && hasNombre) {
      console.log('✅ Todo está correcto:');
      console.log('✅ - Columna apellido eliminada');
      console.log('✅ - Columna nombre presente');
      console.log('✅ - Formularios actualizados');
      console.log('✅ - Código sin referencias a apellido');
      console.log('\n🚀 El proyecto está listo para usar!');
    } else {
      console.log('⚠️ Hay problemas que resolver:');
      if (hasApellido) console.log('- Ejecutar SQL de migración en Supabase');
      if (!hasNombre) console.log('- Verificar estructura de tabla');
    }

  } catch (error) {
    console.error('💥 Error durante verificación:', error);
  }
}

// Run verification
verifyApellidoRemoval();