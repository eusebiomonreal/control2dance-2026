-- =============================================
-- AÑADIR CAMPOS ADICIONALES DE DISCOGS
-- =============================================

-- Tracklist: lista de canciones con posición y título
ALTER TABLE products ADD COLUMN IF NOT EXISTS tracklist JSONB;

-- Créditos: compositores, productores, etc.
ALTER TABLE products ADD COLUMN IF NOT EXISTS credits JSONB;

-- Código de barras
ALTER TABLE products ADD COLUMN IF NOT EXISTS barcode VARCHAR(50);

-- Depósito legal
ALTER TABLE products ADD COLUMN IF NOT EXISTS legal_deposit VARCHAR(50);

-- ID de Discogs para referencia
ALTER TABLE products ADD COLUMN IF NOT EXISTS discogs_id VARCHAR(20);

-- Comentarios sobre la estructura de datos:
-- tracklist: [{"position": "A", "title": "Faith-Lix (Extended Mix)", "duration": "5:53"}, ...]
-- credits: [{"role": "Written-By", "name": "DJ Yo"}, {"role": "Written-By", "name": "Dr. Morticia"}, ...]
