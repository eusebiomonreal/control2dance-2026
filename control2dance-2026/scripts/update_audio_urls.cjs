/**
 * Script para actualizar products.json con URLs de Supabase Storage
 * Ejecutar: node scripts/update_audio_urls.cjs
 */

const fs = require('fs');
const path = require('path');

// Cargar variables de entorno
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const PRODUCTS_FILE = path.join(__dirname, '..', 'public', 'products.json');
const SUPABASE_URL = process.env.PUBLIC_SUPABASE_URL;
const BUCKET_NAME = 'audio-previews';

// URL base para los audios en Supabase Storage
const SUPABASE_AUDIO_BASE = `${SUPABASE_URL}/storage/v1/object/public/${BUCKET_NAME}`;

function updateAudioUrls() {
  console.log('📦 Actualizando URLs de audio en products.json\n');
  console.log(`Base URL: ${SUPABASE_AUDIO_BASE}\n`);
  
  // Leer products.json
  const productsRaw = fs.readFileSync(PRODUCTS_FILE, 'utf-8');
  const products = JSON.parse(productsRaw);
  
  let updatedCount = 0;
  
  for (const product of products) {
    if (product.audioUrls && product.audioUrls.length > 0) {
      product.audioUrls = product.audioUrls.map(url => {
        // Si ya es una URL completa, no modificar
        if (url.startsWith('http')) {
          return url;
        }
        
        // Convertir /audio/path/file.mp3 → URL de Supabase
        const relativePath = url.replace(/^\/audio\//, '');
        return `${SUPABASE_AUDIO_BASE}/${relativePath}`;
      });
      updatedCount++;
    }
  }
  
  // Guardar products.json actualizado
  fs.writeFileSync(PRODUCTS_FILE, JSON.stringify(products, null, 2));
  
  console.log(`✅ Actualizados ${updatedCount} productos con URLs de Supabase`);
  console.log(`📁 Guardado en: ${PRODUCTS_FILE}`);
}

updateAudioUrls();
