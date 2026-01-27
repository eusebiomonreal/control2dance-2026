/**
 * Script para optimizar imágenes de covers a WebP
 * Ejecutar: node scripts/optimize_covers_webp.cjs
 * 
 * Opciones:
 *   --dry-run    Solo muestra qué haría sin ejecutar
 *   --quality=N  Calidad de WebP (1-100, default: 85)
 *   --update-db  Actualizar URLs en la base de datos
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');

// Cargar variables de entorno
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const supabaseUrl = process.env.PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Faltan variables de entorno PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Parsear argumentos
const args = process.argv.slice(2);
const DRY_RUN = args.includes('--dry-run');
const UPDATE_DB = args.includes('--update-db');
const qualityArg = args.find(a => a.startsWith('--quality='));
const QUALITY = qualityArg ? parseInt(qualityArg.split('=')[1]) : 85;

const BUCKET_NAME = 'covers';
const TEMP_DIR = path.join(__dirname, '..', '.temp_covers');

// Crear directorio temporal
if (!fs.existsSync(TEMP_DIR)) {
  fs.mkdirSync(TEMP_DIR, { recursive: true });
}

// Descargar archivo
function downloadFile(url) {
  return new Promise((resolve, reject) => {
    const protocol = url.startsWith('https') ? https : http;
    const filePath = path.join(TEMP_DIR, `temp_${Date.now()}_${Math.random().toString(36).slice(2)}`);
    const file = fs.createWriteStream(filePath);
    
    protocol.get(url, (response) => {
      if (response.statusCode === 301 || response.statusCode === 302) {
        downloadFile(response.headers.location).then(resolve).catch(reject);
        return;
      }
      response.pipe(file);
      file.on('finish', () => {
        file.close();
        resolve(filePath);
      });
    }).on('error', (err) => {
      fs.unlink(filePath, () => {});
      reject(err);
    });
  });
}

// Convertir imagen a WebP usando canvas (sin dependencias externas)
async function convertToWebP(inputPath, outputPath, quality = 85) {
  // Usamos sharp si está disponible, sino mostramos instrucciones
  try {
    const sharp = require('sharp');
    await sharp(inputPath)
      .webp({ quality })
      .toFile(outputPath);
    return true;
  } catch (err) {
    if (err.code === 'MODULE_NOT_FOUND') {
      console.error('\n❌ Se requiere el paquete "sharp" para convertir imágenes.');
      console.error('   Instálalo con: npm install sharp\n');
      process.exit(1);
    }
    throw err;
  }
}

async function getProductsWithCovers() {
  const { data, error } = await supabase
    .from('products')
    .select('id, name, catalog_number, slug, cover_image')
    .not('cover_image', 'is', null)
    .order('catalog_number');

  if (error) {
    console.error('Error obteniendo productos:', error);
    return [];
  }

  return data || [];
}

async function uploadWebP(filePath, storagePath) {
  const fileBuffer = fs.readFileSync(filePath);
  
  const { data, error } = await supabase.storage
    .from(BUCKET_NAME)
    .upload(storagePath, fileBuffer, {
      contentType: 'image/webp',
      upsert: true
    });

  if (error) throw error;

  const { data: urlData } = supabase.storage
    .from(BUCKET_NAME)
    .getPublicUrl(storagePath);

  return urlData.publicUrl;
}

async function updateProductCover(productId, newUrl) {
  const { error } = await supabase
    .from('products')
    .update({ cover_image: newUrl })
    .eq('id', productId);

  if (error) throw error;
}

async function main() {
  console.log('🖼️  Optimización de covers a WebP');
  console.log('================================');
  console.log(`   Calidad: ${QUALITY}%`);
  console.log(`   Modo: ${DRY_RUN ? 'Dry Run (solo simulación)' : 'Ejecución real'}`);
  console.log(`   Actualizar DB: ${UPDATE_DB ? 'Sí' : 'No'}`);
  console.log('');

  // Verificar sharp
  try {
    require('sharp');
  } catch (err) {
    console.error('❌ Se requiere el paquete "sharp" para convertir imágenes.');
    console.error('   Instálalo con: npm install sharp');
    process.exit(1);
  }

  const products = await getProductsWithCovers();
  console.log(`📦 Encontrados ${products.length} productos con imagen\n`);

  let converted = 0;
  let skipped = 0;
  let errors = 0;

  for (const product of products) {
    const coverUrl = product.cover_image;
    
    // Saltar si ya es WebP
    if (coverUrl.endsWith('.webp')) {
      console.log(`⏭️  ${product.catalog_number}: Ya es WebP`);
      skipped++;
      continue;
    }

    console.log(`🔄 ${product.catalog_number}: ${product.name}`);
    console.log(`   Original: ${coverUrl}`);

    if (DRY_RUN) {
      console.log(`   → Convertiría a WebP`);
      converted++;
      continue;
    }

    try {
      // Descargar imagen original
      const tempInput = await downloadFile(coverUrl);
      const tempOutput = tempInput + '.webp';

      // Convertir a WebP
      await convertToWebP(tempInput, tempOutput, QUALITY);

      // Generar path en storage
      const slug = product.slug || product.catalog_number.toLowerCase().replace(/[^a-z0-9]+/g, '-');
      const storagePath = `${slug}/cover.webp`;

      // Subir a Supabase
      const newUrl = await uploadWebP(tempOutput, storagePath);
      console.log(`   ✅ Convertido: ${newUrl}`);

      // Actualizar en DB si se solicitó
      if (UPDATE_DB) {
        await updateProductCover(product.id, newUrl);
        console.log(`   📝 URL actualizada en DB`);
      }

      // Limpiar archivos temporales
      fs.unlinkSync(tempInput);
      fs.unlinkSync(tempOutput);

      converted++;
    } catch (err) {
      console.error(`   ❌ Error: ${err.message}`);
      errors++;
    }
  }

  // Limpiar directorio temporal
  try {
    fs.rmdirSync(TEMP_DIR, { recursive: true });
  } catch (e) {}

  console.log('\n================================');
  console.log('📊 Resumen:');
  console.log(`   ✅ Convertidos: ${converted}`);
  console.log(`   ⏭️  Omitidos (ya WebP): ${skipped}`);
  console.log(`   ❌ Errores: ${errors}`);
  
  if (DRY_RUN) {
    console.log('\n💡 Ejecuta sin --dry-run para aplicar los cambios');
    console.log('   Añade --update-db para actualizar las URLs en la base de datos');
  }
}

main().catch(console.error);
