const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Load environment variables manually
function loadEnvFile() {
  try {
    const envPath = path.join(__dirname, '..', '.env.local');
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

async function checkSupabaseUpdates() {
  loadEnvFile();
  
  console.log('🔍 VERIFICANDO ACTUALIZACIONES EN SUPABASE\n');
  
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false }
  });
  
  try {
    // 1. Ver estado actual de todos los jugadores
    console.log('📊 1. Estado actual en Supabase:');
    const { data: jugadores, error } = await supabase
      .from('jugadores')
      .select('id, nombre, fecha_nacimiento, posicion, updated_at')
      .order('updated_at', { ascending: false });
    
    if (error) {
      console.log('❌ Error:', error.message);
      return;
    }
    
    jugadores.forEach((jugador, index) => {
      console.log(`\n👤 Jugador ${index + 1}: ${jugador.nombre}`);
      console.log(`   📅 fecha_nacimiento: ${jugador.fecha_nacimiento || 'NULL'}`);
      console.log(`   ⚾ posicion: ${jugador.posicion || 'NULL'}`);
      console.log(`   🕒 updated_at: ${jugador.updated_at}`);
    });
    
    // 2. Intentar una actualización de prueba
    if (jugadores.length > 0) {
      const primerJugador = jugadores[0];
      console.log(`\n🧪 2. Haciendo actualización de prueba para: ${primerJugador.nombre}`);
      
      const testFecha = '2000-01-01';
      const testPosicion = 'Test Position';
      
      console.log(`   Actualizando a: fecha="${testFecha}", posicion="${testPosicion}"`);
      
      const { data: updateResult, error: updateError } = await supabase
        .from('jugadores')
        .update({
          fecha_nacimiento: testFecha,
          posicion: testPosicion,
          updated_at: new Date().toISOString()
        })
        .eq('id', primerJugador.id)
        .select();
      
      if (updateError) {
        console.log('❌ Error en actualización de prueba:', updateError);
      } else {
        console.log('✅ Actualización de prueba exitosa');
        console.log('📋 Resultado:', updateResult);
        
        // Verificar que se guardó
        const { data: verificacion } = await supabase
          .from('jugadores')
          .select('fecha_nacimiento, posicion, updated_at')
          .eq('id', primerJugador.id)
          .single();
        
        console.log('\n✔️ Verificación inmediata:');
        console.log(`   📅 fecha_nacimiento: ${verificacion?.fecha_nacimiento}`);
        console.log(`   ⚾ posicion: ${verificacion?.posicion}`);
        console.log(`   🕒 updated_at: ${verificacion?.updated_at}`);
        
        // Restaurar valores originales
        console.log('\n🔄 Restaurando valores originales...');
        await supabase
          .from('jugadores')
          .update({
            fecha_nacimiento: primerJugador.fecha_nacimiento,
            posicion: primerJugador.posicion
          })
          .eq('id', primerJugador.id);
        console.log('✅ Valores restaurados');
      }
    }
    
    // 3. Diagnóstico
    console.log('\n🎯 DIAGNÓSTICO:');
    console.log('✅ Conectividad con Supabase: OK');
    console.log('✅ Permisos de lectura: OK');
    console.log('✅ Permisos de escritura: ' + (updateResult ? 'OK' : 'FALLO'));
    
    if (!updateResult) {
      console.log('\n⚠️ POSIBLES PROBLEMAS:');
      console.log('   1. Row Level Security (RLS) bloqueando actualizaciones');
      console.log('   2. Permisos insuficientes en la tabla jugadores');
      console.log('   3. Trigger o constraint que previene la actualización');
      console.log('   4. El API está usando un usuario diferente al service role');
    }
    
  } catch (error) {
    console.log('💥 Error:', error.message);
  }
}

checkSupabaseUpdates();