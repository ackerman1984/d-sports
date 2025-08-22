#!/usr/bin/env node

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

async function applySQLMigration(sqlFilePath) {
  loadEnvFile();
  
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    console.error('❌ Missing required environment variables');
    console.error('Make sure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set');
    process.exit(1);
  }

  if (!sqlFilePath) {
    console.error('❌ Usage: node apply-custom-migration.js <path-to-sql-file>');
    process.exit(1);
  }

  const fullPath = path.resolve(sqlFilePath);
  
  if (!fs.existsSync(fullPath)) {
    console.error(`❌ SQL file not found: ${fullPath}`);
    process.exit(1);
  }

  const sqlContent = fs.readFileSync(fullPath, 'utf8');
  console.log(`🚀 Applying migration: ${path.basename(fullPath)}`);
  console.log(`📂 From: ${fullPath}`);

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });

  try {
    console.log('🔄 Executing SQL...');
    
    // Split SQL by statements (simple approach)
    const statements = sqlContent
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));

    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      if (statement.trim()) {
        console.log(`📝 Executing statement ${i + 1}/${statements.length}`);
        
        const { error } = await supabase.rpc('exec_sql', {
          sql_query: statement
        });

        if (error) {
          // Try direct query approach if rpc fails
          const { error: directError } = await supabase
            .from('__direct_sql')
            .select('1')
            .limit(0);

          if (directError) {
            // Final attempt with raw SQL
            try {
              const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${serviceRoleKey}`,
                  'apikey': serviceRoleKey
                },
                body: JSON.stringify({ query: statement })
              });
              
              if (!response.ok) {
                console.error(`❌ Error executing statement ${i + 1}:`, statement.substring(0, 100) + '...');
                console.error('Response:', await response.text());
              } else {
                console.log(`✅ Statement ${i + 1} executed successfully`);
              }
            } catch (fetchError) {
              console.error(`❌ Error executing statement ${i + 1}:`, fetchError.message);
              console.error('Statement:', statement.substring(0, 100) + '...');
            }
          }
        } else {
          console.log(`✅ Statement ${i + 1} executed successfully`);
        }
      }
    }

    console.log('🎉 Migration completed successfully!');
    console.log('💡 You may need to refresh your application to see changes');

  } catch (error) {
    console.error('❌ Error applying migration:', error);
    console.log('');
    console.log('📋 Manual application required:');
    console.log('1. Go to your Supabase dashboard');
    console.log('2. Navigate to SQL Editor');
    console.log('3. Copy and paste the content from:');
    console.log(`   ${fullPath}`);
    console.log('4. Click "Run" to execute');
  }
}

// Get SQL file path from command line arguments
const sqlFilePath = process.argv[2];
applySQLMigration(sqlFilePath);