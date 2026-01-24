# Plan de Migración: Control2Dance WordPress → Astro

## Resumen Ejecutivo

Migración de la tienda de masters digitales desde WordPress + Easy Digital Downloads hacia una arquitectura moderna con Astro + Supabase + Stripe, desplegada en Dokploy.

---

## 1. Arquitectura Propuesta

```
┌─────────────────────────────────────────────────────────────────┐
│                         FRONTEND                                 │
│                    Astro + React (SSR)                          │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────────────┐│
│  │  Landing │  │ Catálogo │  │ Checkout │  │ Customer         ││
│  │   Page   │  │ Productos│  │  Stripe  │  │ Dashboard        ││
│  └──────────┘  └──────────┘  └──────────┘  └──────────────────┘│
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                         BACKEND                                  │
│  ┌──────────────────┐    ┌──────────────────────────────────┐  │
│  │  Supabase Auth   │    │        Supabase Database         │  │
│  │  - Email/Pass    │    │  - users (auth)                  │  │
│  │  - Magic Link    │    │  - products                      │  │
│  │  - OAuth Google  │    │  - orders                        │  │
│  └──────────────────┘    │  - order_items                   │  │
│                          │  - download_tokens               │  │
│  ┌──────────────────┐    │  - activity_log                  │  │
│  │ Supabase Storage │    └──────────────────────────────────┘  │
│  │  - WAV Masters   │                                          │
│  │  - Signed URLs   │    ┌──────────────────────────────────┐  │
│  │  - Access Rules  │    │     Supabase Edge Functions      │  │
│  └──────────────────┘    │  - Stripe webhooks               │  │
│                          │  - Download validation           │  │
│                          │  - Email notifications           │  │
│                          └──────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                     SERVICIOS EXTERNOS                           │
│  ┌──────────────┐  ┌──────────────┐  ┌────────────────────────┐│
│  │    Stripe    │  │   Resend     │  │      Dokploy           ││
│  │  - Checkout  │  │   (emails)   │  │  - Docker deployment   ││
│  │  - Webhooks  │  │              │  │  - SSL/HTTPS           ││
│  │  - Portal    │  │              │  │  - Auto-scaling        ││
│  └──────────────┘  └──────────────┘  └────────────────────────┘│
└─────────────────────────────────────────────────────────────────┘
```

---

## 2. Schema de Base de Datos (Supabase)

