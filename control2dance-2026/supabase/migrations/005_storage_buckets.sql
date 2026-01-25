-- Migración: Storage buckets para admin uploads
-- Ejecutar en Supabase SQL Editor

-- Bucket para imágenes de portada (público)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'covers',
    'covers',
    true,
    5242880, -- 5MB
    ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO UPDATE SET
    public = true,
    file_size_limit = 5242880,
    allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

-- Bucket para audio previews (público)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'audio-previews',
    'audio-previews',
    true,
    20971520, -- 20MB
    ARRAY['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/ogg']
)
ON CONFLICT (id) DO UPDATE SET
    public = true,
    file_size_limit = 20971520,
    allowed_mime_types = ARRAY['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/ogg'];

-- Políticas para bucket covers
DROP POLICY IF EXISTS "Public read covers" ON storage.objects;
CREATE POLICY "Public read covers"
    ON storage.objects FOR SELECT
    USING (bucket_id = 'covers');

DROP POLICY IF EXISTS "Admins manage covers" ON storage.objects;
CREATE POLICY "Admins manage covers"
    ON storage.objects FOR ALL
    USING (bucket_id = 'covers' AND public.is_admin());

-- Políticas para bucket audio-previews
DROP POLICY IF EXISTS "Public read audio-previews" ON storage.objects;
CREATE POLICY "Public read audio-previews"
    ON storage.objects FOR SELECT
    USING (bucket_id = 'audio-previews');

DROP POLICY IF EXISTS "Admins manage audio-previews" ON storage.objects;
CREATE POLICY "Admins manage audio-previews"
    ON storage.objects FOR ALL
    USING (bucket_id = 'audio-previews' AND public.is_admin());

-- Políticas para bucket downloads (ya existente, privado)
DROP POLICY IF EXISTS "Admins manage downloads" ON storage.objects;
CREATE POLICY "Admins manage downloads"
    ON storage.objects FOR ALL
    USING (bucket_id = 'downloads' AND public.is_admin());

-- Comentarios
COMMENT ON COLUMN storage.buckets.id IS 'covers: portadas públicas, audio-previews: clips públicos, downloads: masters privados';
