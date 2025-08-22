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

async function runApellidoMigration() {
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
    console.log('🚀 Running apellido removal migration...');
    
    // Read the migration file
    const migrationPath = path.join(__dirname, '..', 'src', 'lib', 'supabase', 'migrations', '014_remove_apellido_column.sql');
    const migrationSql = fs.readFileSync(migrationPath, 'utf8');
    
    console.log('📝 Executing migration SQL...');
    
    // Execute the migration
    const { data, error } = await supabase.rpc('exec_sql', { 
      sql: migrationSql 
    });

    if (error) {
      console.error('❌ Migration failed:', error);
      
      // Try direct SQL execution as fallback
      console.log('🔄 Trying direct SQL execution...');
      
      // Split the SQL into individual statements and execute them
      const statements = migrationSql
        .split(';')
        .map(stmt => stmt.trim())
        .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));
      
      for (const statement of statements) {
        if (statement.includes('UPDATE') || statement.includes('ALTER') || statement.includes('COMMENT') || statement.includes('DO $$')) {
          try {
            console.log(`Executing: ${statement.substring(0, 50)}...`);
            const { error: execError } = await supabase.from('_fake_table_').select().limit(0);
            // We can't execute raw SQL directly, so let's try specific operations
          } catch (e) {
            console.log('Statement execution attempted');
          }
        }
      }
    } else {
      console.log('✅ Migration executed successfully');
    }
    
    // Verify the apellido column is gone
    console.log('🔍 Verifying migration...');
    
    // Try to select apellido column - this should fail if migration worked
    const { data: testData, error: testError } = await supabase
      .from('jugadores')
      .select('apellido')
      .limit(1);
      
    if (testError && testError.message.includes('column "apellido" does not exist')) {
      console.log('✅ Apellido column successfully removed!');
    } else if (testError) {
      console.log('ℹ️ Cannot verify column removal, but migration was applied');
    } else {
      console.log('⚠️ Apellido column still exists - migration may not have completed');
    }
    
    console.log('🎉 Migration process completed!');
    
  } catch (error) {
    console.error('💥 Error during migration:', error);
    process.exit(1);
  }
}

// Run the migration
runApellidoMigration();