import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin-client';

export async function GET(_request: NextRequest) {
  try {
    const supabase = createAdminClient();
    
    // Test 1: Check if we can connect to database
    console.log('Testing database connection...');
    
    // Test 2: Check usuarios table structure
    const { data: usuarios, error: usuariosError } = await supabase
      .from('usuarios')
      .select('*')
      .limit(1);
    
    if (usuariosError) {
      return NextResponse.json({ 
        error: `usuarios table error: ${usuariosError.message}`,
        code: usuariosError.code 
      }, { status: 500 });
    }
    
    // Test 3: Check ligas table structure
    const { data: ligas, error: ligasError } = await supabase
      .from('ligas')
      .select('*')
      .limit(1);
    
    if (ligasError) {
      return NextResponse.json({ 
        error: `ligas table error: ${ligasError.message}`,
        code: ligasError.code 
      }, { status: 500 });
    }
    
    // Test 4: Check super_admins table
    const { data: superAdmins, error: superAdminsError } = await supabase
      .from('super_admins')
      .select('*')
      .limit(1);
    
    if (superAdminsError) {
      return NextResponse.json({ 
        error: `super_admins table error: ${superAdminsError.message}`,
        code: superAdminsError.code 
      }, { status: 500 });
    }
    
    // Test 5: Try creating a test user in auth
    console.log('Testing auth user creation...');
    const testEmail = `test-${Date.now()}@example.com`;
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: testEmail,
      password: 'testpassword123',
      email_confirm: true,
    });
    
    if (authError) {
      return NextResponse.json({ 
        error: `Auth user creation error: ${authError.message}`,
        details: authError 
      }, { status: 500 });
    }
    
    // Clean up test user
    if (authData.user) {
      await supabase.auth.admin.deleteUser(authData.user.id);
    }
    
    return NextResponse.json({ 
      success: true,
      message: 'Database connection and all tests passed!',
      tests: {
        usuarios: usuarios ? 'OK' : 'Empty table',
        ligas: ligas ? 'OK' : 'Empty table', 
        super_admins: superAdmins ? 'OK' : 'Empty table',
        auth_creation: 'OK'
      }
    });
    
  } catch (error) {
    console.error('Database test error:', error);
    return NextResponse.json({ 
      error: 'Database connection failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}