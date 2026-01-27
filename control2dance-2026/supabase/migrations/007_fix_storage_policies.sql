-- Fix: Políticas de Storage para permitir uploads de admin
-- Ejecutar en Supabase SQL Editor

-- Primero, eliminar políticas existentes que pueden estar causando conflictos
DROP POLICY IF EXISTS "Public read covers" ON storage.objects;
DROP POLICY IF EXISTS "Admins manage covers" ON storage.objects;
DROP POLICY IF EXISTS "Admins can upload covers" ON storage.objects;
DROP POLICY IF EXISTS "Admins can update covers" ON storage.objects;
DROP POLICY IF EXISTS "Admins can delete covers" ON storage.objects;

DROP POLICY IF EXISTS "Public read audio-previews" ON storage.objects;
DROP POLICY IF EXISTS "Admins manage audio-previews" ON storage.objects;
DROP POLICY IF EXISTS "Admins can upload audio" ON storage.objects;
DROP POLICY IF EXISTS "Admins can update audio" ON storage.objects;
DROP POLICY IF EXISTS "Admins can delete audio" ON storage.objects;

DROP POLICY IF EXISTS "Admins manage downloads" ON storage.objects;

-- Verificar/actualizar la configuración del bucket covers
UPDATE storage.buckets 
SET 
    public = true,
    file_size_limit = 10485760, -- 10MB
    allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
WHERE id = 'covers';

-- Verificar/actualizar la configuración del bucket audio
UPDATE storage.buckets 
SET 
    public = true,
    file_size_limit = 52428800, -- 50MB
    allowed_mime_types = ARRAY['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/ogg', 'audio/x-wav']
WHERE id = 'audio';

-- ============================================
-- POLÍTICAS PARA BUCKET COVERS
-- ============================================

-- Lectura pública
CREATE POLICY "Anyone can view covers"
    ON storage.objects FOR SELECT
    USING (bucket_id = 'covers');

-- Admins pueden insertar
CREATE POLICY "Admins can insert covers"
    ON storage.objects FOR INSERT
    WITH CHECK (bucket_id = 'covers' AND public.is_admin());

-- Admins pueden actualizar
CREATE POLICY "Admins can update covers"
    ON storage.objects FOR UPDATE
    USING (bucket_id = 'covers' AND public.is_admin());

-- Admins pueden eliminar
CREATE POLICY "Admins can delete covers"
    ON storage.objects FOR DELETE
    USING (bucket_id = 'covers' AND public.is_admin());

-- ============================================
-- POLÍTICAS PARA BUCKET AUDIO
-- ============================================

-- Lectura pública
CREATE POLICY "Anyone can view audio"
    ON storage.objects FOR SELECT
    USING (bucket_id = 'audio');

-- Admins pueden insertar
CREATE POLICY "Admins can insert audio"
    ON storage.objects FOR INSERT
    WITH CHECK (bucket_id = 'audio' AND public.is_admin());

-- Admins pueden actualizar
CREATE POLICY "Admins can update audio"
    ON storage.objects FOR UPDATE
    USING (bucket_id = 'audio' AND public.is_admin());

-- Admins pueden eliminar
CREATE POLICY "Admins can delete audio"
    ON storage.objects FOR DELETE
    USING (bucket_id = 'audio' AND public.is_admin());

-- ============================================
-- POLÍTICAS PARA BUCKET DOWNLOADS (privado)
-- ============================================

-- Solo admins pueden ver
CREATE POLICY "Admins can view downloads"
    ON storage.objects FOR SELECT
    USING (bucket_id = 'downloads' AND public.is_admin());

-- Admins pueden insertar
CREATE POLICY "Admins can insert downloads"
    ON storage.objects FOR INSERT
    WITH CHECK (bucket_id = 'downloads' AND public.is_admin());

-- Admins pueden actualizar
CREATE POLICY "Admins can update downloads"
    ON storage.objects FOR UPDATE
    USING (bucket_id = 'downloads' AND public.is_admin());

-- Admins pueden eliminar
CREATE POLICY "Admins can delete downloads"
    ON storage.objects FOR DELETE
    USING (bucket_id = 'downloads' AND public.is_admin());

-- ============================================
-- VERIFICACIÓN
-- ============================================

-- Listar políticas actuales
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies 
WHERE tablename = 'objects' AND schemaname = 'storage'
ORDER BY policyname;