```sql
-- =============================================
-- PRODUCTOS
-- =============================================
CREATE TABLE products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  catalog_number VARCHAR(50) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  brand VARCHAR(255),
  slug VARCHAR(255) UNIQUE NOT NULL,
  description TEXT,
  price DECIMAL(10,2) NOT NULL,

  -- Metadata del disco
  year VARCHAR(10),
  label VARCHAR(255),
  genre VARCHAR(100),
  styles TEXT[], -- Array de estilos
  format VARCHAR(50),
  country VARCHAR(100),

  -- Media
  cover_image VARCHAR(500),
  audio_previews JSONB, -- [{url, track_name, duration}]

  -- Archivo master (protegido)
  master_file_path VARCHAR(500), -- Ruta en Supabase Storage
  master_file_size BIGINT,

  -- SEO
  meta_title VARCHAR(255),
  meta_description TEXT,

  -- Control
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- PEDIDOS
-- =============================================
CREATE TABLE orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),

  -- Stripe
  stripe_session_id VARCHAR(255),
  stripe_payment_intent VARCHAR(255),
  stripe_customer_id VARCHAR(255),

  -- Totales
  subtotal DECIMAL(10,2) NOT NULL,
  tax DECIMAL(10,2) DEFAULT 0,
  total DECIMAL(10,2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'EUR',

  -- Estado
  status VARCHAR(50) DEFAULT 'pending', -- pending, paid, failed, refunded
  payment_status VARCHAR(50),

  -- Cliente (para usuarios no registrados)
  customer_email VARCHAR(255) NOT NULL,
  customer_name VARCHAR(255),

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  paid_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- ITEMS DEL PEDIDO
-- =============================================
CREATE TABLE order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id),

  -- Snapshot del producto al momento de compra
  product_name VARCHAR(255) NOT NULL,
  product_catalog_number VARCHAR(50),
  price DECIMAL(10,2) NOT NULL,
  quantity INT DEFAULT 1,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- TOKENS DE DESCARGA (Crítico para protección)
-- =============================================
CREATE TABLE download_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_item_id UUID REFERENCES order_items(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id),
  product_id UUID REFERENCES products(id),

  -- Token único para descarga
  token VARCHAR(255) UNIQUE NOT NULL,

  -- Límites de descarga
  max_downloads INT DEFAULT 5,
  download_count INT DEFAULT 0,

  -- Validez
  expires_at TIMESTAMPTZ NOT NULL,
  is_active BOOLEAN DEFAULT true,

  -- IP tracking (seguridad)
  last_download_ip INET,
  last_download_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- REGISTRO DE DESCARGAS
-- =============================================
CREATE TABLE download_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  download_token_id UUID REFERENCES download_tokens(id),
  user_id UUID REFERENCES auth.users(id),
  product_id UUID REFERENCES products(id),

  ip_address INET,
  user_agent TEXT,

  downloaded_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- ACTIVIDAD DEL USUARIO (Dashboard)
-- =============================================
CREATE TABLE activity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,

  action VARCHAR(100) NOT NULL, -- 'login', 'purchase', 'download', 'password_change'
  description TEXT,
  metadata JSONB,

  ip_address INET,
  user_agent TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- MIGRACIÓN DE USUARIOS WP
-- =============================================
CREATE TABLE wp_user_migration (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wp_user_id INT,
  wp_email VARCHAR(255),
  supabase_user_id UUID REFERENCES auth.users(id),
  migrated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- ÍNDICES
-- =============================================
CREATE INDEX idx_products_slug ON products(slug);
CREATE INDEX idx_products_catalog ON products(catalog_number);
CREATE INDEX idx_orders_user ON orders(user_id);
CREATE INDEX idx_orders_email ON orders(customer_email);
CREATE INDEX idx_orders_stripe ON orders(stripe_session_id);
CREATE INDEX idx_download_tokens_token ON download_tokens(token);
CREATE INDEX idx_activity_user ON activity_log(user_id, created_at DESC);

-- =============================================
-- ROW LEVEL SECURITY (RLS)
-- =============================================

-- Productos: públicos para lectura
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Products are viewable by everyone" ON products
  FOR SELECT USING (is_active = true);

-- Pedidos: solo el usuario propietario
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own orders" ON orders
  FOR SELECT USING (auth.uid() = user_id);

-- Items de pedido: a través del pedido
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own order items" ON order_items
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM orders WHERE orders.id = order_items.order_id
      AND orders.user_id = auth.uid()
    )
  );

-- Tokens de descarga: solo propietario
ALTER TABLE download_tokens ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own download tokens" ON download_tokens
  FOR SELECT USING (auth.uid() = user_id);

-- Actividad: solo propietario
ALTER TABLE activity_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own activity" ON activity_log
  FOR SELECT USING (auth.uid() = user_id);
```

---

## 3. Estructura de Carpetas Propuesta

```
astro-app/
├── src/
│   ├── pages/
│   │   ├── index.astro                 # Landing
│   │   ├── catalogo/
│   │   │   ├── index.astro             # Lista productos
│   │   │   └── [slug].astro            # Detalle producto (SEO)
│   │   ├── checkout/
│   │   │   ├── index.astro             # Resumen + Stripe
│   │   │   └── success.astro           # Post-pago
│   │   ├── auth/
│   │   │   ├── login.astro
│   │   │   ├── register.astro
│   │   │   ├── forgot-password.astro
│   │   │   └── callback.astro          # OAuth callback
│   │   ├── dashboard/
│   │   │   ├── index.astro             # Resumen cuenta
│   │   │   ├── orders.astro            # Historial pedidos
│   │   │   ├── downloads.astro         # Mis descargas
│   │   │   ├── activity.astro          # Actividad reciente
│   │   │   └── settings.astro          # Configuración
│   │   ├── download/
│   │   │   └── [token].astro           # Descarga protegida
│   │   └── api/
│   │       ├── stripe/
│   │       │   ├── create-session.ts   # Crear checkout
│   │       │   └── webhook.ts          # Procesar pagos
│   │       ├── download/
│   │       │   └── validate.ts         # Validar token
│   │       └── auth/
│   │           └── activity.ts         # Log actividad
│   │
│   ├── components/
│   │   ├── auth/
│   │   │   ├── LoginForm.tsx
│   │   │   ├── RegisterForm.tsx
│   │   │   ├── AuthGuard.tsx           # Proteger rutas
│   │   │   └── UserMenu.tsx
│   │   ├── dashboard/
│   │   │   ├── DashboardLayout.tsx
│   │   │   ├── OrderHistory.tsx
│   │   │   ├── DownloadsList.tsx
│   │   │   ├── ActivityFeed.tsx
│   │   │   └── AccountStats.tsx
│   │   ├── checkout/
│   │   │   ├── CheckoutForm.tsx
│   │   │   └── OrderSummary.tsx
│   │   └── ... (existentes)
│   │
│   ├── lib/
│   │   ├── supabase.ts                 # Cliente Supabase
│   │   ├── stripe.ts                   # Cliente Stripe
│   │   └── auth.ts                     # Helpers auth
│   │
│   ├── stores/
│   │   ├── authStore.ts                # Estado autenticación
│   │   └── ... (existentes)
│   │
│   └── middleware/
│       └── auth.ts                     # Middleware Astro
│
├── supabase/
│   ├── migrations/
│   │   └── 001_initial_schema.sql
│   └── functions/
│       ├── stripe-webhook/
│       │   └── index.ts
│       └── generate-download-url/
│           └── index.ts
│
└── docker/
    ├── Dockerfile
    └── docker-compose.yml
```

