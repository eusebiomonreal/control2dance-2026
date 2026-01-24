/**
 * Script para subir imágenes de covers a Supabase Storage
 * Ejecutar: node scripts/upload_covers_to_supabase.cjs
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Configuración - cargar desde .env
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const supabaseUrl = process.env.PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Faltan variables de entorno SUPABASE_URL o SUPABASE_SERVICE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

const COVERS_DIR = path.join(__dirname, '..', 'public', 'covers');
const BUCKET_NAME = 'covers';

async function createBucketIfNotExists() {
  console.log('📦 Verificando bucket...');
  
  const { data: buckets, error: listError } = await supabase.storage.listBuckets();
  
  if (listError) {
    console.error('Error listando buckets:', listError);
    return false;
  }
  
  const bucketExists = buckets.some(b => b.id === BUCKET_NAME);
  
  if (!bucketExists) {
    console.log(`📦 Creando bucket "${BUCKET_NAME}"...`);
    const { error: createError } = await supabase.storage.createBucket(BUCKET_NAME, {
      public: true, // Público para mostrar las portadas
      fileSizeLimit: 10485760, // 10MB max por archivo
      allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
    });
    
    if (createError) {
      console.error('Error creando bucket:', createError);
      return false;
    }
    console.log('✅ Bucket creado');
  } else {
    console.log('✅ Bucket ya existe');
  }
  
  return true;
}

async function uploadFile(filePath, storagePath) {
  const fileBuffer = fs.readFileSync(filePath);
  const ext = path.extname(filePath).toLowerCase();
  
  const contentTypes = {
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.webp': 'image/webp',
    '.gif': 'image/gif'
  };
  
  const contentType = contentTypes[ext] || 'image/jpeg';
  
  const { data, error } = await supabase.storage
    .from(BUCKET_NAME)
    .upload(storagePath, fileBuffer, {
      contentType,
      upsert: true // Sobrescribir si existe
    });
  
  if (error) {
    throw error;
  }
  
  return data;
}

async function getAllImageFiles() {
  const files = [];
  const validExtensions = ['.jpg', '.jpeg', '.png', '.webp', '.gif'];
  
  if (!fs.existsSync(COVERS_DIR)) {
    console.log('❌ No existe el directorio de covers');
    return files;
  }
  
  const items = fs.readdirSync(COVERS_DIR);
  
  for (const item of items) {
    const fullPath = path.join(COVERS_DIR, item);
    const stat = fs.statSync(fullPath);
    const ext = path.extname(item).toLowerCase();
    
    if (stat.isFile() && validExtensions.includes(ext)) {
      files.push({
        localPath: fullPath,
        storagePath: item,
        size: stat.size
      });
    }
  }
  
  return files;
}

async function main() {
  console.log('🖼️  Subiendo covers a Supabase Storage\n');
  console.log(`Supabase URL: ${supabaseUrl}`);
  console.log(`Covers dir: ${COVERS_DIR}\n`);
  
  // Crear bucket si no existe
  const bucketReady = await createBucketIfNotExists();
  if (!bucketReady) {
    console.error('❌ No se pudo preparar el bucket');
    process.exit(1);
  }
  
  // Obtener todos los archivos de imagen
  const files = await getAllImageFiles();
  console.log(`\n📁 Encontradas ${files.length} imágenes\n`);
  
  if (files.length === 0) {
    console.log('No hay archivos para subir');
    return;
  }
  
  // Calcular tamaño total
  const totalSize = files.reduce((sum, f) => sum + f.size, 0);
  console.log(`📊 Tamaño total: ${(totalSize / 1024 / 1024).toFixed(2)} MB\n`);
  
  // Subir archivos
  let uploaded = 0;
  let failed = 0;
  const errors = [];
  
  for (const file of files) {
    try {
      process.stdout.write(`⬆️  Subiendo: ${file.storagePath}... `);
      await uploadFile(file.localPath, file.storagePath);
      console.log('✅');
      uploaded++;
    } catch (error) {
      console.log('❌');
      failed++;
      errors.push({ file: file.storagePath, error: error.message });
    }
  }
  
  console.log('\n' + '='.repeat(50));
  console.log(`✅ Subidos: ${uploaded}`);
  console.log(`❌ Fallidos: ${failed}`);
  
  if (errors.length > 0) {
    console.log('\nErrores:');
    errors.forEach(e => console.log(`  - ${e.file}: ${e.error}`));
  }
  
  // Mostrar URL base
  console.log('\n📍 URL base para las imágenes:');
  console.log(`${supabaseUrl}/storage/v1/object/public/${BUCKET_NAME}/`);
}

main().catch(console.error);
