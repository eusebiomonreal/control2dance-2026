/**
 * Script para sincronizar datos de productos con Discogs
 * Busca en Discogs y actualiza la información en Supabase
 */

require('dotenv').config();

const DISCOGS_TOKEN = process.env.DISCOGS_TOKEN || '';
const SUPABASE_URL = process.env.PUBLIC_SUPABASE_URL || '';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || '';

// Esperar entre requests a Discogs (rate limiting)
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Buscar en Discogs por título y artista
async function searchDiscogs(query) {
  const url = `https://api.discogs.com/database/search?q=${encodeURIComponent(query)}&per_page=10&type=release`;
  
  const res = await fetch(url, {
    headers: {
      'Authorization': `Discogs token=${DISCOGS_TOKEN}`,
      'User-Agent': 'Control2DanceApp/1.0'
    }
  });
  
  if (!res.ok) {
    console.error(`Error buscando "${query}":`, res.status);
    return null;
  }
  
  return res.json();
}

// Obtener detalles de un release específico
async function getReleaseDetails(releaseId) {
  const url = `https://api.discogs.com/releases/${releaseId}`;
  
  const res = await fetch(url, {
    headers: {
      'Authorization': `Discogs token=${DISCOGS_TOKEN}`,
      'User-Agent': 'Control2DanceApp/1.0'
    }
  });
  
  if (!res.ok) {
    console.error(`Error obteniendo release ${releaseId}:`, res.status);
    return null;
  }
  
  return res.json();
}

// Obtener productos de Supabase
async function getProducts() {
  const url = `${SUPABASE_URL}/rest/v1/products?select=*&is_active=eq.true&order=catalog_number`;
  
  const res = await fetch(url, {
    headers: {
      'apikey': SUPABASE_SERVICE_KEY,
      'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`
    }
  });
  
  if (!res.ok) {
    console.error('Error obteniendo productos:', await res.text());
    return [];
  }
  
  return res.json();
}

// Actualizar producto en Supabase
async function updateProduct(productId, data) {
  const url = `${SUPABASE_URL}/rest/v1/products?id=eq.${productId}`;
  
  const res = await fetch(url, {
    method: 'PATCH',
    headers: {
      'apikey': SUPABASE_SERVICE_KEY,
      'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=minimal'
    },
    body: JSON.stringify(data)
  });
  
  if (!res.ok) {
    console.error(`Error actualizando producto ${productId}:`, await res.text());
    return false;
  }
  
  return true;
}

// Normalizar string para comparación
function normalize(str) {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
    .replace(/feat|vs|presents|dj|vol\d*/g, '');
}

// Calcular similitud entre dos strings
function similarity(str1, str2) {
  const n1 = normalize(str1);
  const n2 = normalize(str2);
  
  if (n1 === n2) return 1;
  if (n1.includes(n2) || n2.includes(n1)) return 0.8;
  
  // Contar palabras coincidentes
  const words1 = n1.match(/.{3,}/g) || [];
  const matches = words1.filter(w => n2.includes(w));
  return matches.length / Math.max(words1.length, 1);
}

