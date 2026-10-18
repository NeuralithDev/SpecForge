-- ============================================================================
-- SpecForge Multi-Tenant Database Schema
-- Multi-Tenant Isolation with Row Level Security (RLS) and Tenant Org Keys
-- ============================================================================

-- Enable pgcrypto for UUID generation if not already active
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. PROJECTS TABLE
CREATE TABLE IF NOT EXISTS public.projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL,
    name TEXT NOT NULL,
    target_type TEXT NOT NULL CHECK (target_type IN ('har', 'bundle', 'url', 'multi-target')),
    status TEXT NOT NULL CHECK (status IN ('draft', 'analyzing', 'verified', 'partially-verified', 'failed')) DEFAULT 'draft',
    target_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. EVIDENCE LEDGERS TABLE
CREATE TABLE IF NOT EXISTS public.evidence_ledgers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    sha256_digest TEXT NOT NULL,
    evidence_json JSONB NOT NULL DEFAULT '[]'::jsonb,
    unknowns_json JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. OBLIGATION MATRICES TABLE
CREATE TABLE IF NOT EXISTS public.obligation_matrices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    coverage_score NUMERIC(5, 2) NOT NULL DEFAULT 0.00,
    obligations_json JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. GENERATED ARTIFACTS TABLE
CREATE TABLE IF NOT EXISTS public.generated_artifacts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    openapi_spec JSONB NOT NULL DEFAULT '{}'::jsonb,
    mcp_server_code TEXT NOT NULL DEFAULT '',
    ts_sdk_code TEXT NOT NULL DEFAULT '',
    parity_tests_code TEXT NOT NULL DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================================
-- PERFORMANCE & LOOKUP INDEXES
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_projects_org_id ON public.projects(org_id);
CREATE INDEX IF NOT EXISTS idx_projects_status ON public.projects(status);
CREATE INDEX IF NOT EXISTS idx_evidence_ledgers_project_id ON public.evidence_ledgers(project_id);
CREATE INDEX IF NOT EXISTS idx_evidence_ledgers_sha256 ON public.evidence_ledgers(sha256_digest);
CREATE INDEX IF NOT EXISTS idx_obligation_matrices_project_id ON public.obligation_matrices(project_id);
CREATE INDEX IF NOT EXISTS idx_generated_artifacts_project_id ON public.generated_artifacts(project_id);

-- ============================================================================
-- UPDATED_AT TRIGGER FUNCTION
-- ============================================================================
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_projects_updated_at ON public.projects;
CREATE TRIGGER trigger_projects_updated_at
    BEFORE UPDATE ON public.projects
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

-- ============================================================================
-- MULTI-TENANT ROW LEVEL SECURITY (RLS) POLICIES
-- Scoped to authenticated user's organization from JWT claims
-- ============================================================================
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.evidence_ledgers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.obligation_matrices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.generated_artifacts ENABLE ROW LEVEL SECURITY;

-- Helper function to extract tenant org_id from JWT claims
CREATE OR REPLACE FUNCTION public.current_org_id()
RETURNS UUID AS $$
BEGIN
    RETURN COALESCE(
        (current_setting('request.jwt.claims', true)::jsonb -> 'app_metadata' ->> 'org_id')::uuid,
        (current_setting('request.jwt.claims', true)::jsonb ->> 'org_id')::uuid,
        '00000000-0000-0000-0000-000000000000'::uuid
    );
EXCEPTION
    WHEN OTHERS THEN
        RETURN '00000000-0000-0000-0000-000000000000'::uuid;
END;
$$ LANGUAGE plpgsql STABLE;

-- PROJECTS POLICIES
CREATE POLICY "Tenants can select own projects"
    ON public.projects FOR SELECT
    USING (org_id = public.current_org_id());

CREATE POLICY "Tenants can insert own projects"
    ON public.projects FOR INSERT
    WITH CHECK (org_id = public.current_org_id());

CREATE POLICY "Tenants can update own projects"
    ON public.projects FOR UPDATE
    USING (org_id = public.current_org_id())
    WITH CHECK (org_id = public.current_org_id());

CREATE POLICY "Tenants can delete own projects"
    ON public.projects FOR DELETE
    USING (org_id = public.current_org_id());

-- EVIDENCE LEDGERS POLICIES (via Project Org ID)
CREATE POLICY "Tenants can select evidence ledgers"
    ON public.evidence_ledgers FOR SELECT
    USING (EXISTS (
        SELECT 1 FROM public.projects
        WHERE projects.id = evidence_ledgers.project_id
        AND projects.org_id = public.current_org_id()
    ));

CREATE POLICY "Tenants can insert evidence ledgers"
    ON public.evidence_ledgers FOR INSERT
    WITH CHECK (EXISTS (
        SELECT 1 FROM public.projects
        WHERE projects.id = evidence_ledgers.project_id
        AND projects.org_id = public.current_org_id()
    ));

CREATE POLICY "Tenants can delete evidence ledgers"
    ON public.evidence_ledgers FOR DELETE
    USING (EXISTS (
        SELECT 1 FROM public.projects
        WHERE projects.id = evidence_ledgers.project_id
        AND projects.org_id = public.current_org_id()
    ));

-- OBLIGATION MATRICES POLICIES
CREATE POLICY "Tenants can select obligation matrices"
    ON public.obligation_matrices FOR SELECT
    USING (EXISTS (
        SELECT 1 FROM public.projects
        WHERE projects.id = obligation_matrices.project_id
        AND projects.org_id = public.current_org_id()
    ));

CREATE POLICY "Tenants can insert obligation matrices"
    ON public.obligation_matrices FOR INSERT
    WITH CHECK (EXISTS (
        SELECT 1 FROM public.projects
        WHERE projects.id = obligation_matrices.project_id
        AND projects.org_id = public.current_org_id()
    ));

-- GENERATED ARTIFACTS POLICIES
CREATE POLICY "Tenants can select generated artifacts"
    ON public.generated_artifacts FOR SELECT
    USING (EXISTS (
        SELECT 1 FROM public.projects
        WHERE projects.id = generated_artifacts.project_id
        AND projects.org_id = public.current_org_id()
    ));

CREATE POLICY "Tenants can insert generated artifacts"
    ON public.generated_artifacts FOR INSERT
    WITH CHECK (EXISTS (
        SELECT 1 FROM public.projects
        WHERE projects.id = generated_artifacts.project_id
        AND projects.org_id = public.current_org_id()
    ));
