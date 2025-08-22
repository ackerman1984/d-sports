const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Faltan variables de entorno de Supabase');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function debugAnotadorLogin() {
  console.log('🔍 Debugging login de anotadores...\n');

  try {
    // 1. Verificar todos los anotadores
    console.log('1️⃣ Verificando anotadores en la base de datos:');
    const { data: anotadores, error: errorAnotadores } = await supabase
      .from('anotadores')
      .select(`
        id,
        nombre,
        email,
        telefono,
        codigo_acceso,
        activo,
        liga_id,
        ligas:liga_id (
          id,
          nombre,
          codigo
        )
      `)
      .order('created_at', { ascending: false });

    if (errorAnotadores) {
      console.error('❌ Error obteniendo anotadores:', errorAnotadores);
      return;
    }

    console.log(`📋 Total de anotadores: ${anotadores?.length || 0}\n`);

    if (!anotadores || anotadores.length === 0) {
      console.log('⚠️ No hay anotadores registrados.');
      return;
    }

    // Mostrar cada anotador
    anotadores.forEach((anotador, index) => {
      console.log(`👤 Anotador ${index + 1}:`);
      console.log(`   - ID: ${anotador.id}`);
      console.log(`   - Nombre: ${anotador.nombre}`);
      console.log(`   - Email: ${anotador.email}`);
      console.log(`   - Teléfono: ${anotador.telefono}`);
      console.log(`   - Código: ${anotador.codigo_acceso}`);
      console.log(`   - Activo: ${anotador.activo ? '✅' : '❌'}`);
      console.log(`   - Liga: ${anotador.ligas?.nombre} (${anotador.ligas?.codigo})`);
      console.log('');
    });

    // 2. Probar login con el primer anotador activo
    const anotadorActivo = anotadores.find(a => a.activo);
    
    if (!anotadorActivo) {
      console.log('⚠️ No hay anotadores activos para probar.');
      return;
    }

    console.log('2️⃣ Probando login con el primer anotador activo:');
    console.log(`   - Usando email: ${anotadorActivo.email}`);
    console.log(`   - Usando código: ${anotadorActivo.codigo_acceso}`);

    await testLogin(anotadorActivo.email, anotadorActivo.codigo_acceso);
    
    console.log('\n3️⃣ Probando login con el nombre:');
    console.log(`   - Usando nombre: ${anotadorActivo.nombre}`);
    console.log(`   - Usando código: ${anotadorActivo.codigo_acceso}`);
    
    await testLogin(anotadorActivo.nombre, anotadorActivo.codigo_acceso);

    console.log('\n4️⃣ Probando login con el teléfono:');
    console.log(`   - Usando teléfono: ${anotadorActivo.telefono}`);
    console.log(`   - Usando código: ${anotadorActivo.codigo_acceso}`);
    
    await testLogin(anotadorActivo.telefono, anotadorActivo.codigo_acceso);

  } catch (error) {
    console.error('❌ Error general:', error);
  }
}

async function testLogin(identificador, codigo) {
  try {
    // Simular la lógica del API
    console.log(`   🔍 Buscando anotadores con código: ${codigo.toUpperCase()}`);
    
    const { data: anotadores, error: searchError } = await supabase
      .from('anotadores')
      .select(`
        id,
        nombre,
        email,
        telefono,
        codigo_acceso,
        activo,
        liga_id,
        ligas:liga_id (
          id,
          nombre,
          codigo
        )
      `)
      .eq('codigo_acceso', codigo.toUpperCase())
      .eq('activo', true);

    if (searchError) {
      console.log(`   ❌ Error en búsqueda: ${searchError.message}`);
      return;
    }

    console.log(`   📋 Anotadores encontrados con el código: ${anotadores?.length || 0}`);
    
    if (anotadores && anotadores.length > 0) {
      anotadores.forEach((a, i) => {
        console.log(`      ${i + 1}. ${a.nombre} (${a.email})`);
      });
    }

    // Filtrar por identificador
    const anotador = anotadores?.find(a => 
      a.email === identificador || 
      a.telefono === identificador || 
      a.nombre.toLowerCase().includes(identificador.toLowerCase())
    );

    if (anotador) {
      console.log(`   ✅ LOGIN EXITOSO: ${anotador.nombre}`);
      console.log(`      - Liga: ${anotador.ligas?.nombre}`);
    } else {
      console.log(`   ❌ LOGIN FALLIDO: No se encontró coincidencia para "${identificador}"`);
      
      // Mostrar comparaciones detalladas
      if (anotadores && anotadores.length > 0) {
        console.log('   🔍 Comparaciones detalladas:');
        anotadores.forEach(a => {
          console.log(`      - Email "${a.email}" === "${identificador}": ${a.email === identificador}`);
          console.log(`      - Teléfono "${a.telefono}" === "${identificador}": ${a.telefono === identificador}`);
          console.log(`      - Nombre "${a.nombre.toLowerCase()}" incluye "${identificador.toLowerCase()}": ${a.nombre.toLowerCase().includes(identificador.toLowerCase())}`);
        });
      }
    }
    
  } catch (error) {
    console.log(`   ❌ Error en test: ${error.message}`);
  }
}

// Ejecutar
debugAnotadorLogin().then(() => {
  console.log('\n✅ Debug completado.');
  process.exit(0);
}).catch(error => {
  console.error('❌ Error fatal:', error);
  process.exit(1);
});