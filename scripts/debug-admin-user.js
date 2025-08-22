const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function debugAdminUser() {
  console.log('🔍 Verificando usuarios administradores...\n');

  try {
    // 1. Verificar usuarios en la tabla usuarios
    console.log('1️⃣ Usuarios en tabla usuarios:');
    const { data: usuarios, error: usuariosError } = await supabase
      .from('usuarios')
      .select(`
        id,
        email,
        nombre,
        liga_id,
        role,
        ligas:liga_id (nombre, codigo)
      `)
      .order('created_at', { ascending: false });

    if (usuariosError) {
      console.log('❌ Error consultando usuarios:', usuariosError.message);
    } else if (!usuarios || usuarios.length === 0) {
      console.log('❌ No hay usuarios en la tabla usuarios');
    } else {
      console.log(`📋 Total usuarios: ${usuarios.length}`);
      usuarios.forEach(user => {
        const liga = Array.isArray(user.ligas) ? user.ligas[0] : user.ligas;
        console.log(`   - ${user.email} | ${user.nombre} | Role: ${user.role} | Liga: ${liga?.nombre || 'Sin liga'}`);
      });
    }

    // 2. Verificar usuarios con role admin
    console.log('\n2️⃣ Usuarios administradores:');
    const adminUsers = usuarios?.filter(u => u.role === 'admin') || [];
    
    if (adminUsers.length === 0) {
      console.log('❌ No hay usuarios con role admin');
      console.log('🔧 Necesitas crear un usuario admin o asignar el role admin a un usuario existente');
    } else {
      console.log(`✅ Encontrados ${adminUsers.length} administradores:`);
      adminUsers.forEach(admin => {
        const liga = Array.isArray(admin.ligas) ? admin.ligas[0] : admin.ligas;
        console.log(`   - ${admin.email} | Liga asignada: ${liga?.nombre || 'SIN LIGA'} (${liga?.codigo || 'N/A'})`);
        
        if (!admin.liga_id) {
          console.log(`     ⚠️  PROBLEMA: Este admin NO tiene liga asignada`);
        }
      });
    }

    // 3. Verificar la liga politecnica específicamente
    console.log('\n3️⃣ Verificando liga politecnica:');
    const { data: ligaPoli } = await supabase
      .from('ligas')
      .select('id, nombre, codigo')
      .ilike('codigo', '%LIGAPOLITE%')
      .single();

    if (ligaPoli) {
      console.log(`✅ Liga encontrada: ${ligaPoli.nombre} (${ligaPoli.codigo})`);
      
      // Ver qué usuarios están asignados a esta liga
      const usuariosLiga = usuarios?.filter(u => u.liga_id === ligaPoli.id) || [];
      console.log(`📋 Usuarios asignados a esta liga: ${usuariosLiga.length}`);
      
      usuariosLiga.forEach(user => {
        console.log(`   - ${user.email} (${user.role})`);
      });
      
      if (usuariosLiga.length === 0) {
        console.log('❌ PROBLEMA: Ningún usuario está asignado a la liga politecnica');
        console.log('🔧 Solución: Asigna tu usuario admin a esta liga');
      }
      
      const adminEnLiga = usuariosLiga.find(u => u.role === 'admin');
      if (!adminEnLiga) {
        console.log('❌ PROBLEMA: No hay un admin asignado a la liga politecnica');
        console.log('🔧 Solución: Asigna un usuario admin a esta liga o cambia el role de un usuario existente');
      }
    } else {
      console.log('❌ Liga politecnica no encontrada');
    }

    // 4. Sugerir solución
    console.log('\n4️⃣ Solución recomendada:');
    if (adminUsers.length > 0 && ligaPoli) {
      const adminSinLiga = adminUsers.find(a => !a.liga_id);
      if (adminSinLiga) {
        console.log(`🔧 Ejecuta este SQL para asignar la liga al admin:`);
        console.log(`UPDATE usuarios SET liga_id = '${ligaPoli.id}' WHERE email = '${adminSinLiga.email}';`);
      }
    } else if (usuarios && usuarios.length > 0 && ligaPoli) {
      const userSinRole = usuarios.find(u => !u.role || u.role !== 'admin');
      if (userSinRole) {
        console.log(`🔧 O ejecuta este SQL para hacer admin a un usuario existente:`);
        console.log(`UPDATE usuarios SET role = 'admin', liga_id = '${ligaPoli.id}' WHERE email = '${userSinRole.email}';`);
      }
    }

  } catch (error) {
    console.error('💥 Error:', error);
  }
}

debugAdminUser();