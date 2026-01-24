-- =============================================
-- PRODUCTOS
-- =============================================
CREATE TABLE IF NOT EXISTS products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  catalog_number VARCHAR(50) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  brand VARCHAR(255),
  slug VARCHAR(255) UNIQUE NOT NULL,
  description TEXT,
  price DECIMAL(10,2) NOT NULL,
  year VARCHAR(10),
  label VARCHAR(255),
  genre VARCHAR(100),
  styles TEXT[],
  format VARCHAR(50),
  country VARCHAR(100),
  cover_image VARCHAR(500),
  audio_previews JSONB,
  master_file_path VARCHAR(500),
  master_file_size BIGINT,
  meta_title VARCHAR(255),
  meta_description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- PEDIDOS
-- =============================================
CREATE TABLE IF NOT EXISTS orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  stripe_session_id VARCHAR(255),
  stripe_payment_intent VARCHAR(255),
  stripe_customer_id VARCHAR(255),
  subtotal DECIMAL(10,2) NOT NULL,
  tax DECIMAL(10,2) DEFAULT 0,
  total DECIMAL(10,2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'EUR',
  status VARCHAR(50) DEFAULT 'pending',
  payment_status VARCHAR(50),
  customer_email VARCHAR(255) NOT NULL,
  customer_name VARCHAR(255),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  paid_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- ITEMS DEL PEDIDO
-- =============================================
CREATE TABLE IF NOT EXISTS order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id),
  product_name VARCHAR(255) NOT NULL,
  product_catalog_number VARCHAR(50),
  price DECIMAL(10,2) NOT NULL,
  quantity INT DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- TOKENS DE DESCARGA
-- =============================================
CREATE TABLE IF NOT EXISTS download_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_item_id UUID REFERENCES order_items(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id),
  product_id UUID REFERENCES products(id),
  token VARCHAR(255) UNIQUE NOT NULL,
  max_downloads INT DEFAULT 5,
  download_count INT DEFAULT 0,
  expires_at TIMESTAMPTZ NOT NULL,
  is_active BOOLEAN DEFAULT true,
  last_download_ip INET,
  last_download_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- REGISTRO DE DESCARGAS
-- =============================================
CREATE TABLE IF NOT EXISTS download_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  download_token_id UUID REFERENCES download_tokens(id),
  user_id UUID REFERENCES auth.users(id),
  product_id UUID REFERENCES products(id),
  ip_address INET,
  user_agent TEXT,
  downloaded_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- ACTIVIDAD DEL USUARIO
-- =============================================
CREATE TABLE IF NOT EXISTS activity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  action VARCHAR(100) NOT NULL,
  description TEXT,
  metadata JSONB,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- ÍNDICES
-- =============================================
CREATE INDEX IF NOT EXISTS idx_products_slug ON products(slug);
CREATE INDEX IF NOT EXISTS idx_products_catalog ON products(catalog_number);
CREATE INDEX IF NOT EXISTS idx_orders_user ON orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_email ON orders(customer_email);
CREATE INDEX IF NOT EXISTS idx_orders_stripe ON orders(stripe_session_id);
CREATE INDEX IF NOT EXISTS idx_download_tokens_token ON download_tokens(token);
CREATE INDEX IF NOT EXISTS idx_activity_user ON activity_log(user_id, created_at DESC);

-- =============================================
-- ROW LEVEL SECURITY (RLS)
-- =============================================

-- Productos: públicos para lectura
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Products are viewable by everyone" ON products;
CREATE POLICY "Products are viewable by everyone" ON products
  FOR SELECT USING (is_active = true);

-- Pedidos: solo el usuario propietario
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view own orders" ON orders;
CREATE POLICY "Users can view own orders" ON orders
  FOR SELECT USING (auth.uid() = user_id);

-- Items de pedido: a través del pedido
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view own order items" ON order_items;
CREATE POLICY "Users can view own order items" ON order_items
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM orders WHERE orders.id = order_items.order_id
      AND orders.user_id = auth.uid()
    )
  );

-- Tokens de descarga: solo propietario
ALTER TABLE download_tokens ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view own download tokens" ON download_tokens;
CREATE POLICY "Users can view own download tokens" ON download_tokens
  FOR SELECT USING (auth.uid() = user_id);

-- Actividad: solo propietario
ALTER TABLE activity_log ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view own activity" ON activity_log;
CREATE POLICY "Users can view own activity" ON activity_log
  FOR SELECT USING (auth.uid() = user_id);

-- =============================================
-- Políticas para INSERT (service role puede insertar)
-- =============================================
DROP POLICY IF EXISTS "Service role can insert orders" ON orders;
CREATE POLICY "Service role can insert orders" ON orders
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Service role can insert order_items" ON order_items;
CREATE POLICY "Service role can insert order_items" ON order_items
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Service role can insert download_tokens" ON download_tokens;
CREATE POLICY "Service role can insert download_tokens" ON download_tokens
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Service role can insert download_logs" ON download_logs;
CREATE POLICY "Service role can insert download_logs" ON download_logs
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Service role can insert activity_log" ON activity_log;
CREATE POLICY "Service role can insert activity_log" ON activity_log
  FOR INSERT WITH CHECK (true);

-- =============================================
-- Políticas para UPDATE
-- =============================================
DROP POLICY IF EXISTS "Service role can update download_tokens" ON download_tokens;
CREATE POLICY "Service role can update download_tokens" ON download_tokens
  FOR UPDATE USING (true);
