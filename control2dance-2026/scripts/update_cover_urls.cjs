/**
 * Script para actualizar las URLs de covers en products.json
 * Cambia de /covers/ a Supabase Storage URLs
 */

require('dotenv').config({ path: '.env' });
const fs = require('fs');
const path = require('path');

const SUPABASE_URL = process.env.PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const PRODUCTS_FILE = path.join(__dirname, '../public/products.json');
const COVERS_BASE_URL = `${SUPABASE_URL}/storage/v1/object/public/covers`;

console.log('🖼️  Actualizando URLs de covers en products.json\n');
console.log(`Supabase URL: ${SUPABASE_URL}`);
console.log(`Nueva URL base: ${COVERS_BASE_URL}\n`);

// Leer products.json
const products = JSON.parse(fs.readFileSync(PRODUCTS_FILE, 'utf8'));

console.log(`📦 Productos encontrados: ${products.length}\n`);

let updated = 0;
let notFound = 0;

products.forEach(product => {
  // Actualizar image principal
  if (product.image && product.image.startsWith('/covers/')) {
    const fileName = product.image.replace('/covers/', '');
    product.image = `${COVERS_BASE_URL}/${fileName}`;
    updated++;
    console.log(`✅ ${product.title}: ${fileName}`);
  } else if (product.image && product.image.includes('/covers/')) {
    // Ya tiene URL completa o está en otro formato
    console.log(`⏭️  ${product.title}: ya actualizado o diferente formato`);
  } else {
    console.log(`⚠️  ${product.title}: sin imagen`);
    notFound++;
  }

  // Actualizar images array si existe
  if (product.images && Array.isArray(product.images)) {
    product.images = product.images.map(img => {
      if (img.startsWith('/covers/')) {
        const fileName = img.replace('/covers/', '');
        return `${COVERS_BASE_URL}/${fileName}`;
      }
      return img;
    });
  }
});

// Guardar products.json actualizado
fs.writeFileSync(PRODUCTS_FILE, JSON.stringify(products, null, 2));

console.log('\n==================================================');
console.log(`✅ Productos actualizados: ${updated}`);
console.log(`⚠️  Sin imagen: ${notFound}`);
console.log('\n📄 products.json actualizado correctamente');
