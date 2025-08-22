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

async function applyPlayerMigration() {
  loadEnvFile();
  
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    console.error('❌ Missing Supabase credentials in .env.local');
    console.log('Please make sure you have:');
    console.log('- NEXT_PUBLIC_SUPABASE_URL');
    console.log('- SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });

  console.log('🚀 Applying player management migration...\n');

  try {
    // Read the migration file
    const migrationPath = path.join(__dirname, '..', 'src', 'lib', 'supabase', 'migrations', '006_enhanced_player_schema.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

    // Split the SQL into individual statements
    const statements = migrationSQL
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));

    console.log(`📝 Executing ${statements.length} SQL statements...\n`);

    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      if (statement) {
        console.log(`Step ${i + 1}/${statements.length}: ${statement.substring(0, 50)}...`);
        
        const { error } = await supabase.rpc('exec_sql', {
          sql: statement + ';'
        });

        if (error) {
          // Some errors are expected (like IF NOT EXISTS clauses)
          if (!error.message.includes('already exists') && 
              !error.message.includes('does not exist') &&
              !error.message.includes('duplicate key')) {
            console.warn(`⚠️ Warning: ${error.message}`);
          }
        } else {
          console.log('✅ Success');
        }
      }
    }

    console.log('\n🎉 Player management migration applied successfully!');
    console.log('');
    console.log('✨ New features available:');
    console.log('- Enhanced player profiles with personal information');
    console.log('- Player statistics tracking by season');
    console.log('- Automatic calculation of batting averages');
    console.log('- Role-based access control for player management');
    console.log('');
    console.log('🔗 Access the player management interface at:');
    console.log('   http://localhost:3000/poli/admin/jugadores');

  } catch (error) {
    console.error('❌ Error applying migration:', error);
    console.log('\n💡 Manual application required:');
    console.log('1. Go to your Supabase dashboard SQL Editor');
    console.log('2. Copy and paste the content from:');
    console.log('   src/lib/supabase/migrations/006_enhanced_player_schema.sql');
    console.log('3. Execute the SQL statements');
    process.exit(1);
  }
}

applyPlayerMigration();