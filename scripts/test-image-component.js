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

async function testImageComponent() {
  loadEnvFile();
  
  console.log('🖼️ DIAGNÓSTICO DEL COMPONENTE IMAGE\n');
  
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false }
  });
  
  try {
    // Obtener el jugador con foto
    const { data: jugadorConFoto } = await supabase
      .from('jugadores')
      .select('id, nombre, foto_url')
      .not('foto_url', 'is', null)
      .limit(1)
      .single();
    
    if (!jugadorConFoto) {
      console.log('❌ No hay jugadores con foto');
      return;
    }
    
    console.log(`👤 Analizando imagen de: ${jugadorConFoto.nombre}`);
    
    // Analizar la imagen
    const fotoUrl = jugadorConFoto.foto_url;
    
    console.log('\n🔍 ANÁLISIS DETALLADO:');
    console.log(`📏 Longitud total: ${fotoUrl.length} caracteres`);
    
    // Verificar formato
    if (fotoUrl.startsWith('data:image/')) {
      const mimeMatch = fotoUrl.match(/^data:image\/([a-zA-Z]*);base64,/);
      if (mimeMatch) {
        console.log(`📸 Tipo MIME: image/${mimeMatch[1]}`);
        console.log(`🔤 Header completo: ${mimeMatch[0]}`);
        
        // Verificar si es un formato soportado por Next.js Image
        const supportedFormats = ['jpeg', 'jpg', 'png', 'webp', 'gif', 'bmp', 'svg'];
        const imageType = mimeMatch[1].toLowerCase();
        
        if (supportedFormats.includes(imageType)) {
          console.log('✅ Formato soportado por Next.js Image');
        } else {
          console.log(`❌ Formato NO soportado por Next.js Image: ${imageType}`);
        }
        
        // Calcular tamaño aproximado en KB
        const base64Data = fotoUrl.split(',')[1];
        const approximateBytes = (base64Data.length * 3) / 4;
        const approximateKB = Math.round(approximateBytes / 1024);
        
        console.log(`📊 Tamaño aproximado: ${approximateKB} KB`);
        
        // Verificar si el tamaño es muy grande para Next.js
        if (approximateKB > 1000) {
          console.log('⚠️ IMAGEN MUY GRANDE - Podría causar problemas de rendimiento');
          console.log('💡 Recomendación: Redimensionar imagen antes de guardar');
        } else {
          console.log('✅ Tamaño apropiado');
        }
        
        // Verificar primeros caracteres del base64
        const first50Chars = base64Data.substring(0, 50);
        console.log(`🔤 Primeros 50 chars del base64: ${first50Chars}...`);
        
        // Verificar que el base64 es válido
        try {
          Buffer.from(base64Data, 'base64');
          console.log('✅ Base64 válido');
        } catch (error) {
          console.log('❌ Base64 INVÁLIDO');
          console.log('🔧 Esto podría causar que la imagen no se renderice');
        }
        
      } else {
        console.log('❌ Formato data URL inválido');
      }
    } else {
      console.log('❌ No es un data URL');
    }
    
    // Sugerencias específicas para Next.js Image
    console.log('\n💡 DIAGNÓSTICO NEXT.JS IMAGE COMPONENT:');
    console.log('🔧 Posibles causas del problema:');
    console.log('   1. Política de Seguridad de Contenido (CSP) bloqueando data URLs');
    console.log('   2. Next.js Image optimization interfiriendo con data URLs');
    console.log('   3. Tamaño de imagen muy grande causando timeout');
    console.log('   4. Formato no soportado por el navegador');
    
    console.log('\n🛠️ SOLUCIONES RECOMENDADAS:');
    console.log('   1. Usar <img> en lugar de Next.js <Image> para data URLs');
    console.log('   2. Redimensionar imágenes antes de convertir a Base64');
    console.log('   3. Considerar almacenamiento en Supabase Storage');
    console.log('   4. Añadir unoptimized={true} al componente Image');
    
    // Generar código de prueba
    console.log('\n📝 CÓDIGO DE PRUEBA SUGERIDO:');
    console.log('Replace this in the component:');
    console.log(`
// En lugar de:
<Image
  src={profile.fotoUrl}
  alt={profile.nombre || ''}
  width={96}
  height={96}
  className="rounded-full border-4 border-white/20 shadow-xl"
/>

// Usar esto temporalmente:
<img
  src={profile.fotoUrl}
  alt={profile.nombre || ''}
  width={96}
  height={96}
  className="rounded-full border-4 border-white/20 shadow-xl"
/>

// O añadir unoptimized:
<Image
  src={profile.fotoUrl}
  alt={profile.nombre || ''}
  width={96}
  height={96}
  unoptimized={true}
  className="rounded-full border-4 border-white/20 shadow-xl"
/>
    `);
    
  } catch (error) {
    console.log('💥 Error:', error.message);
  }
}

testImageComponent();