---

## 4. Flujo de Compra y Descarga Protegida

```
┌─────────────────────────────────────────────────────────────────┐
│                    FLUJO DE COMPRA                               │
└─────────────────────────────────────────────────────────────────┘

1. AÑADIR AL CARRITO
   Usuario → Añade productos → cartStore (local)

2. CHECKOUT
   Usuario → Click "Pagar" →
   POST /api/stripe/create-session
   {
     items: [...],
     customer_email: "...",
     success_url: "/checkout/success?session_id={CHECKOUT_SESSION_ID}",
     cancel_url: "/checkout"
   }

3. STRIPE CHECKOUT
   Redirect → Stripe Hosted Checkout → Pago con tarjeta

4. WEBHOOK (Automático)
   Stripe → POST /api/stripe/webhook
   Event: checkout.session.completed

   → Crear order en Supabase
   → Crear order_items
   → Generar download_tokens (1 por producto)
   → Enviar email con links de descarga
   → Log actividad

5. SUCCESS PAGE
   Usuario → /checkout/success?session_id=xxx
   → Mostrar confirmación
   → Links de descarga inmediatos

┌─────────────────────────────────────────────────────────────────┐
│                    FLUJO DE DESCARGA PROTEGIDA                   │
└─────────────────────────────────────────────────────────────────┘

1. ACCESO AL LINK
   Usuario → /download/{token}

2. VALIDACIÓN (API)
   → Verificar token existe
   → Verificar token no expirado
   → Verificar download_count < max_downloads
   → Verificar user_id coincide (si logueado)

3. GENERACIÓN URL FIRMADA
   → Supabase Storage: createSignedUrl()
   → URL válida por 60 segundos
   → Log descarga en download_logs
   → Incrementar download_count

4. DESCARGA
   → Redirect a signed URL
   → Usuario descarga WAV
   → URL expira

┌─────────────────────────────────────────────────────────────────┐
│                    PROTECCIÓN MULTI-CAPA                         │
└─────────────────────────────────────────────────────────────────┘

Capa 1: Token único por compra
  - UUID v4 no predecible
  - Asociado a order_item específico

Capa 2: Límite de descargas
  - Máximo 5 descargas por token
  - Configurable por producto

Capa 3: Expiración temporal
  - Token válido 30 días desde compra
  - Extensible manualmente (soporte)

Capa 4: Signed URLs
  - URLs de Supabase Storage firmadas
  - Expiran en 60 segundos
  - No se pueden compartir

Capa 5: IP Tracking
  - Log de IPs de descarga
  - Alertas si muchas IPs diferentes

Capa 6: RLS en Supabase
  - Políticas a nivel de fila
  - Solo acceso a datos propios
```

---

## 5. Migración SEO

### 5.1 Mapeo de URLs

```
WORDPRESS (actual)                    ASTRO (nuevo)
─────────────────────────────────────────────────────────────────
/                                  →  /
/tienda/                           →  /catalogo/
/descargas/{slug}/                 →  /catalogo/{slug}/
/mi-cuenta/                        →  /dashboard/
/mi-cuenta/pedidos/                →  /dashboard/orders/
/mi-cuenta/descargas/              →  /dashboard/downloads/
/carrito/                          →  /checkout/
/finalizar-compra/                 →  /checkout/
```

