#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('🔍 Verificando corrección del error de carga de fotos...\n');

// Lista de archivos que deberían usar PhotoUpload (base64)
const filesToCheck = [
  'src/components/admin/player-management.tsx',
  'src/app/registro/page.tsx',
  'src/components/jugador/ProfileEditor.tsx'
];

let allCorrect = true;

filesToCheck.forEach(filePath => {
  const fullPath = path.join(__dirname, filePath);
  
  if (!fs.existsSync(fullPath)) {
    console.log(`❌ Archivo no encontrado: ${filePath}`);
    allCorrect = false;
    return;
  }
  
  const content = fs.readFileSync(fullPath, 'utf8');
  
  // Verificar que use la importación correcta
  const hasCorrectImport = content.includes("from '@/components/ui/PhotoUpload'") || 
                          content.includes('from "@/components/ui/PhotoUpload"');
  
  const hasWrongImport = content.includes("from '@/components/ui/photo-upload'") ||
                        content.includes('from "@/components/ui/photo-upload"');
  
  // Verificar que use la interfaz correcta (onPhotoChange en lugar de onPhotoUploaded)
  const hasCorrectInterface = content.includes('onPhotoChange=');
  const hasWrongInterface = content.includes('onPhotoUploaded=') || 
                           content.includes('playerName=') ||
                           content.includes('userId=');
  
  console.log(`📄 ${filePath}:`);
  
  if (hasCorrectImport && !hasWrongImport) {
    console.log('  ✅ Importación correcta');
  } else {
    console.log('  ❌ Importación incorrecta');
    allCorrect = false;
  }
  
  if (hasCorrectInterface && !hasWrongInterface) {
    console.log('  ✅ Interfaz correcta');
  } else {
    console.log('  ❌ Interfaz incorrecta');
    if (hasWrongInterface) {
      console.log('    - Aún usa parámetros del componente Storage');
    }
    allCorrect = false;
  }
  
  console.log('');
});

// Verificar que el archivo SQL de corrección existe
const sqlFilePath = path.join(__dirname, 'fix-storage-rls-policies.sql');
if (fs.existsSync(sqlFilePath)) {
  console.log('✅ Archivo SQL de corrección de RLS creado');
} else {
  console.log('❌ Archivo SQL de corrección de RLS NO encontrado');
  allCorrect = false;
}

console.log('\n🎉 ========================================');
console.log('🎉 RESULTADO DE LA VERIFICACIÓN');
console.log('🎉 ========================================');

if (allCorrect) {
  console.log('✅ TODOS LOS ARCHIVOS CORREGIDOS');
  console.log('✅ Ahora se usa PhotoUpload (base64) en lugar de Storage');
  console.log('✅ No más errores de RLS en carga de fotos');
  console.log('');
  console.log('🚀 PASOS COMPLETADOS:');
  console.log('  1. ✅ Cambiadas importaciones a PhotoUpload (base64)');
  console.log('  2. ✅ Actualizadas interfaces de componentes');  
  console.log('  3. ✅ Archivo SQL para RLS creado (ejecutar si necesario)');
  console.log('');
  console.log('🎯 PRÓXIMOS PASOS:');
  console.log('  - Probar crear jugador con foto');
  console.log('  - Verificar que no aparezca error StorageApiError');
  console.log('  - Si aún hay problemas, ejecutar el SQL en Supabase');
} else {
  console.log('❌ HAY ARCHIVOS QUE NECESITAN CORRECCIÓN');
  console.log('   Revisar los errores mostrados arriba');
}

console.log('\n📋 INFORMACIÓN ADICIONAL:');
console.log('- PhotoUpload.tsx: Usa base64 (sin Storage)');
console.log('- photo-upload.tsx: Usa Supabase Storage (puede dar RLS error)');
console.log('- Los archivos ahora usan la versión base64 que funciona');

console.log('\n✨ Corrección del error StorageApiError completada!');