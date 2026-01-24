/**
 * Script para subir archivos WAV de descarga al bucket protegido de Supabase
 * 
 * Uso: node scripts/upload_downloads.cjs <carpeta_origen> <catalog_number>
 * Ejemplo: node scripts/upload_downloads.cjs "/Volumes/Datos/02 Discografia/Discografia Emo Dj/01 Scratch Ep - Emo Dj - Dj Mito/Wav" "C2D-SCRATCH-01"
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Error: Configura SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY en .env');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { persistSession: false }
});

const BUCKET_NAME = 'downloads';

async function ensureBucketExists() {
  const { data: buckets, error } = await supabase.storage.listBuckets();
  
  if (error) {
    console.error('❌ Error listando buckets:', error.message);
    return false;
  }

  const bucketExists = buckets.some(b => b.id === BUCKET_NAME);
  
  if (!bucketExists) {
    console.log(`📦 Creando bucket "${BUCKET_NAME}"...`);
    const { error: createError } = await supabase.storage.createBucket(BUCKET_NAME, {
      public: false
    });

    if (createError) {
      console.error('❌ Error creando bucket:', createError.message);
      // Intentar continuar de todos modos, puede que ya exista
      console.log('⚠️  Intentando continuar...');
    } else {
      console.log('✅ Bucket creado correctamente');
    }
  } else {
    console.log(`✅ Bucket "${BUCKET_NAME}" ya existe`);
  }

  return true;
}

function sanitizeFileName(fileName) {
  return fileName
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Quitar acentos
    .replace(/[^a-zA-Z0-9\-_.]/g, '-') // Reemplazar caracteres especiales
    .replace(/-+/g, '-') // Quitar guiones múltiples
    .replace(/^-|-$/g, ''); // Quitar guiones al inicio/final
}

async function uploadFile(filePath, catalogNumber) {
  const fileName = path.basename(filePath);
  const sanitizedName = sanitizeFileName(fileName);
  const storagePath = `${catalogNumber}/${sanitizedName}`;
  
  console.log(`📤 Subiendo: ${fileName}`);
  console.log(`   → ${storagePath}`);

  const fileBuffer = fs.readFileSync(filePath);
  const fileSize = fs.statSync(filePath).size;
  const fileSizeMB = (fileSize / 1024 / 1024).toFixed(2);

  console.log(`   📊 Tamaño: ${fileSizeMB} MB`);

  const { data, error } = await supabase.storage
    .from(BUCKET_NAME)
    .upload(storagePath, fileBuffer, {
      contentType: 'audio/wav',
      upsert: true
    });

  if (error) {
    console.error(`   ❌ Error: ${error.message}`);
    return null;
  }

  console.log(`   ✅ Subido correctamente`);
  return {
    originalName: fileName,
    storagePath: storagePath,
    size: fileSize
  };
}

async function uploadFolder(folderPath, catalogNumber) {
  console.log('\n🎵 SUBIDA DE ARCHIVOS DE DESCARGA A SUPABASE');
  console.log('='.repeat(50));
  console.log(`📁 Carpeta: ${folderPath}`);
  console.log(`📋 Catálogo: ${catalogNumber}`);
  console.log(`🪣 Bucket: ${BUCKET_NAME} (privado)`);
  console.log('='.repeat(50));

  // Verificar carpeta
  if (!fs.existsSync(folderPath)) {
    console.error(`❌ La carpeta no existe: ${folderPath}`);
    process.exit(1);
  }

  // Verificar bucket
  const bucketReady = await ensureBucketExists();
  if (!bucketReady) {
    process.exit(1);
  }

  // Obtener archivos WAV
  const files = fs.readdirSync(folderPath)
    .filter(f => /\.(wav|flac)$/i.test(f))
    .map(f => path.join(folderPath, f));

  if (files.length === 0) {
    console.error('❌ No se encontraron archivos WAV/FLAC en la carpeta');
    process.exit(1);
  }

  console.log(`\n📂 Archivos encontrados: ${files.length}\n`);

  // Subir cada archivo
  const results = [];
  for (const file of files) {
    const result = await uploadFile(file, catalogNumber);
    if (result) {
      results.push(result);
    }
  }

  // Resumen
  console.log('\n' + '='.repeat(50));
  console.log('📊 RESUMEN DE SUBIDA');
  console.log('='.repeat(50));
  console.log(`✅ Archivos subidos: ${results.length}/${files.length}`);
  
  const totalSize = results.reduce((acc, r) => acc + r.size, 0);
  console.log(`📦 Tamaño total: ${(totalSize / 1024 / 1024).toFixed(2)} MB`);
  
  console.log('\n📋 Archivos en Storage:');
  results.forEach(r => {
    console.log(`   - ${BUCKET_NAME}/${r.storagePath}`);
  });

  // Generar paths para actualizar products.json
  console.log('\n📝 Paths para products.json (campo downloadFiles):');
  console.log(JSON.stringify(results.map(r => r.storagePath), null, 2));
}

// Ejecutar
const args = process.argv.slice(2);
if (args.length < 2) {
  console.log('Uso: node scripts/upload_downloads.cjs <carpeta_origen> <catalog_number>');
  console.log('');
  console.log('Ejemplo:');
  console.log('  node scripts/upload_downloads.cjs "/Volumes/Datos/02 Discografia/Discografia Emo Dj/01 Scratch Ep - Emo Dj - Dj Mito/Wav" "C2D-SCRATCH-01"');
  process.exit(1);
}

const [folderPath, catalogNumber] = args;
uploadFolder(folderPath, catalogNumber);
