/**
 * Script para subir archivos a Supabase Storage
 * Sube audio y covers a los buckets correspondientes
 */

const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

// Configuración de Supabase desde variables de entorno
const SUPABASE_URL = process.env.PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('❌ Faltan variables de entorno PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_KEY');
  process.exit(1);
}

const AUDIO_DIR = path.join(__dirname, '../public/audio');
const COVERS_DIR = path.join(__dirname, '../public/covers');

async function createBucket(bucketName, isPublic = true) {
  console.log(`📦 Creando bucket: ${bucketName}...`);
  
  try {
    const response = await fetch(`${SUPABASE_URL}/storage/v1/bucket`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
        'apikey': SERVICE_ROLE_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        id: bucketName,
        name: bucketName,
        public: isPublic
      })
    });
    
    const data = await response.json();
    
    if (response.ok) {
      console.log(`✅ Bucket ${bucketName} creado`);
    } else if (data.error === 'Duplicate' || data.message?.includes('already exists')) {
      console.log(`ℹ️ Bucket ${bucketName} ya existe`);
    } else {
      console.log(`⚠️ Bucket ${bucketName}: ${JSON.stringify(data)}`);
    }
  } catch (error) {
    console.error(`❌ Error creando bucket ${bucketName}:`, error.message);
  }
}

async function uploadFile(bucketName, filePath, fileName) {
  const fileBuffer = fs.readFileSync(filePath);
  const contentType = fileName.endsWith('.mp3') ? 'audio/mpeg' : 
                     fileName.endsWith('.jpg') || fileName.endsWith('.jpeg') ? 'image/jpeg' :
                     fileName.endsWith('.png') ? 'image/png' : 'application/octet-stream';
  
  try {
    const response = await fetch(`${SUPABASE_URL}/storage/v1/object/${bucketName}/${fileName}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
        'apikey': SERVICE_ROLE_KEY,
        'Content-Type': contentType,
        'x-upsert': 'true'
      },
      body: fileBuffer
    });
    
    if (response.ok) {
      return true;
    } else {
      const error = await response.json();
      console.error(`❌ Error subiendo ${fileName}:`, error);
      return false;
    }
  } catch (error) {
    console.error(`❌ Error subiendo ${fileName}:`, error.message);
    return false;
  }
}

async function uploadDirectory(bucketName, dirPath, fileExtensions) {
  const files = fs.readdirSync(dirPath);
  const validFiles = files.filter(f => fileExtensions.some(ext => f.toLowerCase().endsWith(ext)));
  
  console.log(`\n📁 Subiendo ${validFiles.length} archivos a ${bucketName}...`);
  
  let uploaded = 0;
  let failed = 0;
  
  for (let i = 0; i < validFiles.length; i++) {
    const file = validFiles[i];
    const filePath = path.join(dirPath, file);
    
    process.stdout.write(`\r⏳ [${i + 1}/${validFiles.length}] ${file.substring(0, 40)}...`);
    
    const success = await uploadFile(bucketName, filePath, file);
    if (success) {
      uploaded++;
    } else {
      failed++;
    }
    
    // Pequeña pausa para no saturar la API
    await new Promise(r => setTimeout(r, 100));
  }
  
  console.log(`\n✅ Subidos: ${uploaded} | ❌ Fallidos: ${failed}`);
  return { uploaded, failed };
}

async function main() {
  console.log('🚀 Iniciando subida a Supabase Storage...\n');
  console.log(`📍 URL: ${SUPABASE_URL}`);
  
  // Crear buckets
  await createBucket('audio', true);
  await createBucket('covers', true);
  
  // Subir archivos
  const audioResult = await uploadDirectory('audio', AUDIO_DIR, ['.mp3']);
  const coversResult = await uploadDirectory('covers', COVERS_DIR, ['.jpg', '.jpeg', '.png', '.webp']);
  
  console.log('\n========================================');
  console.log('📊 RESUMEN:');
  console.log(`   Audio: ${audioResult.uploaded} subidos, ${audioResult.failed} fallidos`);
  console.log(`   Covers: ${coversResult.uploaded} subidos, ${coversResult.failed} fallidos`);
  console.log('========================================\n');
  
  if (audioResult.failed === 0 && coversResult.failed === 0) {
    console.log('✅ ¡Todos los archivos subidos correctamente!');
  } else {
    console.log('⚠️ Algunos archivos no se pudieron subir. Revisa los errores arriba.');
  }
}

main().catch(console.error);
