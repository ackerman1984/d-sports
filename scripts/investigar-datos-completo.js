#!/usr/bin/env node

/**
 * Investigación completa de dónde están los datos realmente
 */

const { createClient } = require('@supabase/supabase-js');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Error: Missing Supabase environment variables');
  process.exit(1);
}

// Crear cliente con SERVICE ROLE (acceso total)
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

// Crear cliente con ANON KEY (acceso público)
const supabasePublic = createClient(supabaseUrl, supabaseAnonKey);

async function investigarDatos() {
  console.log('🔍 INVESTIGACIÓN COMPLETA DE DATOS');
  console.log('═'.repeat(60));
  console.log(`📡 URL: ${supabaseUrl}`);
  console.log(`🔑 Service Key: ${supabaseServiceKey.slice(0, 20)}...`);
  console.log(`🔑 Anon Key: ${supabaseAnonKey.slice(0, 20)}...`);

  try {
    // ======================================================================
    // 1. INVESTIGAR LIGAS CON SERVICE ROLE
    // ======================================================================
    console.log('\n1️⃣ LIGAS CON SERVICE ROLE (acceso total)');
    console.log('─'.repeat(50));
    
    const { data: ligasAdmin, error: ligasAdminError } = await supabaseAdmin
      .from('ligas')
      .select('*')
      .order('nombre');

    if (ligasAdminError) {
      console.error('❌ Error con service role:', ligasAdminError);
    } else {
      console.log(`✅ Encontradas ${ligasAdmin.length} ligas con SERVICE ROLE`);
      ligasAdmin.forEach(liga => {
        console.log(`   📋 ${liga.nombre} (${liga.codigo}) - ID: ${liga.id.slice(0, 8)}...`);
      });
    }

    // ======================================================================
    // 2. INVESTIGAR LIGAS CON ANON KEY
    // ======================================================================
    console.log('\n2️⃣ LIGAS CON ANON KEY (acceso público)');
    console.log('─'.repeat(50));
    
    const { data: ligasPublic, error: ligasPublicError } = await supabasePublic
      .from('ligas')
      .select('*')
      .order('nombre');

    if (ligasPublicError) {
      console.error('❌ Error con anon key:', ligasPublicError);
    } else {
      console.log(`✅ Encontradas ${ligasPublic.length} ligas con ANON KEY`);
      ligasPublic.forEach(liga => {
        console.log(`   📋 ${liga.nombre} (${liga.codigo}) - ID: ${liga.id.slice(0, 8)}...`);
      });
    }

    // ======================================================================
    // 3. COMPARAR DIFERENCIAS EN LIGAS
    // ======================================================================
    if (ligasAdmin && ligasPublic) {
      console.log('\n3️⃣ COMPARACIÓN DE LIGAS');
      console.log('─'.repeat(30));
      
      if (ligasAdmin.length === ligasPublic.length) {
        console.log('✅ Mismo número de ligas en ambos accesos');
      } else {
        console.log(`⚠️  DIFERENCIA: Service(${ligasAdmin.length}) vs Public(${ligasPublic.length})`);
      }
    }

    // ======================================================================
    // 4. INVESTIGAR EQUIPOS CON SERVICE ROLE
    // ======================================================================
    console.log('\n4️⃣ EQUIPOS CON SERVICE ROLE');
    console.log('─'.repeat(40));
    
    const { data: equiposAdmin, error: equiposAdminError } = await supabaseAdmin
      .from('equipos')
      .select('*')
      .order('nombre');

    if (equiposAdminError) {
      console.error('❌ Error equipos service role:', equiposAdminError);
    } else {
      console.log(`✅ Encontrados ${equiposAdmin.length} equipos con SERVICE ROLE`);
      
      // Agrupar por liga
      const equiposPorLiga = {};
      equiposAdmin.forEach(equipo => {
        if (!equiposPorLiga[equipo.liga_id]) {
          equiposPorLiga[equipo.liga_id] = [];
        }
        equiposPorLiga[equipo.liga_id].push(equipo);
      });

      Object.entries(equiposPorLiga).forEach(([ligaId, equipos]) => {
        console.log(`   🏆 Liga ${ligaId.slice(0, 8)}...: ${equipos.length} equipos`);
        equipos.forEach(equipo => {
          console.log(`      ⚾ ${equipo.nombre} (${equipo.color})`);
        });
      });
    }

    // ======================================================================
    // 5. INVESTIGAR EQUIPOS CON ANON KEY
    // ======================================================================
    console.log('\n5️⃣ EQUIPOS CON ANON KEY');
    console.log('─'.repeat(40));
    
    const { data: equiposPublic, error: equiposPublicError } = await supabasePublic
      .from('equipos')
      .select('*')
      .order('nombre');

    if (equiposPublicError) {
      console.error('❌ Error equipos anon key:', equiposPublicError);
      console.error('   Mensaje:', equiposPublicError.message);
      console.error('   Código:', equiposPublicError.code);
    } else {
      console.log(`✅ Encontrados ${equiposPublic.length} equipos con ANON KEY`);
    }

    // ======================================================================
    // 6. PROBAR ENDPOINT ESPECÍFICO
    // ======================================================================
    if (ligasAdmin && ligasAdmin.length > 0) {
      console.log('\n6️⃣ PROBANDO ENDPOINT PÚBLICO ESPECÍFICO');
      console.log('─'.repeat(45));
      
      for (let i = 0; i < Math.min(3, ligasAdmin.length); i++) {
        const liga = ligasAdmin[i];
        console.log(`\n🔍 Probando: ${liga.nombre}`);
        console.log(`   Liga ID: ${liga.id}`);
        
        try {
          const { data: equiposEndpoint, error: endpointError } = await supabasePublic
            .from('equipos')
            .select('*')
            .eq('liga_id', liga.id)
            .eq('activo', true);

          if (endpointError) {
            console.error(`   ❌ Error: ${endpointError.message}`);
          } else {
            console.log(`   ✅ Equipos encontrados: ${equiposEndpoint.length}`);
            equiposEndpoint.forEach(equipo => {
              console.log(`      - ${equipo.nombre}`);
            });
          }
        } catch (error) {
          console.error(`   ❌ Exception: ${error.message}`);
        }
      }
    }

    // ======================================================================
    // 7. DIAGNÓSTICO Y RECOMENDACIONES
    // ======================================================================
    console.log('\n7️⃣ DIAGNÓSTICO Y RECOMENDACIONES');
    console.log('═'.repeat(50));
    
    if (ligasAdminError || equiposAdminError) {
      console.log('🚨 PROBLEMA CRÍTICO: Error con SERVICE ROLE');
      console.log('   Solución: Verificar permisos de base de datos');
    } else if (ligasPublicError || equiposPublicError) {
      console.log('🚨 PROBLEMA: Error con ANON KEY');
      console.log('   Solución: Ajustar políticas RLS');
    } else if (equiposAdmin && equiposAdmin.length === 0) {
      console.log('🚨 PROBLEMA: No hay equipos en la base de datos');
      console.log('   Solución: Ejecutar script de poblado');
    } else if (equiposPublic && equiposPublic.length === 0) {
      console.log('🚨 PROBLEMA: RLS bloquea acceso público a equipos');
      console.log('   Solución: Actualizar políticas RLS');
    } else {
      console.log('✅ Datos presentes, posible problema de frontend/cache');
    }

  } catch (error) {
    console.error('❌ Error general:', error);
  }
}

// Ejecutar investigación
investigarDatos();