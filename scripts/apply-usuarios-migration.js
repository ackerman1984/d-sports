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

async function applyUsuariosMigration() {
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
    console.log('🔧 Aplicando migración para tabla usuarios...');
    
    // Leer el archivo de migración
    const migrationPath = path.join(__dirname, '..', 'src', 'lib', 'supabase', 'migrations', '002_add_missing_fields.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    console.log('📝 Ejecutando migración de campos faltantes...');
    
    // Ejecutar la migración
    const { error } = await supabase.rpc('execute_sql', { sql_query: migrationSQL });
    
    if (error) {
      console.error('❌ Error ejecutando migración:', error);
      
      // Intentar ejecutar comando por comando
      console.log('🔄 Intentando aplicar campos individualmente...');
      
      const commands = [
        'ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS foto_url TEXT;',
        'ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS numero_casaca INTEGER;',
        'ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS equipo_id UUID REFERENCES equipos(id) ON DELETE SET NULL;',
        'ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS posicion VARCHAR(50);',
        'ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS activo BOOLEAN DEFAULT true;',
        'ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS ultimo_login TIMESTAMP WITH TIME ZONE;',
        'ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;'
      ];
      
      for (const command of commands) {
        try {
          await supabase.rpc('execute_sql', { sql_query: command });
          console.log('✅ Ejecutado:', command);
        } catch (cmdError) {
          console.log('⚠️ Error o ya existe:', command, cmdError.message);
        }
      }
    } else {
      console.log('✅ Migración aplicada exitosamente!');
    }
    
    // Verificar que los campos existen
    console.log('🔍 Verificando estructura de tabla usuarios...');
    const { data, error: verifyError } = await supabase
      .from('usuarios')
      .select('*')
      .limit(1);
    
    if (verifyError) {
      console.error('❌ Error verificando tabla:', verifyError);
    } else {
      console.log('✅ Tabla usuarios verificada correctamente');
      if (data && data.length > 0) {
        console.log('📋 Campos disponibles:', Object.keys(data[0]));
      }
    }
    
  } catch (error) {
    console.error('💥 Error aplicando migración:', error);
    process.exit(1);
  }
}

applyUsuariosMigration();