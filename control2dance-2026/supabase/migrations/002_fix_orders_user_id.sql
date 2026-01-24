-- =============================================
-- Migración: Asignar user_id a órdenes existentes
-- =============================================

-- 1. Actualizar orders con user_id basado en customer_email
UPDATE orders o
SET user_id = u.id
FROM auth.users u
WHERE o.user_id IS NULL
AND o.customer_email = u.email;

-- 2. Actualizar download_tokens con user_id desde la orden
UPDATE download_tokens dt
SET user_id = o.user_id
FROM order_items oi
JOIN orders o ON o.id = oi.order_id
WHERE dt.order_item_id = oi.id
AND dt.user_id IS NULL
AND o.user_id IS NOT NULL;

-- Verificar resultados
-- SELECT id, customer_email, user_id FROM orders;
-- SELECT dt.id, dt.user_id, o.customer_email FROM download_tokens dt JOIN order_items oi ON dt.order_item_id = oi.id JOIN orders o ON o.id = oi.order_id;
