const crypto = require('crypto');

// Generar nuevo JWT_SECRET
const JWT_SECRET = crypto.randomBytes(32).toString('base64');

// Helper para crear JWT manualmente (sin dependencias)
function base64url(str) {
  return Buffer.from(str).toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

function createJWT(payload, secret) {
  const header = { alg: 'HS256', typ: 'JWT' };
  const headerB64 = base64url(JSON.stringify(header));
  const payloadB64 = base64url(JSON.stringify(payload));
  const signature = crypto.createHmac('sha256', secret)
    .update(headerB64 + '.' + payloadB64)
    .digest('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
  return headerB64 + '.' + payloadB64 + '.' + signature;
}

const now = Math.floor(Date.now() / 1000);
const exp = now + (10 * 365 * 24 * 60 * 60); // 10 years

const anonPayload = {
  iat: now,
  exp: exp,
  role: 'anon',
  iss: 'supabase'
};

const servicePayload = {
  iat: now,
  exp: exp,
  role: 'service_role',
  iss: 'supabase'
};

const ANON_KEY = createJWT(anonPayload, JWT_SECRET);
const SERVICE_ROLE_KEY = createJWT(servicePayload, JWT_SECRET);

console.log('========================================');
console.log('NUEVAS CLAVES JWT PARA SUPABASE');
console.log('========================================');
console.log('');
console.log('# Para el Environment de Supabase (Dokploy):');
console.log('JWT_SECRET=' + JWT_SECRET);
console.log('');
console.log('ANON_KEY=' + ANON_KEY);
console.log('');
console.log('SERVICE_ROLE_KEY=' + SERVICE_ROLE_KEY);
console.log('');
console.log('========================================');
console.log('# Para el .env de la app Astro:');
console.log('========================================');
console.log('PUBLIC_SUPABASE_ANON_KEY=' + ANON_KEY);
console.log('SUPABASE_SERVICE_KEY=' + SERVICE_ROLE_KEY);
console.log('========================================');
