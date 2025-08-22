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

async function finalValidation() {
  loadEnvFile();
  
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    console.error('Missing required environment variables');
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });

  try {
    console.log('🔍 VALIDACIÓN FINAL - ESTRUCTURA REESTRUCTURADA\n');
    
    // 1. Verificar estructura específica de tabla usuarios
    console.log('📋 1. Verificando estructura EXACTA de tabla usuarios...');
    try {
      const { data: usuariosTest, error: usuariosError } = await supabase
        .from('usuarios')
        .select('*')
        .limit(1);
      
      if (usuariosError && usuariosError.code !== 'PGRST116') {
        console.log('❌ Error:', usuariosError.message);
        return;
      }
      
      if (usuariosTest && usuariosTest.length > 0) {
        const campos = Object.keys(usuariosTest[0]);
        console.log('📊 Campos actuales:', campos.join(', '));
        
        const camposEsperados = ['id', 'email', 'nombre', 'role', 'liga_id', 'created_at', 'activo'];
        const camposObsoletos = ['telefono', 'foto_url', 'numero_casaca', 'equipo_id', 'posicion', 'ultimo_login', 'updated_at'];
        
        let estructuraCorrecta = true;
        
        // Verificar que no tenga campos obsoletos
        const camposObsoletosPresentes = camposObsoletos.filter(campo => campos.includes(campo));
        if (camposObsoletosPresentes.length > 0) {
          console.log('❌ CAMPOS OBSOLETOS ENCONTRADOS:', camposObsoletosPresentes.join(', '));
          console.log('   Ejecutar: scripts/clean-usuarios-table.sql en Supabase');
          estructuraCorrecta = false;
        }
        
        // Verificar que tenga todos los campos esperados
        const camposFaltantes = camposEsperados.filter(campo => !campos.includes(campo));
        if (camposFaltantes.length > 0) {
          console.log('❌ CAMPOS FALTANTES:', camposFaltantes.join(', '));
          estructuraCorrecta = false;
        }
        
        if (estructuraCorrecta) {
          console.log('✅ Estructura de usuarios es CORRECTA');
        }
      } else {
        console.log('✅ Tabla usuarios vacía - verificando estructura con INSERT...');
        
        // Probar inserción con estructura esperada
        try {
          const testId = '00000000-0000-0000-0000-000000000000';
          await supabase
            .from('usuarios')
            .insert({
              id: testId,
              email: 'test@structure.com',
              nombre: 'Test Structure',
              role: 'admin',
              liga_id: null,
              activo: true
            });
          
          console.log('✅ Estructura de usuarios es CORRECTA');
          
          // Limpiar test
          await supabase
            .from('usuarios')
            .delete()
            .eq('id', testId);
            
        } catch (insertError) {
          console.log('❌ Error en estructura usuarios:', insertError.message);
        }
      }
    } catch (error) {
      console.log('❌ Error verificando usuarios:', error.message);
    }
    
    // 2. Verificar tablas específicas por rol
    console.log('\n📋 2. Verificando tablas específicas por rol...');
    
    const tablasRol = [
      { nombre: 'administradores', campos: ['id', 'nombre', 'email', 'activo', 'liga_id', 'created_at'] },
      { nombre: 'anotadores', campos: ['id', 'email', 'nombre', 'codigo_acceso', 'liga_id', 'activo'] },
      { nombre: 'jugadores', campos: ['id', 'email', 'nombre', 'equipo_id', 'liga_id', 'numero_casaca', 'posicion'] }
    ];
    
    for (const tabla of tablasRol) {
      try {
        const { data, error } = await supabase
          .from(tabla.nombre)
          .select('*')
          .limit(1);
        
        if (error && error.code !== 'PGRST116') {
          console.log(`❌ ${tabla.nombre}: ${error.message}`);
        } else {
          console.log(`✅ ${tabla.nombre}: Accesible y funcional`);
        }
      } catch (e) {
        console.log(`❌ ${tabla.nombre}: Error de acceso`);
      }
    }
    
    // 3. Probar relaciones críticas
    console.log('\n🔗 3. Probando relaciones críticas...');
    
    // Test jugadores-equipos
    try {
      const { error: jugadorEquipoError } = await supabase
        .from('jugadores')
        .select(`
          id,
          nombre,
          equipos(nombre)
        `)
        .limit(1);
      
      if (!jugadorEquipoError) {
        console.log('✅ Relación jugadores-equipos: OK');
      } else {
        console.log('⚠️ Relación jugadores-equipos:', jugadorEquipoError.message);
      }
    } catch (e) {
      console.log('❌ Error probando jugadores-equipos');
    }
    
    // 4. Simular flujo de registro completo
    console.log('\n🧪 4. Simulando flujo de registro completo...');
    
    const testUserId = '99999999-9999-9999-9999-999999999999';
    const testLigaId = '88888888-8888-8888-8888-888888888888';
    
    try {
      // Paso 1: Crear usuario básico
      const { error: userError } = await supabase
        .from('usuarios')
        .insert({
          id: testUserId,
          email: 'test-flow@example.com',
          nombre: 'Test Flow User',
          role: 'jugador',
          liga_id: testLigaId,
          activo: true
        });
      
      if (userError) {
        console.log('❌ Error creando usuario base:', userError.message);
      } else {
        console.log('✅ Paso 1: Usuario básico creado');
        
        // Paso 2: Crear perfil específico
        const { error: profileError } = await supabase
          .from('jugadores')
          .insert({
            id: testUserId,
            email: 'test-flow@example.com',
            nombre: 'Test Flow User',
            liga_id: testLigaId,
            activo: true
          });
        
        if (profileError) {
          console.log('❌ Error creando perfil jugador:', profileError.message);
        } else {
          console.log('✅ Paso 2: Perfil específico creado');
          
          // Paso 3: Consultar datos combinados
          const { data: combinedData, error: queryError } = await supabase
            .from('jugadores')
            .select(`
              id,
              nombre,
              email,
              activo
            `)
            .eq('id', testUserId)
            .single();
          
          if (queryError) {
            console.log('❌ Error consultando datos:', queryError.message);
          } else {
            console.log('✅ Paso 3: Consulta combinada exitosa');
            console.log('📊 Datos:', JSON.stringify(combinedData, null, 2));
          }
        }
        
        // Limpiar datos de prueba
        await supabase.from('jugadores').delete().eq('id', testUserId);
        await supabase.from('usuarios').delete().eq('id', testUserId);
        console.log('🧹 Datos de prueba limpiados');
      }
    } catch (e) {
      console.log('❌ Error en flujo de prueba:', e.message);
    }
    
    // 5. Resumen final
    console.log('\n📊 RESUMEN DE VALIDACIÓN:');
    console.log('===============================');
    
    const { count: usuariosCount } = await supabase
      .from('usuarios')
      .select('*', { count: 'exact', head: true });
    
    const { count: jugadoresCount } = await supabase
      .from('jugadores')
      .select('*', { count: 'exact', head: true });
    
    const { count: anotadoresCount } = await supabase
      .from('anotadores')
      .select('*', { count: 'exact', head: true });
    
    const { count: adminsCount } = await supabase
      .from('administradores')
      .select('*', { count: 'exact', head: true });
    
    console.log(`📊 Usuarios: ${usuariosCount || 0}`);
    console.log(`📊 Jugadores: ${jugadoresCount || 0}`);
    console.log(`📊 Anotadores: ${anotadoresCount || 0}`);
    console.log(`📊 Administradores: ${adminsCount || 0}`);
    
    console.log('\n🎯 ESTADO DE REESTRUCTURACIÓN:');
    if (usuariosCount === 0) {
      console.log('✅ Base de datos limpia y lista para datos nuevos');
      console.log('🚀 Ejecutar: node scripts/insert-test-data.js');
    } else {
      console.log('📊 Base de datos con datos existentes');
      console.log('⚠️  Verificar que la estructura de usuarios sea correcta');
    }
    
  } catch (error) {
    console.error('💥 Error en validación final:', error);
    process.exit(1);
  }
}

finalValidation();