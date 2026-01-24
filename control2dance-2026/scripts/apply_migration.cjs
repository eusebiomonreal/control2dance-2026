const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const SUPABASE_URL = 'https://api.control2dance.es';
const SERVICE_ROLE_KEY = 'REDACTED_SERVICE_KEY';

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function applyMigration() {
  console.log('🚀 Aplicando migración a Supabase self-hosted...');
  console.log(`📍 URL: ${SUPABASE_URL}`);

  // Leer el archivo de migración
  const migrationPath = path.join(__dirname, '../supabase/migrations/001_initial_schema.sql');
  const sql = fs.readFileSync(migrationPath, 'utf-8');

  console.log('\n📄 Archivo de migración cargado');

  // Supabase JS no permite ejecutar SQL directo sin la función rpc
  // Necesitamos usar la API REST de PostgreSQL
  
  // Dividir en statements individuales
  const statements = sql
    .split(/;(?=\s*(?:--|CREATE|ALTER|DROP|INSERT|UPDATE|DELETE|$))/i)
    .map(s => s.trim())
    .filter(s => s && !s.startsWith('--'));

  console.log(`\n📝 ${statements.length} statements a ejecutar`);
  console.log('\n⚠️  Para ejecutar SQL directamente, necesitas acceder a la base de datos.');
  console.log('   Usa el Studio de Supabase o ejecuta el SQL manualmente.\n');

  // Guardar SQL en un archivo listo para copiar
  const outputPath = path.join(__dirname, '../migration_ready.sql');
  fs.writeFileSync(outputPath, sql);
  console.log(`✅ SQL guardado en: ${outputPath}`);
  console.log('\n📋 Pasos para aplicar la migración:');
  console.log('   1. Abre tu Studio de Supabase');
  console.log('   2. Ve a SQL Editor');
  console.log('   3. Copia y pega el contenido de migration_ready.sql');
  console.log('   4. Ejecuta la query');
}

applyMigration().catch(console.error);
