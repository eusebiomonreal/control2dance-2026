/**
 * Script para subir archivos de audio a Supabase Storage
 * Maneja estructura de subcarpetas
 */

const fs = require('fs');
const path = require('path');

// Configuración de Supabase
const SUPABASE_URL = 'https://api.control2dance.es';
const SERVICE_ROLE_KEY = 'REDACTED_SERVICE_KEY';

const AUDIO_DIR = path.join(__dirname, '../public/audio');

async function uploadFile(bucketName, filePath, storagePath) {
  const fileBuffer = fs.readFileSync(filePath);
  
  try {
    const response = await fetch(`${SUPABASE_URL}/storage/v1/object/${bucketName}/${storagePath}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
        'apikey': SERVICE_ROLE_KEY,
        'Content-Type': 'audio/mpeg',
        'x-upsert': 'true'
      },
      body: fileBuffer
    });
    
    if (response.ok) {
      return true;
    } else {
      const error = await response.json();
      console.error(`\n❌ Error subiendo ${storagePath}:`, error);
      return false;
    }
  } catch (error) {
    console.error(`\n❌ Error subiendo ${storagePath}:`, error.message);
    return false;
  }
}

function findAllMp3Files(dir) {
  const files = [];
  
  function scanDir(currentDir, relativePath = '') {
    const items = fs.readdirSync(currentDir);
    
    for (const item of items) {
      const fullPath = path.join(currentDir, item);
      const itemRelativePath = relativePath ? `${relativePath}/${item}` : item;
      const stat = fs.statSync(fullPath);
      
      if (stat.isDirectory()) {
        scanDir(fullPath, itemRelativePath);
      } else if (item.toLowerCase().endsWith('.mp3')) {
        files.push({
          fullPath,
          relativePath: itemRelativePath
        });
      }
    }
  }
  
  scanDir(dir);
  return files;
}

async function main() {
  console.log('🚀 Subiendo archivos de audio a Supabase Storage...\n');
  
  const mp3Files = findAllMp3Files(AUDIO_DIR);
  console.log(`📁 Encontrados ${mp3Files.length} archivos MP3\n`);
  
  let uploaded = 0;
  let failed = 0;
  
  for (let i = 0; i < mp3Files.length; i++) {
    const file = mp3Files[i];
    process.stdout.write(`\r⏳ [${i + 1}/${mp3Files.length}] ${file.relativePath.substring(0, 50)}...`);
    
    const success = await uploadFile('audio', file.fullPath, file.relativePath);
    if (success) {
      uploaded++;
    } else {
      failed++;
    }
    
    // Pequeña pausa para no saturar la API
    await new Promise(r => setTimeout(r, 50));
  }
  
  console.log(`\n\n========================================`);
  console.log(`📊 RESUMEN:`);
  console.log(`   ✅ Subidos: ${uploaded}`);
  console.log(`   ❌ Fallidos: ${failed}`);
  console.log(`========================================\n`);
}

main().catch(console.error);
