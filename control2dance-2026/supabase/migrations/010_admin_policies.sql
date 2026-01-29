-- Migración 010: Políticas para que los administradores vean todos los pedidos y descargas
-- Ejecutar en Supabase SQL Editor

-- 1. Política para orders (SELECT)
DROP POLICY IF EXISTS "Admins can view all orders" ON public.orders;
CREATE POLICY "Admins can view all orders"
    ON public.orders FOR SELECT
    USING (public.is_admin());

-- 2. Política para order_items (SELECT)
DROP POLICY IF EXISTS "Admins can view all order items" ON public.order_items;
CREATE POLICY "Admins can view all order items"
    ON public.order_items FOR SELECT
    USING (public.is_admin());

-- 3. Política para download_tokens (SELECT)
DROP POLICY IF EXISTS "Admins can view all download tokens" ON public.download_tokens;
CREATE POLICY "Admins can view all download tokens"
    ON public.download_tokens FOR SELECT
    USING (public.is_admin());

-- 4. Política para download_logs (SELECT)
DROP POLICY IF EXISTS "Admins can view all download logs" ON public.download_logs;
CREATE POLICY "Admins can view all download logs"
    ON public.download_logs FOR SELECT
    USING (public.is_admin());

-- Comentarios
COMMENT ON POLICY "Admins can view all orders" ON public.orders IS 'Permite a los administradores ver todos los pedidos de la tienda';
