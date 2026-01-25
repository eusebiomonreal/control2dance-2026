-- Migración: Añadir campos adicionales de Stripe a orders
-- Fecha: 2026-01-25

-- Añadir columnas para más datos de Stripe
ALTER TABLE orders ADD COLUMN IF NOT EXISTS customer_country VARCHAR(2);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_method VARCHAR(50);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS stripe_receipt_url TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS customer_ip VARCHAR(45);

-- Comentarios
COMMENT ON COLUMN orders.customer_country IS 'Código ISO del país del cliente (ES, US, etc.)';
COMMENT ON COLUMN orders.payment_method IS 'Método de pago usado (card, paypal, etc.)';
COMMENT ON COLUMN orders.stripe_receipt_url IS 'URL del recibo de Stripe';
COMMENT ON COLUMN orders.customer_ip IS 'IP del cliente durante el checkout';
