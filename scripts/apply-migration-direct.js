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

async function executeSQLCommands() {
  loadEnvFile();
  
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    console.error('Missing Supabase credentials in .env.local');
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });

  console.log('🚀 Aplicando migración del sistema Super Admin...\n');

  try {
    // Step 1: Add columns to ligas table
    console.log('📝 Paso 1: Agregando columnas de control a tabla ligas...');
    await supabase.rpc('exec_sql', {
      sql: `
        ALTER TABLE ligas ADD COLUMN IF NOT EXISTS authorized BOOLEAN DEFAULT false;
        ALTER TABLE ligas ADD COLUMN IF NOT EXISTS authorization_code VARCHAR(50);
        ALTER TABLE ligas ADD COLUMN IF NOT EXISTS authorized_at TIMESTAMP WITH TIME ZONE;
        ALTER TABLE ligas ADD COLUMN IF NOT EXISTS authorized_by VARCHAR(255);
        ALTER TABLE ligas ADD COLUMN IF NOT EXISTS suspended_at TIMESTAMP WITH TIME ZONE;
        ALTER TABLE ligas ADD COLUMN IF NOT EXISTS suspension_reason TEXT;
      `
    });
    console.log('✅ Columnas agregadas exitosamente\n');

    // Step 2: Create super_admins table
    console.log('📝 Paso 2: Creando tabla super_admins...');
    await supabase.rpc('exec_sql', {
      sql: `
        CREATE TABLE IF NOT EXISTS super_admins (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          email VARCHAR(255) UNIQUE NOT NULL,
          name VARCHAR(255) NOT NULL,
          master_code VARCHAR(100) NOT NULL,
          active BOOLEAN DEFAULT true,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );
      `
    });
    console.log('✅ Tabla super_admins creada\n');

    // Step 3: Create access_logs table
    console.log('📝 Paso 3: Creando tabla access_logs...');
    await supabase.rpc('exec_sql', {
      sql: `
        CREATE TABLE IF NOT EXISTS access_logs (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          liga_id UUID REFERENCES ligas(id) ON DELETE CASCADE,
          admin_email VARCHAR(255) NOT NULL,
          action VARCHAR(50) NOT NULL,
          performed_by VARCHAR(255) NOT NULL,
          reason TEXT,
          ip_address INET,
          user_agent TEXT,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );
      `
    });
    console.log('✅ Tabla access_logs creada\n');

    // Step 4: Insert default super admin
    console.log('📝 Paso 4: Creando super admin por defecto...');
    const { error: insertError } = await supabase
      .from('super_admins')
      .insert({
        email: 'creator@baseball-saas.com',
        name: 'Creator',
        master_code: 'MASTER-2024-BASEBALL',
        active: true
      });

    if (insertError && insertError.code !== '23505') { // Ignore duplicate key error
      throw insertError;
    }
    console.log('✅ Super admin creado exitosamente\n');

    // Step 5: Enable RLS
    console.log('📝 Paso 5: Configurando seguridad (RLS)...');
    await supabase.rpc('exec_sql', {
      sql: `
        ALTER TABLE super_admins ENABLE ROW LEVEL SECURITY;
        ALTER TABLE access_logs ENABLE ROW LEVEL SECURITY;
      `
    });
    console.log('✅ Seguridad configurada\n');

    console.log('🎉 ¡Migración aplicada exitosamente!');
    console.log('');
    console.log('🔐 Credenciales de acceso:');
    console.log('   URL: http://localhost:3000/super-admin');
    console.log('   Email: creator@baseball-saas.com');
    console.log('   Código: MASTER-2024-BASEBALL');
    console.log('');
    console.log('✨ El sistema de control Super Admin está ahora activo!');

  } catch (error) {
    console.error('❌ Error aplicando migración:', error);
    console.log('\n💡 Si el error es sobre exec_sql, necesitas aplicar la migración manualmente en Supabase SQL Editor');
    process.exit(1);
  }
}

executeSQLCommands();