-- =============================================
-- BUCKET DE DESCARGAS PROTEGIDO
-- =============================================

-- Crear bucket privado para archivos de descarga (WAV/FLAC)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'downloads',
  'downloads',
  false,  -- PRIVADO: requiere autenticación
  209715200,  -- 200MB máximo por archivo
  ARRAY['audio/wav', 'audio/flac', 'audio/x-wav', 'application/zip']
)
ON CONFLICT (id) DO UPDATE SET
  public = false,
  file_size_limit = 209715200,
  allowed_mime_types = ARRAY['audio/wav', 'audio/flac', 'audio/x-wav', 'application/zip'];

-- =============================================
-- POLÍTICAS DE STORAGE PARA DESCARGAS
-- =============================================

-- Eliminar políticas anteriores si existen
DROP POLICY IF EXISTS "Authenticated users can download purchased files" ON storage.objects;
DROP POLICY IF EXISTS "Service role can upload download files" ON storage.objects;
DROP POLICY IF EXISTS "Service role can manage download files" ON storage.objects;

-- POLÍTICA DE LECTURA: Solo usuarios con token de descarga válido
CREATE POLICY "Authenticated users can download purchased files"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'downloads'
  AND auth.role() = 'authenticated'
  AND EXISTS (
    SELECT 1 FROM public.download_tokens dt
    JOIN public.products p ON dt.product_id = p.id
    WHERE dt.user_id = auth.uid()
      AND dt.is_active = true
      AND dt.expires_at > NOW()
      AND dt.download_count < dt.max_downloads
      AND storage.objects.name LIKE '%' || p.catalog_number || '%'
  )
);

-- POLÍTICA DE SUBIDA: Solo service role (backend)
CREATE POLICY "Service role can upload download files"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'downloads'
  AND auth.role() = 'service_role'
);

-- POLÍTICA DE GESTIÓN: Solo service role
CREATE POLICY "Service role can manage download files"
ON storage.objects FOR ALL
USING (
  bucket_id = 'downloads'
  AND auth.role() = 'service_role'
);

-- =============================================
-- FUNCIÓN PARA GENERAR URL DE DESCARGA FIRMADA
-- =============================================
CREATE OR REPLACE FUNCTION generate_download_url(
  p_token VARCHAR,
  p_file_path VARCHAR
)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_download_token RECORD;
  v_signed_url TEXT;
BEGIN
  -- Verificar token válido
  SELECT dt.*, p.catalog_number
  INTO v_download_token
  FROM download_tokens dt
  JOIN products p ON dt.product_id = p.id
  WHERE dt.token = p_token
    AND dt.is_active = true
    AND dt.expires_at > NOW()
    AND dt.download_count < dt.max_downloads;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Token de descarga inválido o expirado';
  END IF;

  -- Incrementar contador de descargas
  UPDATE download_tokens
  SET download_count = download_count + 1,
      last_download_at = NOW()
  WHERE token = p_token;

  -- Registrar descarga
  INSERT INTO download_logs (download_token_id, user_id, product_id, downloaded_at)
  VALUES (v_download_token.id, v_download_token.user_id, v_download_token.product_id, NOW());

  -- Retornar path del archivo (la URL firmada se genera desde el backend)
  RETURN p_file_path;
END;
$$;

-- =============================================
-- FUNCIÓN PARA VALIDAR DESCARGA
-- =============================================
CREATE OR REPLACE FUNCTION validate_download_token(p_token VARCHAR)
RETURNS TABLE (
  is_valid BOOLEAN,
  product_id UUID,
  catalog_number VARCHAR,
  downloads_remaining INT,
  expires_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    true AS is_valid,
    dt.product_id,
    p.catalog_number,
    (dt.max_downloads - dt.download_count) AS downloads_remaining,
    dt.expires_at
  FROM download_tokens dt
  JOIN products p ON dt.product_id = p.id
  WHERE dt.token = p_token
    AND dt.is_active = true
    AND dt.expires_at > NOW()
    AND dt.download_count < dt.max_downloads;
END;
$$;
