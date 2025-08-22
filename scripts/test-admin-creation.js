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

async function testAdminCreation() {
  loadEnvFile();
  
  console.log('🧪 Probando creación de liga y administrador...\n');
  
  // Simular datos como los enviaría el frontend
  const testData = {
    admin: {
      email: 'test-admin@example.com',
      password: 'testpassword123',
      nombre: 'Admin de Prueba',
      telefono: '555-0123'
    },
    liga: {
      nombre: 'Liga de Prueba API',
      equipos: ['Equipo A', 'Equipo B', 'Equipo C'],
      temporadaNombre: 'Temporada 2024',
      fechaInicio: '2024-03-01',
      fechaFin: '2024-11-30'
    }
  };

  try {
    // Hacer petición al API como lo haría el frontend
    const response = await fetch('http://localhost:3000/api/auth/register-admin', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testData),
    });

    console.log('📨 Status de respuesta:', response.status);
    
    const result = await response.json();
    
    if (response.ok) {
      console.log('✅ ÉXITO: Liga y administrador creados correctamente');
      console.log('📊 Datos de respuesta:');
      console.log('   Liga:', result.liga?.nombre, `(${result.liga?.codigo})`);
      console.log('   Admin:', result.admin?.nombre, `(${result.admin?.email})`);
      console.log('   Subdominio:', result.liga?.subdominio);
      
      // Verificar en base de datos
      console.log('\n🔍 Verificando en base de datos...');
      
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
      
      if (supabaseUrl && serviceRoleKey) {
        const supabase = createClient(supabaseUrl, serviceRoleKey, {
          auth: { autoRefreshToken: false, persistSession: false }
        });
        
        // Verificar usuario en tabla usuarios
        const { data: usuario } = await supabase
          .from('usuarios')
          .select('*')
          .eq('email', testData.admin.email)
          .single();
        
        if (usuario) {
          console.log('✅ Usuario encontrado en tabla usuarios:');
          console.log('   Campos:', Object.keys(usuario).join(', '));
          console.log('   Contiene telefono:', 'telefono' in usuario ? 'SÍ (ERROR)' : 'NO (CORRECTO)');
        }
        
        // Verificar administrador en tabla administradores
        const { data: admin } = await supabase
          .from('administradores')
          .select('*')
          .eq('email', testData.admin.email)
          .single();
        
        if (admin) {
          console.log('✅ Administrador encontrado en tabla administradores');
          console.log('   ID coincide:', admin.id === usuario?.id ? 'SÍ' : 'NO');
        } else {
          console.log('❌ Administrador NO encontrado en tabla administradores');
        }
        
        // Verificar liga
        const { data: liga } = await supabase
          .from('ligas')
          .select('*')
          .eq('id', result.liga?.id)
          .single();
        
        if (liga) {
          console.log('✅ Liga encontrada en base de datos');
          console.log('   Nombre:', liga.nombre);
          console.log('   Código:', liga.codigo);
        }
        
        // Limpiar datos de prueba
        console.log('\n🧹 Limpiando datos de prueba...');
        if (usuario) {
          await supabase.auth.admin.deleteUser(usuario.id);
          await supabase.from('usuarios').delete().eq('id', usuario.id);
          await supabase.from('administradores').delete().eq('id', usuario.id);
        }
        if (liga) {
          await supabase.from('equipos').delete().eq('liga_id', liga.id);
          await supabase.from('configuracion_temporada').delete().eq('liga_id', liga.id);
          await supabase.from('ligas').delete().eq('id', liga.id);
        }
        console.log('✅ Datos de prueba eliminados');
      }
      
    } else {
      console.log('❌ ERROR en creación:');
      console.log('   Mensaje:', result.error);
      console.log('   Detalles completos:', result);
    }
    
  } catch (error) {
    console.log('💥 Error en prueba:', error.message);
    
    if (error.code === 'ECONNREFUSED') {
      console.log('📝 NOTA: Asegúrate de que el servidor esté corriendo:');
      console.log('   npm run dev');
    }
  }
}

testAdminCreation();