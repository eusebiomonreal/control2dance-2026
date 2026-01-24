/**
 * Script para comprimir y subir archivos como ZIP al bucket protegido
 * Evita problemas con límites de tamaño de archivo individual
 */
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { persistSession: false }
});

const BUCKET_NAME = 'downloads';

async function uploadZip(folderPath, catalogNumber) {
  console.log('\n🎵 SUBIDA DE ARCHIVOS COMPRIMIDOS A SUPABASE');
  console.log('='.repeat(50));
  console.log(`📁 Carpeta: ${folderPath}`);
  console.log(`📋 Catálogo: ${catalogNumber}`);
  console.log('='.repeat(50));

  // Verificar carpeta
  if (!fs.existsSync(folderPath)) {
    console.error(`❌ La carpeta no existe: ${folderPath}`);
    process.exit(1);
  }

  // Crear ZIP temporal
  const zipName = `${catalogNumber}.zip`;
  const zipPath = `/tmp/${zipName}`;
  
  console.log(`\n📦 Creando archivo ZIP...`);
  
  try {
    // Usar zip de sistema (macOS)
    execSync(`cd "${folderPath}" && zip -j "${zipPath}" *.wav`, { stdio: 'inherit' });
  } catch (e) {
    console.error('❌ Error creando ZIP:', e.message);
    process.exit(1);
  }

  const zipSize = fs.statSync(zipPath).size;
  const zipSizeMB = (zipSize / 1024 / 1024).toFixed(2);
  console.log(`✅ ZIP creado: ${zipSizeMB} MB`);

  // Subir ZIP
  console.log(`\n📤 Subiendo ${zipName}...`);
  
  const fileBuffer = fs.readFileSync(zipPath);
  const storagePath = `${catalogNumber}/${zipName}`;

  const { data, error } = await supabase.storage
    .from(BUCKET_NAME)
    .upload(storagePath, fileBuffer, {
      contentType: 'application/zip',
      upsert: true
    });

  if (error) {
    console.error(`❌ Error subiendo: ${error.message}`);
    
    // Limpiar
    fs.unlinkSync(zipPath);
    process.exit(1);
  }

  console.log(`✅ Subido correctamente: ${BUCKET_NAME}/${storagePath}`);

  // Limpiar archivo temporal
  fs.unlinkSync(zipPath);

  console.log('\n' + '='.repeat(50));
  console.log('📊 RESUMEN');
  console.log('='.repeat(50));
  console.log(`✅ Archivo: ${storagePath}`);
  console.log(`📦 Tamaño: ${zipSizeMB} MB`);
  console.log(`\n📝 Path para products.json:`);
  console.log(`   "downloadFiles": ["${storagePath}"]`);
}

// Ejecutar
const args = process.argv.slice(2);
if (args.length < 2) {
  console.log('Uso: node scripts/upload_downloads_zip.cjs <carpeta_origen> <catalog_number>');
  process.exit(1);
}

const [folderPath, catalogNumber] = args;
uploadZip(folderPath, catalogNumber);
