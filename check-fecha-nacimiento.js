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

async function checkFechaNacimiento() {
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

  console.log('🔍 Verificando columna fecha_nacimiento...\n');

  try {
    // Intentar query con fecha_nacimiento
    console.log('🧪 Probando query con fecha_nacimiento:');
    const { data: jugadores, error: jugadoresError } = await supabase
      .from('jugadores')
      .select('id, nombre, email, fecha_nacimiento')
      .limit(3);

    if (jugadoresError) {
      if (jugadoresError.message.includes('column "fecha_nacimiento" does not exist')) {
        console.log('❌ La columna fecha_nacimiento NO existe');
        console.log('   Se necesita crear la columna en la base de datos');
      } else {
        console.log('❌ Error inesperado:', jugadoresError.message);
      }
    } else {
      console.log('✅ La columna fecha_nacimiento existe');
      if (jugadores && jugadores.length > 0) {
        console.log('📊 Datos de ejemplo:');
        jugadores.forEach(j => {
          console.log(`   - ${j.nombre}: ${j.fecha_nacimiento || 'No especificada'}`);
        });
      }
    }

  } catch (error) {
    console.error('💥 Error durante verificación:', error);
  }
}

// Run verification
checkFechaNacimiento();