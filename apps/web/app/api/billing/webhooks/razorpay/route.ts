import { NextRequest, NextResponse } from "next/server";
import { verifyRazorpayWebhookSignature } from "@rea/security/billingWebhook";
import { getDb } from "@/lib/supabase";
import type { PlanId } from "@/lib/billing/pricingPlans";

export async function POST(request: NextRequest) {
  try {
    const rawBody = await request.text();
    const signature = request.headers.get("x-razorpay-signature");
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET ?? "specforge_razorpay_dev_secret";

    // 1. Verify Cryptographic HMAC Signature
    const isValid = verifyRazorpayWebhookSignature(rawBody, signature, webhookSecret);
    if (!isValid && process.env.NODE_ENV === "production") {
      return NextResponse.json({ error: "Invalid Razorpay webhook signature." }, { status: 401 });
    }

    const event = JSON.parse(rawBody) as {
      event: string;
      payload?: {
        payment?: {
          entity?: {
            id: string;
            amount: number;
            currency: string;
            notes?: { orgId?: string; planId?: string };
          };
        };
        order?: {
          entity?: {
            id: string;
            amount: number;
            currency: string;
            notes?: { orgId?: string; planId?: string };
          };
        };
      };
    };

    const paymentEntity = event.payload?.payment?.entity ?? event.payload?.order?.entity;
    if (paymentEntity) {
      const orgId = paymentEntity.notes?.orgId ?? "00000000-0000-0000-0000-000000000000";
      const planId = (paymentEntity.notes?.planId ?? "pro_monthly") as PlanId;
      const paymentId = paymentEntity.id;
      const amount = paymentEntity.amount;

      // 2. Atomically Promote Organization Quota
      const db = getDb();
      db.promoteOrgQuota(orgId, planId, "razorpay", paymentId, amount, "INR");
    }

    return NextResponse.json({ received: true, status: "processed" });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Webhook processing error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
