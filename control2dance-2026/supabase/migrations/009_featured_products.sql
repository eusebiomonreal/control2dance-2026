-- Migration: Add featured products support
-- Permite marcar productos como destacados para mostrar en la home

-- Añadir campo is_featured
ALTER TABLE products
ADD COLUMN IF NOT EXISTS is_featured BOOLEAN DEFAULT false;

-- Añadir campo featured_order para ordenar múltiples destacados
ALTER TABLE products
ADD COLUMN IF NOT EXISTS featured_order INTEGER DEFAULT 0;

-- Crear índice para búsquedas rápidas
CREATE INDEX IF NOT EXISTS idx_products_featured ON products(is_featured) WHERE is_featured = true;

-- Comentarios
COMMENT ON COLUMN products.is_featured IS 'Si el producto aparece en la sección destacada de la home';
COMMENT ON COLUMN products.featured_order IS 'Orden de aparición en destacados (menor = primero)';
