-- Migración: Tabla de logs de descargas
-- Ejecutar en Supabase SQL Editor

-- Tabla download_logs
CREATE TABLE IF NOT EXISTS public.download_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    download_token_id UUID REFERENCES public.download_tokens(id) ON DELETE CASCADE,
    order_item_id UUID REFERENCES public.order_items(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    file_name TEXT NOT NULL,
    ip_address TEXT,
    user_agent TEXT,
    country TEXT,
    city TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para búsquedas rápidas
CREATE INDEX IF NOT EXISTS idx_download_logs_token ON public.download_logs(download_token_id);
CREATE INDEX IF NOT EXISTS idx_download_logs_order_item ON public.download_logs(order_item_id);
CREATE INDEX IF NOT EXISTS idx_download_logs_user ON public.download_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_download_logs_created ON public.download_logs(created_at DESC);

-- Habilitar RLS
ALTER TABLE public.download_logs ENABLE ROW LEVEL SECURITY;

-- Política: Solo admins pueden ver logs
CREATE POLICY "Admins can view download logs"
    ON public.download_logs FOR SELECT
    USING (public.is_admin());

-- Política: El sistema puede insertar logs (via service key o función)
CREATE POLICY "System can insert logs"
    ON public.download_logs FOR INSERT
    WITH CHECK (true);

-- Comentarios
COMMENT ON TABLE public.download_logs IS 'Registro de todas las descargas realizadas';
COMMENT ON COLUMN public.download_logs.ip_address IS 'Dirección IP del cliente';
COMMENT ON COLUMN public.download_logs.user_agent IS 'Navegador/dispositivo del cliente';
