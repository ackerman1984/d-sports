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

async function testSpecificAdminCreation() {
  loadEnvFile();
  
  console.log('🧪 PRUEBA ESPECÍFICA DE CREACIÓN ADMIN\n');
  
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false }
  });
  
  // Usar email único con timestamp
  const timestamp = Date.now();
  const testEmail = `admin-test-${timestamp}@example.com`;
  
  const testData = {
    admin: {
      email: testEmail,
      password: 'securepassword123',
      nombre: 'Test Admin',
      telefono: '555-0123'
    },
    liga: {
      nombre: `Liga Test ${timestamp}`,
      equipos: ['Equipo Alpha', 'Equipo Beta'],
      temporadaNombre: 'Temporada Test 2024',
      fechaInicio: '2024-03-01',
      fechaFin: '2024-11-30'
    }
  };
  
  console.log('📧 Email de prueba:', testEmail);
  console.log('🏆 Liga de prueba:', testData.liga.nombre);
  
  try {
    // Primero verificar que el email no existe
    console.log('\n1️⃣ Verificando que el email no existe...');
    const { data: existingUser } = await supabase
      .from('usuarios')
      .select('email')
      .eq('email', testEmail)
      .single();
    
    if (existingUser) {
      console.log('⚠️ Email ya existe en usuarios, eliminando...');
      await supabase.from('usuarios').delete().eq('email', testEmail);
    }
    
    // Verificar en auth.users también
    const { data: { users } } = await supabase.auth.admin.listUsers();
    const existingAuthUser = users.find(u => u.email === testEmail);
    if (existingAuthUser) {
      console.log('⚠️ Email ya existe en auth, eliminando...');
      await supabase.auth.admin.deleteUser(existingAuthUser.id);
    }
    
    console.log('✅ Email libre para usar');
    
    // 2. Crear el usuario paso a paso
    console.log('\n2️⃣ Creando usuario en auth...');
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: testData.admin.email,
      password: testData.admin.password,
      email_confirm: true,
    });
    
    if (authError) {
      console.log('❌ ERROR en creación auth:', authError.message);
      console.log('   Detalles:', JSON.stringify(authError, null, 2));
      return;
    }
    
    console.log('✅ Usuario auth creado:', authData.user.id);
    
    let ligaCreated = null;
    
    try {
      // 3. Crear liga
      console.log('\n3️⃣ Creando liga...');
      const codigo = testData.liga.nombre.toUpperCase().replace(/[^A-Z0-9]/g, '').substring(0, 10);
      const subdominio = testData.liga.nombre.toLowerCase().replace(/[^a-z0-9]/g, '-');
      
      const { data: liga, error: ligaError } = await supabase
        .from('ligas')
        .insert({
          nombre: testData.liga.nombre,
          codigo: codigo,
          subdominio: subdominio,
          activa: true,
        })
        .select()
        .single();
      
      if (ligaError) {
        console.log('❌ ERROR creando liga:', ligaError.message);
        throw ligaError;
      }
      
      ligaCreated = liga;
      console.log('✅ Liga creada:', liga.id);
      
      // 4. Crear usuario en tabla usuarios (UPSERT como en el API real)
      console.log('\n4️⃣ Creando perfil usuario...');
      const { error: perfilError } = await supabase
        .from('usuarios')
        .upsert({
          id: authData.user.id,
          email: testData.admin.email,
          nombre: testData.admin.nombre,
          role: 'admin',
          liga_id: liga.id,
          activo: true,
        });
      
      if (perfilError) {
        console.log('❌ ERROR creando perfil usuario:', perfilError.message);
        console.log('   Detalles:', JSON.stringify(perfilError, null, 2));
        throw perfilError;
      }
      
      console.log('✅ Perfil usuario creado');
      
      // 5. Crear perfil administrador
      console.log('\n5️⃣ Creando perfil administrador...');
      const { error: adminError } = await supabase
        .from('administradores')
        .insert({
          id: authData.user.id,
          nombre: testData.admin.nombre,
          email: testData.admin.email,
          activo: true,
          liga_id: liga.id,
        });
      
      if (adminError) {
        console.log('❌ ERROR creando perfil admin:', adminError.message);
        console.log('   Detalles:', JSON.stringify(adminError, null, 2));
        throw adminError;
      }
      
      console.log('✅ Perfil administrador creado');
      
      // 6. Crear equipos
      console.log('\n6️⃣ Creando equipos...');
      const equiposData = testData.liga.equipos.map((nombre) => ({
        liga_id: liga.id,
        nombre: nombre,
        color: '#FF6B35',
        activo: true,
      }));
      
      const { error: equiposError } = await supabase
        .from('equipos')
        .insert(equiposData);
      
      if (equiposError) {
        console.log('⚠️ Warning creando equipos:', equiposError.message);
      } else {
        console.log('✅ Equipos creados');
      }
      
      console.log('\n🎉 ¡ÉXITO COMPLETO! Todo se creó correctamente');
      console.log('   Usuario ID:', authData.user.id);
      console.log('   Liga ID:', liga.id);
      console.log('   Email:', testData.admin.email);
      
    } catch (creationError) {
      console.log('\n💥 Error durante creación, limpiando...');
      
      // Limpiar todo
      await supabase.auth.admin.deleteUser(authData.user.id);
      await supabase.from('usuarios').delete().eq('id', authData.user.id);
      await supabase.from('administradores').delete().eq('id', authData.user.id);
      
      if (ligaCreated) {
        await supabase.from('equipos').delete().eq('liga_id', ligaCreated.id);
        await supabase.from('ligas').delete().eq('id', ligaCreated.id);
      }
      
      console.log('❌ Error específico:', creationError.message);
      throw creationError;
    }
    
    // Limpiar al final
    console.log('\n🧹 Limpiando datos de prueba...');
    await supabase.auth.admin.deleteUser(authData.user.id);
    await supabase.from('usuarios').delete().eq('id', authData.user.id);
    await supabase.from('administradores').delete().eq('id', authData.user.id);
    await supabase.from('equipos').delete().eq('liga_id', ligaCreated.id);
    await supabase.from('ligas').delete().eq('id', ligaCreated.id);
    console.log('✅ Limpieza completada');
    
  } catch (error) {
    console.log('\n💥 ERROR GENERAL:', error.message);
    
    if (error.code) {
      console.log('   Código:', error.code);
    }
    
    if (error.details) {
      console.log('   Detalles:', error.details);
    }
    
    if (error.hint) {
      console.log('   Pista:', error.hint);
    }
  }
}

testSpecificAdminCreation();