#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Faltan variables de entorno NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function setupStorageBucket() {
  try {
    console.log('🗂️ Configurando bucket de Storage para fotos de jugadores...\n');

    // 1. Verificar si el bucket ya existe
    console.log('🔍 Verificando buckets existentes...');
    const { data: buckets, error: listError } = await supabase.storage.listBuckets();
    
    if (listError) {
      console.error('❌ Error listando buckets:', listError.message);
      return;
    }

    console.log(`📦 Buckets encontrados: ${buckets?.length || 0}`);
    buckets?.forEach(bucket => {
      console.log(`   - ${bucket.name} (${bucket.public ? 'público' : 'privado'})`);
    });

    // 2. Verificar si el bucket 'player-photos' ya existe
    const playerPhotosBucket = buckets?.find(bucket => bucket.name === 'player-photos');
    
    if (playerPhotosBucket) {
      console.log('\n✅ El bucket "player-photos" ya existe');
      console.log(`   - Público: ${playerPhotosBucket.public ? 'Sí' : 'No'}`);
      console.log(`   - Creado: ${playerPhotosBucket.created_at}`);
    } else {
      // 3. Crear el bucket si no existe
      console.log('\n📦 Creando bucket "player-photos"...');
      const { data: newBucket, error: createError } = await supabase.storage.createBucket('player-photos', {
        public: true, // Hacer público para acceso fácil a las imágenes
        allowedMimeTypes: ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'],
        fileSizeLimit: 5 * 1024 * 1024 // 5MB máximo
      });

      if (createError) {
        console.error('❌ Error creando bucket:', createError.message);
        console.log('\n📋 INSTRUCCIONES MANUALES:');
        console.log('1. Ve a tu proyecto en https://supabase.com');
        console.log('2. Ve a Storage');
        console.log('3. Crea un nuevo bucket llamado "player-photos"');
        console.log('4. Márcalo como público');
        console.log('5. Configura tipos MIME: image/jpeg, image/jpg, image/png, image/webp');
        console.log('6. Límite de tamaño: 5MB');
        return;
      } else {
        console.log('✅ Bucket "player-photos" creado exitosamente');
      }
    }

    // 4. Configurar políticas de acceso (RLS)
    console.log('\n🔐 Configurando políticas de acceso...');
    
    const policies = [
      {
        name: 'Allow public read access',
        sql: `
          CREATE POLICY "Public read access for player photos" ON storage.objects 
          FOR SELECT 
          USING (bucket_id = 'player-photos');
        `
      },
      {
        name: 'Allow authenticated upload',
        sql: `
          CREATE POLICY "Authenticated users can upload player photos" ON storage.objects 
          FOR INSERT 
          WITH CHECK (bucket_id = 'player-photos' AND auth.role() = 'authenticated');
        `
      },
      {
        name: 'Allow users to update their own photos',
        sql: `
          CREATE POLICY "Users can update their own player photos" ON storage.objects 
          FOR UPDATE 
          USING (bucket_id = 'player-photos' AND auth.role() = 'authenticated');
        `
      },
      {
        name: 'Allow users to delete their own photos',
        sql: `
          CREATE POLICY "Users can delete their own player photos" ON storage.objects 
          FOR DELETE 
          USING (bucket_id = 'player-photos' AND auth.role() = 'authenticated');
        `
      }
    ];

    console.log('\n📋 EJECUTA ESTAS POLÍTICAS EN EL SQL EDITOR DE SUPABASE:');
    console.log('=' .repeat(60));
    policies.forEach((policy, index) => {
      console.log(`\n${index + 1}. ${policy.name}:`);
      console.log(policy.sql);
    });
    console.log('=' .repeat(60));

    // 5. Probar subida de archivo de prueba
    console.log('\n🧪 Probando acceso al bucket...');
    try {
      const { data: files, error: listFilesError } = await supabase.storage
        .from('player-photos')
        .list('', { limit: 1 });

      if (listFilesError) {
        console.error('❌ Error listando archivos:', listFilesError.message);
      } else {
        console.log('✅ Acceso al bucket confirmado');
        console.log(`📁 Archivos en bucket: ${files?.length || 0}`);
      }
    } catch (testError) {
      console.log('⚠️ No se pudo probar el acceso al bucket');
    }

    // 6. Mostrar URL base para las imágenes
    console.log('\n🌐 URL base para imágenes:');
    const baseUrl = `${supabaseUrl}/storage/v1/object/public/player-photos/`;
    console.log(`📸 ${baseUrl}`);

    console.log('\n🎉 CONFIGURACIÓN COMPLETADA!');
    console.log('\n📋 PRÓXIMOS PASOS:');
    console.log('1. Ejecutar las políticas SQL en Supabase Dashboard');
    console.log('2. Implementar componente de subida de fotos');
    console.log('3. Integrar en formularios de registro y perfil');

    return {
      bucketExists: true,
      baseUrl: baseUrl,
      policies: policies
    };

  } catch (error) {
    console.error('💥 Error durante la configuración:', error);
  }
}

// Ejecutar si es llamado directamente
if (require.main === module) {
  setupStorageBucket();
}

module.exports = { setupStorageBucket };