### 5.2 Redirects 301 (astro.config.mjs)

```javascript
export default defineConfig({
  redirects: {
    '/tienda': '/catalogo',
    '/tienda/': '/catalogo/',
    '/descargas/[...slug]': '/catalogo/[...slug]',
    '/mi-cuenta': '/dashboard',
    '/mi-cuenta/pedidos': '/dashboard/orders',
    '/mi-cuenta/descargas': '/dashboard/downloads',
    '/carrito': '/checkout',
    '/finalizar-compra': '/checkout',
    // Redirects específicos de productos
    '/descargas/da-nu-style-vol-4-chris-maxxx': '/catalogo/da-nu-style-vol-4-chris-maxxx',
    // ... más productos
  }
});
```

### 5.3 Meta Tags Dinámicos

```astro
---
// src/pages/catalogo/[slug].astro
const { slug } = Astro.params;
const product = await getProductBySlug(slug);
---

<html>
<head>
  <title>{product.name} | Control2Dance Records</title>
  <meta name="description" content={product.meta_description || product.description} />

  <!-- Open Graph -->
  <meta property="og:title" content={product.name} />
  <meta property="og:description" content={product.description} />
  <meta property="og:image" content={product.cover_image} />
  <meta property="og:type" content="product" />
  <meta property="og:url" content={`https://control2dance.es/catalogo/${slug}`} />

  <!-- Twitter -->
  <meta name="twitter:card" content="summary_large_image" />

  <!-- Structured Data -->
  <script type="application/ld+json">
    {JSON.stringify({
      "@context": "https://schema.org",
      "@type": "Product",
      "name": product.name,
      "description": product.description,
      "image": product.cover_image,
      "brand": {
        "@type": "Brand",
        "name": product.brand
      },
      "offers": {
        "@type": "Offer",
        "price": product.price,
        "priceCurrency": "EUR",
        "availability": "https://schema.org/InStock"
      },
      "sku": product.catalog_number
    })}
  </script>
</head>
```

### 5.4 Sitemap Dinámico

```typescript
// src/pages/sitemap.xml.ts
import { getProducts } from '../lib/supabase';

