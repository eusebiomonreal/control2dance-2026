-- Add order_number column to orders table
ALTER TABLE orders ADD COLUMN IF NOT EXISTS order_number text;

-- Add index for faster searches
CREATE INDEX IF NOT EXISTS idx_orders_order_number ON orders(order_number);

-- Comment for clarity
COMMENT ON COLUMN orders.order_number IS 'Original order number from WordPress/EDD';
