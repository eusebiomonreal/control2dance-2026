const fs = require('fs');
const path = require('path');

const SUPABASE_URL = 'https://api.control2dance.es';
const SERVICE_ROLE_KEY = 'REDACTED_SERVICE_KEY';

// Función para crear slug desde nombre
function createSlug(name, brand) {
  const base = `${brand || ''}-${name}`.toLowerCase()
    .replace(/[áàäâ]/g, 'a')
    .replace(/[éèëê]/g, 'e')
    .replace(/[íìïî]/g, 'i')
    .replace(/[óòöô]/g, 'o')
    .replace(/[úùüû]/g, 'u')
    .replace(/ñ/g, 'n')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return base;
}

// Función para ejecutar SQL
async function executeSQL(query) {
  const response = await fetch(`${SUPABASE_URL}/pg/query`, {
    method: 'POST',
    headers: {
      'apikey': SERVICE_ROLE_KEY,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ query })
  });
  return response.json();
}

// Función para escapar strings para SQL
function escapeSQL(str) {
  if (str === null || str === undefined) return 'NULL';
  return `'${String(str).replace(/'/g, "''")}'`;
}

async function importProducts() {
  console.log('🚀 Importando productos a Supabase...\n');

  // Leer products.json
  const productsPath = path.join(__dirname, '../public/products.json');
  const products = JSON.parse(fs.readFileSync(productsPath, 'utf-8'));

  console.log(`📦 ${products.length} productos encontrados\n`);

  let success = 0;
  let failed = 0;

  for (const product of products) {
    try {
      const slug = createSlug(product.name, product.brand);
      const catalogNumber = product.catalogNumber || `C2D-${product.id}`;
      
      // Preparar audio_previews como JSONB
      const audioPreviews = product.audioUrls ? JSON.stringify(product.audioUrls) : null;
      
      // Preparar styles como array PostgreSQL
      const stylesArray = product.styles && product.styles.length > 0 
        ? `ARRAY[${product.styles.map(s => escapeSQL(s)).join(',')}]::TEXT[]`
        : 'NULL';

      const query = `
        INSERT INTO products (
          catalog_number, name, brand, slug, description, price,
          year, label, genre, styles, cover_image, audio_previews,
          is_active, created_at, updated_at
        ) VALUES (
          ${escapeSQL(catalogNumber)},
          ${escapeSQL(product.name)},
          ${escapeSQL(product.brand)},
          ${escapeSQL(slug)},
          ${escapeSQL(product.description)},
          ${product.price || 3.99},
          ${escapeSQL(product.year)},
          ${escapeSQL(product.label || 'Control2Dance Records')},
          ${escapeSQL(product.genre || 'Electronic')},
          ${stylesArray},
          ${escapeSQL(product.image)},
          ${audioPreviews ? escapeSQL(audioPreviews) : 'NULL'},
          true,
          NOW(),
          NOW()
        )
        ON CONFLICT (catalog_number) DO UPDATE SET
          name = EXCLUDED.name,
          brand = EXCLUDED.brand,
          description = EXCLUDED.description,
          price = EXCLUDED.price,
          cover_image = EXCLUDED.cover_image,
          audio_previews = EXCLUDED.audio_previews,
          updated_at = NOW();
      `;

      const result = await executeSQL(query);
      
      if (result.error) {
        console.log(`❌ ${product.name}: ${result.error}`);
        failed++;
      } else {
        console.log(`✅ ${catalogNumber} - ${product.name}`);
        success++;
      }
    } catch (error) {
      console.log(`❌ ${product.name}: ${error.message}`);
      failed++;
    }
  }

  console.log('\n' + '='.repeat(50));
  console.log(`✅ Éxito: ${success}`);
  console.log(`❌ Fallidos: ${failed}`);
  console.log('='.repeat(50));

  // Verificar total en DB
  const countResult = await executeSQL('SELECT COUNT(*) as total FROM products;');
  console.log(`\n📊 Total productos en DB: ${countResult[0]?.total || 0}`);
}

importProducts().catch(console.error);
