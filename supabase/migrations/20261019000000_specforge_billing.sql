-- ============================================================================
-- SpecForge Monetization & Billing Engine Migration
-- Migration: 20261019000000_specforge_billing.sql
-- ============================================================================

-- 1. EXTEND ORG USAGE QUOTAS WITH BILLING METADATA
ALTER TABLE public.org_usage_quotas
ADD COLUMN IF NOT EXISTS payment_provider TEXT NOT NULL CHECK (payment_provider IN ('none', 'razorpay', 'stripe')) DEFAULT 'none',
ADD COLUMN IF NOT EXISTS external_customer_id TEXT,
ADD COLUMN IF NOT EXISTS external_subscription_id TEXT,
ADD COLUMN IF NOT EXISTS plan_id TEXT NOT NULL CHECK (plan_id IN ('free', 'sprint_one_time', 'pro_monthly', 'enterprise_annual')) DEFAULT 'free',
ADD COLUMN IF NOT EXISTS current_period_end TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_org_usage_quotas_plan ON public.org_usage_quotas(plan_id);

-- 2. CREATE BILLING TRANSACTIONS TABLE
CREATE TABLE IF NOT EXISTS public.billing_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL,
    provider TEXT NOT NULL CHECK (provider IN ('razorpay', 'stripe', 'test')),
    external_payment_id TEXT NOT NULL,
    amount_minor INTEGER NOT NULL,
    currency TEXT NOT NULL CHECK (currency IN ('INR', 'USD')),
    plan_id TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('succeeded', 'pending', 'failed', 'refunded')) DEFAULT 'pending',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_billing_transactions_org_id ON public.billing_transactions(org_id);
CREATE INDEX IF NOT EXISTS idx_billing_transactions_ext_id ON public.billing_transactions(external_payment_id);

-- RLS Policies for billing_transactions
ALTER TABLE public.billing_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view own billing transactions"
ON public.billing_transactions FOR SELECT TO authenticated
USING (org_id = public.current_org_id());

CREATE POLICY "Service role can manage billing transactions"
ON public.billing_transactions FOR ALL TO service_role
USING (true)
WITH CHECK (true);
