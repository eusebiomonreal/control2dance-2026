/**
 * Script completo para sincronizar TODOS los productos con Discogs:
 * 1. Buscar cada producto en Discogs por catalog_number
 * 2. Obtener tracklist, credits, barcode
 * 3. Actualizar en Supabase
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

const DISCOGS_TOKEN = 'TokFzBJmIsRhpiPfhwrlCgUfIbGLLBhmeydUeWmq';
const DELAY_MS = 2500; // Discogs rate limit - aumentado para evitar 429

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function searchDiscogs(catalogNumber, productName) {
  // Buscar por catalog number primero
  const searchQuery = encodeURIComponent(catalogNumber);
  const url = `https://api.discogs.com/database/search?catno=${searchQuery}&type=release&token=${DISCOGS_TOKEN}`;
  
  const response = await fetch(url, {
    headers: { 'User-Agent': 'Control2DanceSync/1.0' }
  });
  
  if (!response.ok) {
    throw new Error(`Search failed: ${response.status}`);
  }
  
  const data = await response.json();
  
  if (data.results && data.results.length > 0) {
    return data.results[0];
  }
  
  // Si no encuentra por catno, buscar por nombre
  const nameQuery = encodeURIComponent(productName);
  const url2 = `https://api.discogs.com/database/search?q=${nameQuery}&type=release&token=${DISCOGS_TOKEN}`;
  
  const response2 = await fetch(url2, {
    headers: { 'User-Agent': 'Control2DanceSync/1.0' }
  });
  
  if (!response2.ok) return null;
  
  const data2 = await response2.json();
  return data2.results?.[0] || null;
}

async function fetchReleaseDetails(releaseId) {
  const url = `https://api.discogs.com/releases/${releaseId}?token=${DISCOGS_TOKEN}`;
  
  const response = await fetch(url, {
    headers: { 'User-Agent': 'Control2DanceSync/1.0' }
  });
  
  if (!response.ok) {
    throw new Error(`Release fetch failed: ${response.status}`);
  }
  
  return response.json();
}

function processTracklist(tracklist) {
  if (!tracklist || !Array.isArray(tracklist)) return null;
  
  const tracks = tracklist
    .filter(t => t.type_ === 'track')
    .map(t => ({
      position: t.position || '',
      title: t.title || '',
      duration: t.duration || undefined
    }));
  
  return tracks.length > 0 ? tracks : null;
}

function processCredits(extraartists) {
  if (!extraartists || !Array.isArray(extraartists)) return null;
  
  const credits = extraartists.map(a => ({
    role: a.role || '',
    name: a.name || ''
  }));
  
  return credits.length > 0 ? credits : null;
}

function extractBarcode(identifiers) {
  if (!identifiers || !Array.isArray(identifiers)) return null;
  const barcode = identifiers.find(i => i.type === 'Barcode');
  return barcode ? barcode.value : null;
}

async function main() {
  const args = process.argv.slice(2);
  const limit = args[0] ? parseInt(args[0]) : null;
  const skipExisting = args.includes('--skip-existing');
  
  console.log('🎵 SYNC COMPLETO DE DISCOGS\n');
  console.log('Configuración:');
  console.log(`  - Límite: ${limit || 'todos'}`);
  console.log(`  - Saltar existentes: ${skipExisting}\n`);
  
  // Obtener productos
  let query = supabase
    .from('products')
    .select('id, name, slug, catalog_number, discogs_id, discogs_url, tracklist')
    .order('catalog_number');
  
  if (skipExisting) {
    query = query.is('tracklist', null);
  }
  
  if (limit) {
    query = query.limit(limit);
  }
  
  const { data: products, error } = await query;
  
  if (error) {
    console.error('Error:', error);
    process.exit(1);
  }
  
  console.log(`📦 Productos a procesar: ${products.length}\n`);
  
  let updated = 0;
  let notFound = 0;
  let errors = 0;
  let skipped = 0;
  
  for (let i = 0; i < products.length; i++) {
    const product = products[i];
    const progress = `[${i + 1}/${products.length}]`;
    
    // Si ya tiene tracklist y no queremos reprocesar
    if (product.tracklist && product.tracklist.length > 0 && skipExisting) {
      console.log(`${progress} ⏭️  ${product.name} - Ya tiene datos`);
      skipped++;
      continue;
    }
    
    try {
      let releaseId = product.discogs_id;
      
      // Si no tiene discogs_id, buscar en Discogs
      if (!releaseId) {
        console.log(`${progress} 🔍 Buscando: ${product.catalog_number} - ${product.name}`);
        
        const searchResult = await searchDiscogs(product.catalog_number, product.name);
        await sleep(DELAY_MS);
        
        if (!searchResult) {
          console.log(`         ⚠️  No encontrado en Discogs`);
          notFound++;
          continue;
        }
        
        releaseId = searchResult.id;
        console.log(`         📀 Encontrado: release/${releaseId}`);
      } else {
        console.log(`${progress} 📀 ${product.name} (release/${releaseId})`);
      }
      
      // Obtener detalles del release
      const release = await fetchReleaseDetails(releaseId);
      await sleep(DELAY_MS);
      
      const tracklist = processTracklist(release.tracklist);
      const credits = processCredits(release.extraartists);
      const barcode = extractBarcode(release.identifiers);
      const discogsUrl = `https://www.discogs.com/release/${releaseId}`;
      
      // Actualizar en Supabase
      const { error: updateError } = await supabase
        .from('products')
        .update({
          discogs_id: String(releaseId),
          discogs_url: discogsUrl,
          tracklist: tracklist,
          credits: credits,
          barcode: barcode
        })
        .eq('id', product.id);
      
      if (updateError) {
        console.log(`         ❌ Error DB: ${updateError.message}`);
        errors++;
      } else {
        const trackCount = tracklist?.length || 0;
        const creditCount = credits?.length || 0;
        console.log(`         ✅ ${trackCount} tracks, ${creditCount} credits, barcode: ${barcode || 'N/A'}`);
        updated++;
      }
      
    } catch (err) {
      console.log(`         ❌ Error: ${err.message}`);
      errors++;
      await sleep(DELAY_MS);
    }
  }
  
  console.log('\n' + '═'.repeat(60));
  console.log('📊 RESUMEN');
  console.log('═'.repeat(60));
  console.log(`✅ Actualizados:    ${updated}`);
  console.log(`⚠️  No encontrados: ${notFound}`);
  console.log(`⏭️  Saltados:       ${skipped}`);
  console.log(`❌ Errores:         ${errors}`);
  console.log('═'.repeat(60));
}

main().catch(console.error);
