import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/supabase";

export async function GET(request: NextRequest) {
  const orgId =
    request.nextUrl.searchParams.get("orgId") ?? "00000000-0000-0000-0000-000000000000";

  const db = getDb();
  const quota = db.getQuota(orgId);

  return NextResponse.json({
    orgId: quota.org_id,
    tier: quota.tier,
    planId: quota.plan_id,
    monthlyEndpointsUsed: quota.monthly_endpoints_used,
    monthlyLimit: quota.monthly_limit,
    paymentProvider: quota.payment_provider,
  });
}
