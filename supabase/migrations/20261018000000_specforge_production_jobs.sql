-- ============================================================================
-- SpecForge Production Hardening: Storage, Jobs, Telemetry, and Quotas
-- Migration: 20261018000000_specforge_production_jobs.sql
-- ============================================================================

-- 1. STORAGE BUCKET: capture_uploads
-- Enables direct browser presigned uploads for multi-megabyte traffic captures and bundles
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'capture_uploads',
    'capture_uploads',
    false,
    52428800, -- 50 MiB max byte budget
    ARRAY['application/json', 'text/plain', 'application/javascript', 'application/octet-stream']
)
ON CONFLICT (id) DO UPDATE SET
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Storage RLS Policies scoped to current_org_id()
CREATE POLICY "Org members can upload capture files"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
    bucket_id = 'capture_uploads' AND
    (storage.foldername(name))[1] = public.current_org_id()::text
);

CREATE POLICY "Org members can read own capture files"
ON storage.objects FOR SELECT TO authenticated
USING (
    bucket_id = 'capture_uploads' AND
    (storage.foldername(name))[1] = public.current_org_id()::text
);

CREATE POLICY "Org members can delete own capture files"
ON storage.objects FOR DELETE TO authenticated
USING (
    bucket_id = 'capture_uploads' AND
    (storage.foldername(name))[1] = public.current_org_id()::text
);

-- 2. ENHANCE PROJECTS WITH ASYNC JOB PROGRESS & TELEMETRY
ALTER TABLE public.projects
ADD COLUMN IF NOT EXISTS stage TEXT NOT NULL CHECK (
    stage IN ('queued', 'scrubbing', 'dissecting', 'synthesizing', 'verifying', 'completed', 'failed')
) DEFAULT 'queued',
ADD COLUMN IF NOT EXISTS progress_pct INTEGER NOT NULL DEFAULT 0 CHECK (progress_pct >= 0 AND progress_pct <= 100),
ADD COLUMN IF NOT EXISTS error_message TEXT,
ADD COLUMN IF NOT EXISTS redaction_summary_json JSONB NOT NULL DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS telemetry_json JSONB NOT NULL DEFAULT '{}'::jsonb;

CREATE INDEX IF NOT EXISTS idx_projects_stage ON public.projects(stage);

-- 3. USAGE QUOTA TRACKING TABLE
CREATE TABLE IF NOT EXISTS public.org_usage_quotas (
    org_id UUID PRIMARY KEY,
    tier TEXT NOT NULL CHECK (tier IN ('free', 'pro', 'enterprise')) DEFAULT 'free',
    monthly_endpoints_used INTEGER NOT NULL DEFAULT 0,
    monthly_limit INTEGER NOT NULL DEFAULT 25,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_org_usage_quotas_tier ON public.org_usage_quotas(tier);

-- Updated_at trigger for org_usage_quotas
DROP TRIGGER IF EXISTS trigger_org_usage_quotas_updated_at ON public.org_usage_quotas;
CREATE TRIGGER trigger_org_usage_quotas_updated_at
    BEFORE UPDATE ON public.org_usage_quotas
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

-- RLS Policies for org_usage_quotas
ALTER TABLE public.org_usage_quotas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view their usage quotas"
ON public.org_usage_quotas FOR SELECT TO authenticated
USING (org_id = public.current_org_id());

CREATE POLICY "Service role can manage usage quotas"
ON public.org_usage_quotas FOR ALL TO service_role
USING (true)
WITH CHECK (true);
