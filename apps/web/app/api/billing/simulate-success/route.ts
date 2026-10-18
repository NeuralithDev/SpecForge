import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { getDb } from "@/lib/supabase";
import { getPricingPlan, type PlanId } from "@/lib/billing/pricingPlans";

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      orgId?: string;
      planId?: string;
      provider?: "razorpay" | "stripe" | "test";
      currency?: "INR" | "USD";
    };

    const orgId = body.orgId ?? "00000000-0000-0000-0000-000000000000";
    const planId = (body.planId ?? "pro_monthly") as PlanId;
    const provider = body.provider ?? "test";
    const currency = body.currency ?? (provider === "razorpay" ? "INR" : "USD");

    const plan = getPricingPlan(planId);
    const amountMinor = plan.prices[currency].amountMinor;
    const simulatedPaymentId = `sim_pay_${randomUUID().replace(/-/gu, "").slice(0, 12)}`;

    const db = getDb();
    const updatedQuota = db.promoteOrgQuota(
      orgId,
      planId,
      provider,
      simulatedPaymentId,
      amountMinor,
      currency,
    );

    return NextResponse.json({
      success: true,
      message: `Organization successfully promoted to ${updatedQuota.tier} (${updatedQuota.plan_id}) tier!`,
      quota: {
        tier: updatedQuota.tier,
        planId: updatedQuota.plan_id,
        monthlyLimit: updatedQuota.monthly_limit,
        monthlyUsed: updatedQuota.monthly_endpoints_used,
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Simulation failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
