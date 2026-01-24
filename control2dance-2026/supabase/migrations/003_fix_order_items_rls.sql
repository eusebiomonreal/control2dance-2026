-- Fix RLS policies for order_items and download_tokens joins

-- order_items: acceso a través del pedido del usuario
DROP POLICY IF EXISTS "Users can view own order items" ON order_items;
CREATE POLICY "Users can view own order items" ON order_items
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM orders 
      WHERE orders.id = order_items.order_id
      AND orders.user_id = auth.uid()
    )
  );

-- download_tokens: acceso a través del order_item del pedido del usuario
DROP POLICY IF EXISTS "Users can view own download tokens" ON download_tokens;
CREATE POLICY "Users can view own download tokens" ON download_tokens
  FOR SELECT USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM order_items oi
      JOIN orders o ON o.id = oi.order_id
      WHERE oi.id = download_tokens.order_item_id
      AND o.user_id = auth.uid()
    )
  );

-- products: permitir ver todos los productos (activos e inactivos para joins)
DROP POLICY IF EXISTS "Products are viewable by everyone" ON products;
CREATE POLICY "Products are viewable by everyone" ON products
  FOR SELECT USING (true);
