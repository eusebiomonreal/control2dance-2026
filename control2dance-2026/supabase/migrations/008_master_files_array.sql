-- Migration: Add master_files column as JSONB array
-- This allows multiple master files per product instead of a single file

-- Add the new master_files column
ALTER TABLE products
ADD COLUMN IF NOT EXISTS master_files JSONB;

-- Migrate existing master_file_path data to master_files array
UPDATE products
SET master_files = jsonb_build_array(
  jsonb_build_object(
    'path', master_file_path,
    'file_name', COALESCE(
      SUBSTRING(master_file_path FROM '[^/]+$'),
      'master.wav'
    ),
    'file_size', COALESCE(master_file_size, 0)
  )
)
WHERE master_file_path IS NOT NULL 
  AND master_file_path != ''
  AND (master_files IS NULL OR master_files = '[]'::jsonb);

-- Add comment to explain the column
COMMENT ON COLUMN products.master_files IS 'Array of master files for paid downloads. Each object has: path, file_name, file_size';
