-- Create table for newsletter subscribers
CREATE TABLE IF NOT EXISTS public.newsletter_subscribers (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    email TEXT NOT NULL UNIQUE,
    name TEXT,
    is_active BOOLEAN DEFAULT true,
    source TEXT DEFAULT 'website', -- 'website', 'checkout', 'footer', etc.
    ip_address TEXT,
    user_agent TEXT,
    subscribed_at TIMESTAMPTZ DEFAULT NOW(),
    unsubscribed_at TIMESTAMPTZ,
    consent_given BOOLEAN DEFAULT true, -- Explicit consent for GDPR
    consent_text TEXT, -- The text they agreed to
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add RLS policies
ALTER TABLE public.newsletter_subscribers ENABLE ROW LEVEL SECURITY;

-- Allow public insert (for signups)
CREATE POLICY "Allow public insert" ON public.newsletter_subscribers
    FOR INSERT WITH CHECK (true);

-- Allow admins to view all (you might need to adjust this depending on your auth setup)
-- For now, we'll allow authenticated users to view their own if needed, or service_role for admin
CREATE POLICY "Allow service_role full access" ON public.newsletter_subscribers
    USING (auth.role() = 'service_role');
