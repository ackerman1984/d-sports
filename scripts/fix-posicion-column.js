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

async function fixPosicionColumn() {
  loadEnvFile();
  
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    console.error('Missing required environment variables');
    console.error('Make sure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set');
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });

  try {
    console.log('🔍 Checking usuarios table schema...');
    
    // Check if posicion column exists
    const { data, error } = await supabase
      .from('usuarios')
      .select('posicion')
      .limit(1);

    if (!error) {
      console.log('✅ posicion column already exists in usuarios table');
      
      // Test updating a user with posicion
      console.log('🧪 Testing posicion column functionality...');
      const { data: users, error: usersError } = await supabase
        .from('usuarios')
        .select('id, nombre, posicion')
        .limit(1);

      if (!usersError && users && users.length > 0) {
        const testUser = users[0];
        console.log('📝 Found test user:', testUser.nombre);
        
        // Try to update the user's posicion
        const { data: updateResult, error: updateError } = await supabase
          .from('usuarios')
          .update({ posicion: 'Pitcher (P)' })
          .eq('id', testUser.id)
          .select()
          .single();

        if (updateError) {
          console.error('❌ Error updating posicion:', updateError.message);
          console.log('🔧 Attempting to add posicion column...');
          
          // Try to add the column if it doesn't work
          const { error: alterError } = await supabase.rpc('exec_sql', {
            sql: 'ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS posicion VARCHAR(50);'
          });

          if (alterError) {
            console.error('❌ Could not add posicion column via RPC:', alterError.message);
            console.log('📋 Manual fix needed:');
            console.log('1. Go to your Supabase SQL Editor');
            console.log('2. Run: ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS posicion VARCHAR(50);');
          } else {
            console.log('✅ posicion column added successfully via RPC');
          }
        } else {
          console.log('✅ posicion column is working correctly!');
          console.log('✅ Updated user:', updateResult.nombre, 'posicion:', updateResult.posicion);
        }
      }
    } else {
      console.log('❌ posicion column does not exist. Error:', error.message);
      console.log('🔧 Attempting to add posicion column...');
      
      // Try to add the column using raw SQL
      const alterSql = `
        ALTER TABLE usuarios 
        ADD COLUMN IF NOT EXISTS posicion VARCHAR(50);
      `;

      try {
        // Use the RPC method if available
        const { error: rpcError } = await supabase.rpc('exec_sql', { sql: alterSql });
        
        if (rpcError) {
          console.error('❌ RPC method failed:', rpcError.message);
          console.log('📋 Manual migration required:');
          console.log('1. Open Supabase SQL Editor');
          console.log('2. Execute:');
          console.log(alterSql);
        } else {
          console.log('✅ Column added successfully via RPC');
        }
      } catch (rpcError) {
        console.log('📋 Manual migration required:');
        console.log('1. Go to your Supabase dashboard');
        console.log('2. Open SQL Editor'); 
        console.log('3. Run the following SQL:');
        console.log('');
        console.log('ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS posicion VARCHAR(50);');
        console.log('');
        console.log('4. Then restart your development server: npm run dev');
      }
    }
    
  } catch (error) {
    console.error('❌ Error checking schema:', error.message);
    
    console.log('📋 Manual solution:');
    console.log('1. Go to Supabase Dashboard > SQL Editor');
    console.log('2. Run this SQL:');
    console.log('');
    console.log('ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS posicion VARCHAR(50);');
    console.log('');
    console.log('3. Restart your development server');
  }
}

fixPosicionColumn();