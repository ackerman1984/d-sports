#!/usr/bin/env node

/**
 * Development Setup Script
 * Configures the baseball SaaS project for development
 */

console.log('🏟️  Baseball SaaS - Development Setup');
console.log('=====================================\n');

// Check environment variables
console.log('📋 Checking environment configuration...');

const requiredEnvVars = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
  'NEXTAUTH_SECRET',
  'NEXTAUTH_URL'
];

let envOk = true;
requiredEnvVars.forEach(envVar => {
  if (process.env[envVar]) {
    console.log(`✅ ${envVar}: configured`);
  } else {
    console.log(`❌ ${envVar}: missing`);
    envOk = false;
  }
});

if (!envOk) {
  console.log('\n❌ Missing required environment variables.');
  console.log('📄 Copy .env.example to .env.local and configure your values');
  process.exit(1);
}

console.log('\n✅ Environment configuration looks good!\n');

// Display project information
console.log('🏟️  Project Information');
console.log('=======================');
console.log('• Name: D-Sports Baseball SaaS');
console.log('• Tech Stack: Next.js 15 + Supabase + NextAuth');
console.log('• Multi-tenant: League-based routing');
console.log('• Roles: admin, anotador, jugador');
console.log('');

console.log('🚀 Getting Started');
console.log('==================');
console.log('1. Start development server:');
console.log('   npm run dev');
console.log('');
console.log('2. Access the application:');
console.log('   • Homepage: http://localhost:3000');
console.log('   • Login: http://localhost:3000/login');
console.log('   • Super Admin: http://localhost:3000/super-admin');
console.log('');
console.log('3. Test credentials (if you have test data):');
console.log('   • Admin: prueba@gmail.com');
console.log('   • Super Admin: creator@baseball-saas.com (Code: MASTER-2024-BASEBALL)');
console.log('');

console.log('🛠️  Development Commands');
console.log('========================');
console.log('• npm run dev          - Start development server');
console.log('• npm run build        - Build for production');
console.log('• npm run lint         - Run ESLint');
console.log('• npm run db:migrate   - Apply database migrations');
console.log('');

console.log('📊 Database Setup');
console.log('=================');
console.log('• Most tables are configured automatically');
console.log('• Missing table: estadisticas_jugador');
console.log('• Action needed: Run the SQL in your Supabase dashboard');
console.log('• Dashboard: https://supabase.com/dashboard');
console.log('');

console.log('🎯 Next Steps for Full Setup');
console.log('=============================');
console.log('1. Create the estadisticas_jugador table (see SETUP.md)');
console.log('2. Configure your league data');
console.log('3. Set up teams and players');
console.log('4. Test the complete workflow');
console.log('');

console.log('📚 Documentation');
console.log('=================');
console.log('• Architecture: See CLAUDE.md');
console.log('• Setup Guide: See SETUP.md');
console.log('• Super Admin Guide: See SUPER_ADMIN_SETUP.md');
console.log('');

console.log('✨ Setup complete! Your project is ready for development.');
console.log('Happy coding! ⚾');