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

async function createAdministradoresTable() {
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
    console.log('🏗️ Creando tabla administradores...');
    
    // Try to create table by inserting a test record (this will create the table if it doesn't exist)
    const { data, error } = await supabase
      .from('administradores')
      .insert({
        id: '00000000-0000-0000-0000-000000000000', // Dummy UUID
        nombre: 'Test Admin',
        email: 'test@test.com',
        activo: true,
        liga_id: null
      })
      .select();

    if (error) {
      if (error.message && error.message.includes('relation "public.administradores" does not exist')) {
        console.log('🔧 Tabla no existe, necesita ser creada manualmente en Supabase');
        console.log('📋 SQL para crear la tabla:');
        console.log(`
CREATE TABLE administradores (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nombre TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  activo BOOLEAN DEFAULT true,
  liga_id UUID REFERENCES ligas(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX administradores_liga_id_idx ON administradores(liga_id);
CREATE INDEX administradores_email_idx ON administradores(email);
CREATE INDEX administradores_activo_idx ON administradores(activo);

ALTER TABLE administradores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read their own admin profile" ON administradores
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update their own admin profile" ON administradores
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Service role has full access to administradores" ON administradores
  FOR ALL USING (current_setting('role') = 'service_role');
        `);
        process.exit(1);
      } else {
        console.error('❌ Error:', error);
        process.exit(1);
      }
    }

    // If successful, remove the test record
    if (data && data.length > 0) {
      await supabase
        .from('administradores')
        .delete()
        .eq('id', '00000000-0000-0000-0000-000000000000');
    }

    console.log('✅ Tabla administradores ya existe');
    
    // Verify table creation
    const { data: testData, error: testError } = await supabase
      .from('administradores')
      .select('*')
      .limit(1);

    if (testError && testError.code !== 'PGRST116') {
      console.error('❌ Error verificando tabla:', testError);
    } else {
      console.log('✅ Tabla administradores verificada');
    }

    console.log('🎉 Proceso completado exitosamente!');
    
  } catch (error) {
    console.error('💥 Error:', error);
    process.exit(1);
  }
}

createAdministradoresTable();