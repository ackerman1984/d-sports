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

async function applyLineupMigration() {
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

  console.log('🚀 Aplicando migración del sistema Lineup Configuration...\n');

  try {
    // Create lineup_configuracion table
    console.log('📝 Paso 1: Creando tabla lineup_configuracion...');
    await supabase.rpc('exec_sql', {
      sql: `
        -- Crear tabla para configuración del lineup
        CREATE TABLE IF NOT EXISTS lineup_configuracion (
          id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
          juego_id UUID NOT NULL REFERENCES juego(id) ON DELETE CASCADE,
          equipo VARCHAR(20) NOT NULL CHECK (equipo IN ('local', 'visitante')),
          jugadores_seleccionados JSONB DEFAULT '{}'::jsonb,
          posiciones_asignadas JSONB DEFAULT '{}'::jsonb,
          fecha_creacion TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          fecha_actualizacion TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          
          -- Constraint única por juego y equipo
          UNIQUE(juego_id, equipo)
        );
      `
    });
    console.log('✅ Tabla lineup_configuracion creada exitosamente\n');

    // Create indexes
    console.log('📝 Paso 2: Creando índices...');
    await supabase.rpc('exec_sql', {
      sql: `
        CREATE INDEX IF NOT EXISTS idx_lineup_configuracion_juego_id ON lineup_configuracion(juego_id);
        CREATE INDEX IF NOT EXISTS idx_lineup_configuracion_equipo ON lineup_configuracion(equipo);
      `
    });
    console.log('✅ Índices creados exitosamente\n');

    // Enable RLS
    console.log('📝 Paso 3: Habilitando RLS...');
    await supabase.rpc('exec_sql', {
      sql: `
        ALTER TABLE lineup_configuracion ENABLE ROW LEVEL SECURITY;
      `
    });
    console.log('✅ RLS habilitado exitosamente\n');

    // Create policies
    console.log('📝 Paso 4: Creando políticas de seguridad...');
    await supabase.rpc('exec_sql', {
      sql: `
        -- Política para permitir que los anotadores puedan leer y escribir en los juegos asignados
        CREATE POLICY lineup_configuracion_anotador_policy 
        ON lineup_configuracion 
        FOR ALL 
        TO authenticated
        USING (
          EXISTS (
            SELECT 1 FROM anotador_juego 
            WHERE anotador_juego.juego_id = lineup_configuracion.juego_id 
            AND anotador_juego.anotador_id = auth.uid()
          )
        )
        WITH CHECK (
          EXISTS (
            SELECT 1 FROM anotador_juego 
            WHERE anotador_juego.juego_id = lineup_configuracion.juego_id 
            AND anotador_juego.anotador_id = auth.uid()
          )
        );

        -- Política para administradores (pueden acceder a todo)
        CREATE POLICY lineup_configuracion_admin_policy 
        ON lineup_configuracion 
        FOR ALL 
        TO authenticated
        USING (
          EXISTS (
            SELECT 1 FROM usuario u
            WHERE u.id = auth.uid() 
            AND u.rol = 'admin'
          )
        )
        WITH CHECK (
          EXISTS (
            SELECT 1 FROM usuario u
            WHERE u.id = auth.uid() 
            AND u.rol = 'admin'
          )
        );
      `
    });
    console.log('✅ Políticas de seguridad creadas exitosamente\n');

    console.log('🎉 ¡Migración del sistema Lineup aplicada exitosamente!');
    console.log('');
    console.log('✨ Funcionalidades agregadas:');
    console.log('   • Configuración persistente del lineup por equipo');
    console.log('   • Guardado automático de jugadores seleccionados');
    console.log('   • Guardado automático de posiciones asignadas');
    console.log('   • Carga automática de configuración guardada');
    console.log('');

  } catch (error) {
    console.error('❌ Error aplicando migración:', error);
    console.log('\n💡 Si el error es sobre exec_sql, necesitas aplicar la migración manualmente en Supabase SQL Editor');
    process.exit(1);
  }
}

applyLineupMigration();