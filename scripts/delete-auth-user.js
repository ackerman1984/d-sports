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

async function deleteAuthUser(email) {
  try {
    console.log(`🔍 Buscando usuario en Supabase Auth con email: ${email}`);
    
    // Listar todos los usuarios de auth
    const { data: authUsers, error: authListError } = await supabase.auth.admin.listUsers();
    
    if (authListError) {
      console.error('❌ Error listando usuarios de auth:', authListError);
      return;
    }

    const foundUser = authUsers.users.find(user => user.email === email);
    
    if (!foundUser) {
      console.log('✅ Usuario no encontrado en Supabase Auth');
      return;
    }

    console.log('👤 Usuario encontrado:');
    console.log(`  - ID: ${foundUser.id}`);
    console.log(`  - Email: ${foundUser.email}`);
    console.log(`  - Creado: ${foundUser.created_at}`);
    console.log(`  - Último login: ${foundUser.last_sign_in_at || 'Nunca'}`);

    console.log('\n🗑️ Eliminando usuario de Supabase Auth...');
    
    const { error: deleteError } = await supabase.auth.admin.deleteUser(foundUser.id);
    
    if (deleteError) {
      console.error('❌ Error eliminando usuario:', deleteError);
      return;
    }

    console.log('✅ Usuario eliminado exitosamente de Supabase Auth');

    // Verificar que se eliminó
    console.log('\n🔍 Verificando eliminación...');
    const { data: verifyUsers, error: verifyError } = await supabase.auth.admin.listUsers();
    
    if (verifyError) {
      console.error('❌ Error verificando:', verifyError);
      return;
    }

    const stillExists = verifyUsers.users.find(user => user.email === email);
    
    if (stillExists) {
      console.log('⚠️ El usuario aún existe en Supabase Auth');
    } else {
      console.log('✅ Confirmado: Usuario eliminado completamente');
      console.log(`🎉 El email ${email} está ahora disponible para registro!`);
    }

  } catch (error) {
    console.error('💥 Error durante el proceso:', error);
  }
}

// Ejecutar si es llamado directamente
if (require.main === module) {
  const email = process.argv[2] || 'jugador1@gmail.com';
  deleteAuthUser(email);
}

module.exports = { deleteAuthUser };