export async function GET() {
  const products = await getProducts();

  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://control2dance.es/</loc>
    <changefreq>weekly</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>https://control2dance.es/catalogo/</loc>
    <changefreq>daily</changefreq>
    <priority>0.9</priority>
  </url>
  ${products.map(p => `
  <url>
    <loc>https://control2dance.es/catalogo/${p.slug}/</loc>
    <lastmod>${p.updated_at}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.8</priority>
  </url>`).join('')}
</urlset>`;

  return new Response(sitemap, {
    headers: { 'Content-Type': 'application/xml' }
  });
}
```

---

## 6. Dashboard del Cliente

### 6.1 Componentes

```typescript
// AccountStats.tsx - Resumen de cuenta
interface AccountStats {
  totalOrders: number;
  totalSpent: number;
  totalDownloads: number;
  availableDownloads: number;
  memberSince: Date;
}

// OrderHistory.tsx - Historial de pedidos
interface OrderWithItems {
  id: string;
  created_at: Date;
  total: number;
  status: 'pending' | 'paid' | 'failed' | 'refunded';
  items: {
    product_name: string;
    price: number;
    download_token: string;
    downloads_remaining: number;
  }[];
}

// ActivityFeed.tsx - Actividad reciente
interface ActivityItem {
  id: string;
  action: 'login' | 'purchase' | 'download' | 'password_change';
  description: string;
  created_at: Date;
  metadata: {
    product_name?: string;
    order_total?: number;
    ip_address?: string;
  };
}
```

### 6.2 Layout del Dashboard

```
┌─────────────────────────────────────────────────────────────────┐
│  HEADER: Logo | Catálogo | [Avatar ▼]                           │
├───────────────┬─────────────────────────────────────────────────┤
│               │                                                  │
│  SIDEBAR      │  CONTENIDO PRINCIPAL                            │
│               │                                                  │
│  ┌─────────┐  │  ┌─────────────────────────────────────────┐   │
│  │ Resumen │  │  │  Bienvenido, {nombre}                   │   │
│  ├─────────┤  │  │                                         │   │
│  │ Pedidos │  │  │  ┌─────────┐ ┌─────────┐ ┌─────────┐   │   │
│  ├─────────┤  │  │  │ Pedidos │ │ Gastado │ │ Descargas│   │   │
│  │Descargas│  │  │  │   12    │ │  €47.88 │ │    45    │   │   │
│  ├─────────┤  │  │  └─────────┘ └─────────┘ └─────────┘   │   │
│  │Actividad│  │  │                                         │   │
│  ├─────────┤  │  │  ACTIVIDAD RECIENTE                     │   │
│  │ Ajustes │  │  │  ┌─────────────────────────────────┐   │   │
│  └─────────┘  │  │  │ 🔐 Inicio de sesión - hace 2h   │   │   │
│               │  │  │ 📥 Descarga: Da Nu Style Vol 4  │   │   │
│               │  │  │ 💳 Compra: €3.99 - hace 1 día   │   │   │
│               │  │  └─────────────────────────────────┘   │   │
│               │  └─────────────────────────────────────────┘   │
│               │                                                  │
└───────────────┴─────────────────────────────────────────────────┘
```

---

## 7. Configuración Stripe

### 7.1 Productos en Stripe

```javascript
// Sincronizar productos con Stripe
async function syncProductToStripe(product) {
  // Crear o actualizar producto
  const stripeProduct = await stripe.products.upsert({
    id: `prod_${product.catalog_number}`,
    name: product.name,
    description: product.description,
    images: [product.cover_image],
    metadata: {
      catalog_number: product.catalog_number,
      supabase_id: product.id
    }
  });

  // Crear precio
  const price = await stripe.prices.create({
    product: stripeProduct.id,
    unit_amount: Math.round(product.price * 100), // Céntimos
    currency: 'eur',
    metadata: {
      supabase_product_id: product.id
    }
  });

  return { stripeProduct, price };
}
```

### 7.2 Checkout Session

```typescript
// src/pages/api/stripe/create-session.ts
import Stripe from 'stripe';

const stripe = new Stripe(import.meta.env.STRIPE_SECRET_KEY);

export async function POST({ request }) {
  const { items, customerEmail } = await request.json();

  const lineItems = items.map(item => ({
    price_data: {
      currency: 'eur',
      product_data: {
        name: item.name,
        description: item.catalog_number,
        images: [item.image],
        metadata: {
          product_id: item.id
        }
      },
      unit_amount: Math.round(item.price * 100),
    },
    quantity: item.quantity,
  }));

  const session = await stripe.checkout.sessions.create({
    payment_method_types: ['card'],
    line_items: lineItems,
    mode: 'payment',
    customer_email: customerEmail,
    success_url: `${import.meta.env.PUBLIC_SITE_URL}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${import.meta.env.PUBLIC_SITE_URL}/checkout`,
    metadata: {
      product_ids: items.map(i => i.id).join(',')
    }
  });

  return new Response(JSON.stringify({ sessionId: session.id }), {
    headers: { 'Content-Type': 'application/json' }
  });
}
```

### 7.3 Webhook Handler

```typescript
// src/pages/api/stripe/webhook.ts
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';
import { nanoid } from 'nanoid';

const stripe = new Stripe(import.meta.env.STRIPE_SECRET_KEY);
const supabase = createClient(
  import.meta.env.SUPABASE_URL,
  import.meta.env.SUPABASE_SERVICE_KEY
);

export async function POST({ request }) {
  const body = await request.text();
  const sig = request.headers.get('stripe-signature');

  let event;
  try {
    event = stripe.webhooks.constructEvent(
      body,
      sig,
      import.meta.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    return new Response(`Webhook Error: ${err.message}`, { status: 400 });
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;

    // 1. Crear orden
    const { data: order } = await supabase
      .from('orders')
      .insert({
        stripe_session_id: session.id,
        stripe_payment_intent: session.payment_intent,
        customer_email: session.customer_email,
        total: session.amount_total / 100,
        status: 'paid',
        paid_at: new Date().toISOString()
      })
      .select()
      .single();

    // 2. Obtener line items de Stripe
    const lineItems = await stripe.checkout.sessions.listLineItems(session.id);

    // 3. Crear order_items y download_tokens
    for (const item of lineItems.data) {
      const productId = item.price.product.metadata.product_id;

      // Crear order_item
      const { data: orderItem } = await supabase
        .from('order_items')
        .insert({
          order_id: order.id,
          product_id: productId,
          product_name: item.description,
          price: item.amount_total / 100,
          quantity: item.quantity
        })
        .select()
        .single();

      // Crear download_token
      await supabase
        .from('download_tokens')
        .insert({
          order_item_id: orderItem.id,
          product_id: productId,
          token: nanoid(32),
          max_downloads: 5,
          expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 días
        });
    }

    // 4. Enviar email de confirmación
    await sendOrderConfirmationEmail(order.id);
  }

  return new Response(JSON.stringify({ received: true }));
}
```

---

## 8. Despliegue en Dokploy

### 8.1 Dockerfile

```dockerfile
# Dockerfile
FROM node:20-alpine AS builder

WORKDIR /app
COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# Production
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=4321

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./

EXPOSE 4321

CMD ["node", "./dist/server/entry.mjs"]
```

### 8.2 docker-compose.yml (desarrollo local)

```yaml
version: '3.8'

services:
  app:
    build: .
    ports:
      - "4321:4321"
    environment:
      - PUBLIC_SUPABASE_URL=${PUBLIC_SUPABASE_URL}
      - PUBLIC_SUPABASE_ANON_KEY=${PUBLIC_SUPABASE_ANON_KEY}
      - SUPABASE_SERVICE_KEY=${SUPABASE_SERVICE_KEY}
      - STRIPE_SECRET_KEY=${STRIPE_SECRET_KEY}
      - STRIPE_WEBHOOK_SECRET=${STRIPE_WEBHOOK_SECRET}
      - PUBLIC_STRIPE_PUBLISHABLE_KEY=${PUBLIC_STRIPE_PUBLISHABLE_KEY}
      - PUBLIC_SITE_URL=${PUBLIC_SITE_URL}
    volumes:
      - ./public/audio:/app/dist/client/audio:ro

  # Para desarrollo con Supabase local
  supabase-db:
    image: supabase/postgres:15.1.0.117
    ports:
      - "5432:5432"
    environment:
      POSTGRES_PASSWORD: postgres
    volumes:
      - supabase-db:/var/lib/postgresql/data

volumes:
  supabase-db:
```

### 8.3 Variables de Entorno (Dokploy)

```env
# Supabase
PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...
SUPABASE_SERVICE_KEY=eyJhbGc...  # Solo servidor

# Stripe
PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...

# App
PUBLIC_SITE_URL=https://control2dance.es
NODE_ENV=production
```

---

## 9. Plan de Migración por Fases

### FASE 1: Infraestructura (Semana 1)
- [ ] Crear proyecto Supabase
- [ ] Configurar schema de base de datos
- [ ] Configurar Storage buckets
- [ ] Crear cuenta Stripe y configurar productos
- [ ] Configurar Dokploy

### FASE 2: Autenticación (Semana 2)
- [ ] Implementar Supabase Auth en Astro
- [ ] Crear páginas login/register
- [ ] Implementar AuthGuard
- [ ] Migrar usuarios de WordPress (export/import)

### FASE 3: E-commerce (Semana 3-4)
- [ ] Integrar Stripe Checkout
- [ ] Implementar webhooks
- [ ] Sistema de tokens de descarga
- [ ] Página de descarga protegida
- [ ] Emails transaccionales

### FASE 4: Dashboard (Semana 5)
- [ ] Layout dashboard
- [ ] Historial de pedidos
- [ ] Lista de descargas
- [ ] Feed de actividad
- [ ] Configuración de cuenta

### FASE 5: SEO y Migración (Semana 6)
- [ ] Migrar productos a Supabase
- [ ] Configurar redirects 301
- [ ] Implementar meta tags dinámicos
- [ ] Generar sitemap
- [ ] Subir WAV masters a Storage

### FASE 6: Testing y Launch (Semana 7)
- [ ] Testing completo del flujo de compra
- [ ] Testing de descargas protegidas
- [ ] Performance testing
- [ ] Configurar dominio en Dokploy
- [ ] Cambiar DNS
- [ ] Monitoreo post-launch

---

## 10. Migración de Datos desde WordPress

### 10.1 Script de Exportación (WordPress)

```php
<?php
// wp-export-data.php
// Ejecutar en WordPress para exportar datos

require_once('wp-load.php');

// Exportar usuarios
$users = get_users();
$users_export = array_map(function($user) {
    return [
        'wp_id' => $user->ID,
        'email' => $user->user_email,
        'name' => $user->display_name,
        'registered' => $user->user_registered
    ];
}, $users);
file_put_contents('users_export.json', json_encode($users_export, JSON_PRETTY_PRINT));

// Exportar pedidos (EDD)
$orders = edd_get_payments(['number' => -1]);
$orders_export = array_map(function($order) {
    $items = edd_get_payment_meta_downloads($order->ID);
    return [
        'wp_id' => $order->ID,
        'email' => edd_get_payment_user_email($order->ID),
        'total' => edd_get_payment_amount($order->ID),
        'status' => $order->post_status,
        'date' => $order->post_date,
        'items' => $items
    ];
}, $orders);
file_put_contents('orders_export.json', json_encode($orders_export, JSON_PRETTY_PRINT));

echo "Exportación completada!";
```

### 10.2 Script de Importación (Node.js → Supabase)

```javascript
// import-to-supabase.js
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function importUsers() {
  const users = JSON.parse(fs.readFileSync('users_export.json'));

  for (const wpUser of users) {
    // Crear usuario en Supabase Auth
    const { data: authUser, error } = await supabase.auth.admin.createUser({
      email: wpUser.email,
      email_confirm: true,
      user_metadata: {
        name: wpUser.name,
        wp_id: wpUser.wp_id
      }
    });

    if (!error) {
      // Guardar mapeo
      await supabase.from('wp_user_migration').insert({
        wp_user_id: wpUser.wp_id,
        wp_email: wpUser.email,
        supabase_user_id: authUser.user.id
      });
    }
  }
}

async function importProducts() {
  const products = JSON.parse(fs.readFileSync('products.json'));

  for (const product of products) {
    await supabase.from('products').insert({
      catalog_number: product.catalogNumber,
      name: product.name,
      brand: product.brand,
      slug: product.name.toLowerCase().replace(/\s+/g, '-'),
      description: product.description,
      price: product.price,
      year: product.year,
      label: product.label,
      genre: product.genre,
      styles: product.styles,
      cover_image: product.image,
      audio_previews: product.audioUrls.map((url, i) => ({
        url,
        track_name: product.tracks?.[i] || `Track ${i + 1}`
      }))
    });
  }
}

importUsers().then(() => importProducts());
```

---

## 11. Checklist Pre-Launch

### Seguridad
- [ ] Variables de entorno configuradas (no hardcodeadas)
- [ ] RLS habilitado en todas las tablas
- [ ] CORS configurado correctamente
- [ ] Rate limiting en endpoints críticos
- [ ] Validación de tokens de descarga
- [ ] HTTPS forzado

### SEO
- [ ] Redirects 301 configurados
- [ ] Meta tags en todas las páginas
- [ ] Sitemap generado
- [ ] robots.txt configurado
- [ ] Google Search Console verificado
- [ ] Schema.org implementado

### Pagos
- [ ] Stripe en modo live
- [ ] Webhook endpoint configurado
- [ ] Emails transaccionales funcionando
- [ ] Política de reembolsos definida

### Performance
- [ ] Imágenes optimizadas
- [ ] Assets cacheados
- [ ] Lazy loading implementado
- [ ] Core Web Vitals optimizados

### Backup
- [ ] Backup de WordPress completo
- [ ] Backup de base de datos
- [ ] WAV masters respaldados
- [ ] Plan de rollback definido

---

## 12. Costes Estimados Mensuales

| Servicio | Plan | Coste |
|----------|------|-------|
| Supabase | Pro | $25/mes |
| Stripe | Pay as you go | 1.4% + 0.25€ por transacción |
| Dokploy/VPS | 4GB RAM | ~€10-20/mes |
| Resend (emails) | Free tier | €0 (hasta 3k emails/mes) |
| Dominio | Renovación | ~€12/año |
| **TOTAL** | | **~€40-50/mes** + comisiones Stripe |

---

## Próximos Pasos

1. **Revisar y aprobar** este plan
2. **Crear proyecto Supabase** en supabase.com
3. **Configurar cuenta Stripe** (si no existe)
4. **Empezar Fase 1**: Infraestructura

¿Quieres que empiece con alguna fase específica?