// Procesar un producto
async function processProduct(product) {
  const query = `${product.name} ${product.brand}`.replace(/vol\.\d+|vol\d+/gi, '').trim();
  
  console.log(`\n🔍 Buscando: "${query}"`);
  
  const searchResults = await searchDiscogs(query);
  await delay(1000); // Rate limiting de Discogs (60 requests/min)
  
  if (!searchResults || !searchResults.results || searchResults.results.length === 0) {
    console.log('  ❌ No encontrado en Discogs');
    return null;
  }
  
  // Buscar la mejor coincidencia
  let bestMatch = null;
  let bestScore = 0;
  
  for (const result of searchResults.results.slice(0, 5)) {
    // Preferir releases españoles o de hard house/bumping
    const isSpanish = result.country === 'Spain';
    const isHardHouse = (result.style || []).some(s => 
      ['Hard House', 'Bumping', 'Makina', 'Euro House'].includes(s)
    );
    
    const titleScore = similarity(product.name, result.title.split(' - ').pop() || result.title);
    const artistScore = similarity(product.brand, result.title.split(' - ')[0] || '');
    
    let score = (titleScore * 0.5) + (artistScore * 0.3);
    if (isSpanish) score += 0.15;
    if (isHardHouse) score += 0.05;
    
    if (score > bestScore) {
      bestScore = score;
      bestMatch = result;
    }
  }
  
  if (!bestMatch || bestScore < 0.4) {
    console.log(`  ⚠️  Sin coincidencia confiable (score: ${bestScore.toFixed(2)})`);
    return null;
  }
  
  console.log(`  ✅ Encontrado: "${bestMatch.title}" (score: ${bestScore.toFixed(2)})`);
  
  // Obtener detalles completos
  const details = await getReleaseDetails(bestMatch.id);
  await delay(1000);
  
  if (!details) return null;
  
  // Extraer datos de Discogs
  const artistName = details.artists_sort || details.artists?.map(a => a.name).join(' & ') || product.brand;
  
  const updateData = {
    brand: artistName,
    year: details.year ? String(details.year) : product.year,
    country: details.country || 'Spain',
    format: details.formats?.[0]?.name === 'Vinyl' 
      ? `${details.formats[0].descriptions?.join(', ') || '12"'}`
      : details.formats?.[0]?.name || 'Digital',
    genre: details.genres?.[0] || 'Electronic',
    styles: details.styles || ['Hard House', 'Bumping']
  };
  
  // Mostrar cambios propuestos
  console.log('  📝 Cambios propuestos:');
  if (updateData.brand !== product.brand) {
    console.log(`     brand: "${product.brand}" → "${updateData.brand}"`);
  }
  if (updateData.year !== product.year) {
    console.log(`     year: "${product.year}" → "${updateData.year}"`);
  }
  if (updateData.country !== product.country) {
    console.log(`     country: "${product.country || 'null'}" → "${updateData.country}"`);
  }
  if (updateData.format !== product.format) {
    console.log(`     format: "${product.format || 'null'}" → "${updateData.format}"`);
  }
  
  return { productId: product.id, updateData, discogsId: bestMatch.id };
}

// Ejecutar sincronización
async function main() {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    console.error('❌ Falta configurar PUBLIC_SUPABASE_URL y SUPABASE_SERVICE_KEY en .env');
    process.exit(1);
  }
  
  if (!DISCOGS_TOKEN) {
    console.error('❌ Falta configurar DISCOGS_TOKEN en .env');
    process.exit(1);
  }

  console.log('🎵 Sincronizando productos con Discogs...\n');
  
  const products = await getProducts();
  console.log(`📦 ${products.length} productos encontrados en Supabase\n`);
  
  const updates = [];
  const notFound = [];
  
  // Procesar solo algunos productos como prueba (puedes cambiar el límite)
  const limit = process.argv[2] ? parseInt(process.argv[2]) : 10;
  const productsToProcess = products.slice(0, limit);
  
  console.log(`🔄 Procesando ${productsToProcess.length} productos...\n`);
  
  for (const product of productsToProcess) {
    try {
      const result = await processProduct(product);
      if (result) {
        updates.push(result);
      } else {
        notFound.push(product);
      }
    } catch (err) {
      console.error(`  ❌ Error procesando ${product.name}:`, err.message);
    }
  }
  
  // Resumen
  console.log('\n' + '='.repeat(60));
  console.log('📊 RESUMEN:');
  console.log(`   ✅ Coincidencias encontradas: ${updates.length}`);
  console.log(`   ❌ No encontrados: ${notFound.length}`);
  
  if (updates.length > 0 && process.argv.includes('--apply')) {
    console.log('\n🔧 Aplicando actualizaciones...');
    
    for (const update of updates) {
      const success = await updateProduct(update.productId, update.updateData);
      console.log(`   ${success ? '✅' : '❌'} ${update.productId}`);
    }
    
    console.log('\n✨ ¡Sincronización completada!');
  } else if (updates.length > 0) {
    console.log('\n💡 Ejecuta con --apply para aplicar los cambios:');
    console.log('   node scripts/sync_discogs.cjs 10 --apply');
  }
}

main().catch(console.error);
