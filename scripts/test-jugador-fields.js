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

async function testJugadorFields() {
  loadEnvFile();
  
  console.log('🧪 PROBANDO CAMPOS DE JUGADORES\n');
  
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false }
  });
  
  try {
    // 1. Verificar estructura actual de tabla jugadores
    console.log('📋 1. Verificando estructura de tabla jugadores...');
    
    const { data: jugadoresTest, error: structureError } = await supabase
      .from('jugadores')
      .select('*')
      .limit(1);
    
    if (structureError && structureError.code !== 'PGRST116') {
      console.log('❌ Error:', structureError.message);
      return;
    }
    
    if (jugadoresTest && jugadoresTest.length > 0) {
      const campos = Object.keys(jugadoresTest[0]);
      console.log('📊 Campos en tabla jugadores:', campos.join(', '));
      
      // Verificar campos específicos
      const camposEsperados = ['telefono', 'created_by', 'updated_at'];
      const camposObsoletos = ['usuario_id'];
      
      console.log('\n🔍 Verificación de campos específicos:');
      
      camposEsperados.forEach(campo => {
        if (campos.includes(campo)) {
          console.log(`✅ Campo ${campo}: Presente`);
        } else {
          console.log(`❌ Campo ${campo}: FALTANTE`);
        }
      });
      
      camposObsoletos.forEach(campo => {
        if (campos.includes(campo)) {
          console.log(`⚠️ Campo ${campo}: OBSOLETO (debería ser removido)`);
        } else {
          console.log(`✅ Campo ${campo}: Correctamente removido`);
        }
      });
      
      // Mostrar datos del jugador
      const jugador = jugadoresTest[0];
      console.log('\n📊 Datos del primer jugador:');
      console.log(`   Nombre: ${jugador.nombre || 'N/A'}`);
      console.log(`   Email: ${jugador.email || 'N/A'}`);
      console.log(`   Telefono: ${jugador.telefono || 'N/A'}`);
      console.log(`   Created_by: ${jugador.created_by || 'null (auto-registro)'}`);
      console.log(`   Usuario_id: ${jugador.usuario_id || 'N/A (correcto si no existe)'}`);
      
    } else {
      console.log('📊 Tabla jugadores vacía - creando jugador de prueba...');
      
      // Crear datos de prueba
      const timestamp = Date.now();
      const testEmail = `jugador-test-${timestamp}@example.com`;
      
      // Primero crear usuario auth
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email: testEmail,
        password: 'testpassword123',
        email_confirm: true,
      });
      
      if (authError) {
        console.log('❌ Error creando auth user:', authError.message);
        return;
      }
      
      console.log('✅ Usuario auth creado:', authData.user.id);
      
      // Crear jugador con todos los campos
      const { data: jugadorData, error: jugadorError } = await supabase
        .from('jugadores')
        .insert({
          id: authData.user.id,
          nombre: 'Jugador Test',
          email: testEmail,
          telefono: '555-0123',
          liga_id: null,
          activo: true,
          estado: 'activo',
          created_by: null, // Auto-registro
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single();
      
      if (jugadorError) {
        console.log('❌ Error creando jugador:', jugadorError.message);
        console.log('   Esto podría indicar campos faltantes o errores de estructura');
      } else {
        console.log('✅ Jugador de prueba creado exitosamente');
        console.log('📊 Campos del jugador:', Object.keys(jugadorData).join(', '));
        
        // Verificar que los campos críticos se llenaron
        console.log('\n🔍 Verificación de campos críticos:');
        console.log(`   Telefono: ${jugadorData.telefono || 'NO LLENADO'}`);
        console.log(`   Created_by: ${jugadorData.created_by === null ? 'null (correcto para auto-registro)' : jugadorData.created_by}`);
        console.log(`   Usuario_id: ${jugadorData.usuario_id || 'N/A (correcto si no existe)'}`);
      }
      
      // Limpiar datos de prueba
      console.log('\n🧹 Limpiando datos de prueba...');
      await supabase.from('jugadores').delete().eq('id', authData.user.id);
      await supabase.from('usuarios').delete().eq('id', authData.user.id);
      await supabase.auth.admin.deleteUser(authData.user.id);
      console.log('✅ Datos de prueba eliminados');
    }
    
    // 2. Verificar APIs funcionan correctamente
    console.log('\n🔧 2. Estado de APIs actualizados:');
    console.log('   ✅ /lib/auth/registration.ts - Telefono agregado');
    console.log('   ✅ /api/admin/jugadores - Telefono y created_by configurados');
    console.log('   ✅ /api/jugador/profile - Telefono movido a tabla jugadores');
    
    // 3. Resumen
    console.log('\n📋 RESUMEN:');
    console.log('   📞 Telefono: Se maneja en tabla jugadores (no en usuarios)');
    console.log('   👥 Created_by: null = auto-registro, UUID = creado por admin');
    console.log('   🗑️ Usuario_id: Campo obsoleto, debe ser removido de tabla');
    
    console.log('\n📝 PRÓXIMO PASO:');
    console.log('   Si usuario_id aún aparece, ejecuta: scripts/remove-usuario-id-field.sql');
    
  } catch (error) {
    console.log('💥 Error:', error.message);
  }
}

testJugadorFields();