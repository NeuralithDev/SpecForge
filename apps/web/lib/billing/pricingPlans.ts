/**
 * Commercial Pricing Tier Definitions for SpecForge Dual-Gateway Billing (Razorpay INR + Stripe USD).
 */

export type PlanId = "free" | "sprint_one_time" | "pro_monthly" | "enterprise_annual";
export type SupportedCurrency = "INR" | "USD";

export interface PlanPrice {
  readonly amountMinor: number;
  readonly displayPrice: string;
  readonly currency: SupportedCurrency;
  readonly interval: "one_time" | "month" | "year";
}

export interface PricingPlan {
  readonly id: PlanId;
  readonly name: string;
  readonly subtitle: string;
  readonly description: string;
  readonly endpointLimit: number;
  readonly prices: {
    readonly INR: PlanPrice;
    readonly USD: PlanPrice;
  };
  readonly features: readonly string[];
  readonly badge?: string;
  readonly isPopular?: boolean;
  readonly ctaText: string;
}

export const PRICING_PLANS: Record<PlanId, PricingPlan> = {
  free: {
    id: "free",
    name: "Free Scratchpad",
    subtitle: "Local-First Offline API Studio",
    description: "Unlimited local API testing, .har import, up to 25 compiled endpoints.",
    endpointLimit: 25,
    prices: {
      INR: { amountMinor: 0, displayPrice: "₹0", currency: "INR", interval: "one_time" },
      USD: { amountMinor: 0, displayPrice: "$0", currency: "USD", interval: "one_time" },
    },
    features: [
      "Unlimited local offline HTTP request runner",
      "Interactive .har drag-and-drop auto-clustering",
      "Up to 25 compiled endpoints (MCP, SDK, Spec, Tests)",
      "Zero-Leak Secret Redaction (<REDACTED_...)",
      "Local environment variables (IndexedDB / LocalStorage)",
      "Community GitHub support",
    ],
    ctaText: "Current Plan",
  },
  sprint_one_time: {
    id: "sprint_one_time",
    name: "Single Project Sprint",
    subtitle: "Done-For-You Integration Pass",
    description: "One-time pass for immediate delivery of a complete, verified target SDK + MCP server.",
    endpointLimit: 100,
    prices: {
      INR: { amountMinor: 4999900, displayPrice: "₹49,999", currency: "INR", interval: "one_time" },
      USD: { amountMinor: 59900, displayPrice: "$599", currency: "USD", interval: "one_time" },
    },
    badge: "One-Time Unlock",
    features: [
      "100 verified API endpoints for target project",
      "Instant ZIP bundle download (.ts client + MCP server)",
      "Executive Epistemic Audit Certificate (.md)",
      "Deterministic Vitest obligation parity suite",
      "Auto-populated .env.example with ResidualUnknowns",
      "14 days direct priority integration support",
    ],
    ctaText: "Unlock Single Project Pass",
  },
  pro_monthly: {
    id: "pro_monthly",
    name: "Pro Builder",
    subtitle: "Scale Agent Integration Fleets",
    description: "Unlimited MCP/SDK compilations, Vitest suite exports, Cloud Workspace Sync.",
    endpointLimit: 500,
    prices: {
      INR: { amountMinor: 249900, displayPrice: "₹2,499", currency: "INR", interval: "month" },
      USD: { amountMinor: 2900, displayPrice: "$29", currency: "USD", interval: "month" },
    },
    badge: "Most Popular",
    isPopular: true,
    features: [
      "Unlimited MCP/SDK compilations & ZIP downloads",
      "Cloud Workspace Sync & Supabase persistence",
      "Auto-generated Vitest parity test suites",
      "Priority Google Gemini semantic enrichment",
      "SSRF firewall & Direct 50 MiB capture storage uploads",
      "Team collaboration & shared environment vaults",
      "Same-day Discord & email SLA",
    ],
    ctaText: "Upgrade to Pro Builder",
  },
  enterprise_annual: {
    id: "enterprise_annual",
    name: "Agency / Enterprise",
    subtitle: "Mission-Critical Mission Fleet",
    description: "Self-hosted runners, team RBAC, priority support.",
    endpointLimit: 999999,
    prices: {
      INR: { amountMinor: 4999900, displayPrice: "₹49,999", currency: "INR", interval: "month" },
      USD: { amountMinor: 59900, displayPrice: "$599", currency: "USD", interval: "month" },
    },
    badge: "Enterprise Dedicated",
    features: [
      "Unlimited verified endpoints & target captures",
      "Self-hosted proxy runners & private network ingress",
      "Enterprise Team RBAC & Supabase custom SSO",
      "Custom white-labeled Epistemic Audit Certificates",
      "SOC 2 Type II compliance export & audit logs",
      "Custom webhook drift detection on target changes",
      "Dedicated solutions architect & 1-hour emergency SLA",
    ],
    ctaText: "Deploy Agency / Enterprise",
  },
};

/** Get the configured plan object or fallback to free tier. */
export function getPricingPlan(planId: string): PricingPlan {
  return (PRICING_PLANS as Record<string, PricingPlan>)[planId] ?? PRICING_PLANS.free;
}
