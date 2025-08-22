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

async function applyMigration() {
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
    console.log('Checking if super admin tables exist...');
    
    // Try to query super_admins table directly
    const { data: superAdmins, error: queryError } = await supabase
      .from('super_admins')
      .select('email')
      .limit(1);

    if (!queryError) {
      console.log('Super admin tables already exist. Migration not needed.');
      
      // Check if default super admin exists
      const { data: defaultAdmin } = await supabase
        .from('super_admins')
        .select('email')
        .eq('email', 'creator@baseball-saas.com')
        .single();

      if (!defaultAdmin) {
        console.log('Creating default super admin...');
        const { error: insertError } = await supabase
          .from('super_admins')
          .insert({
            email: 'creator@baseball-saas.com',
            name: 'Creator',
            master_code: 'MASTER-2024-BASEBALL',
            active: true
          });

        if (insertError) {
          console.error('Error creating default super admin:', insertError);
        } else {
          console.log('Default super admin created successfully!');
        }
      } else {
        console.log('Default super admin already exists.');
      }
      
      console.log('System ready! Access: http://localhost:3000/super-admin');
      console.log('Email: creator@baseball-saas.com');
      console.log('Code: MASTER-2024-BASEBALL');
      return;
    }

    // If table doesn't exist, show manual migration instructions
    if (queryError.code === '42P01') {
      console.log('❌ Super admin tables do not exist.');
      console.log('');
      console.log('📋 Please apply the migration manually:');
      console.log('1. Go to your Supabase dashboard: https://supabase.com/dashboard');
      console.log('2. Select your project');
      console.log('3. Navigate to SQL Editor');
      console.log('4. Copy and paste the entire content from:');
      console.log('   src/lib/supabase/migrations/004_super_admin_control.sql');
      console.log('5. Click "Run" to execute the migration');
      console.log('6. Come back and run: npm run db:migrate');
      console.log('');
      console.log('❓ Need help? Check SUPER_ADMIN_SETUP.md for detailed instructions');
    } else {
      console.error('Unexpected error:', queryError);
    }
    
  } catch (error) {
    console.error('Error applying migration:', error);
    process.exit(1);
  }
}

applyMigration();