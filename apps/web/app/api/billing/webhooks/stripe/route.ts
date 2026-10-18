import { NextRequest, NextResponse } from "next/server";
import { verifyStripeWebhookSignature } from "@rea/security/billingWebhook";
import { getDb } from "@/lib/supabase";
import type { PlanId } from "@/lib/billing/pricingPlans";

export async function POST(request: NextRequest) {
  try {
    const rawBody = await request.text();
    const signature = request.headers.get("stripe-signature");
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET ?? "whsec_specforge_dev_secret";

    // 1. Verify Cryptographic HMAC Signature with Replay Window Protection
    const isValid = verifyStripeWebhookSignature(rawBody, signature, webhookSecret);
    if (!isValid && process.env.NODE_ENV === "production") {
      return NextResponse.json({ error: "Invalid Stripe webhook signature." }, { status: 401 });
    }

    const event = JSON.parse(rawBody) as {
      type: string;
      data?: {
        object?: {
          id: string;
          amount_total?: number;
          client_reference_id?: string;
          metadata?: { orgId?: string; planId?: string };
        };
      };
    };

    if (event.type === "checkout.session.completed" || event.type === "invoice.payment_succeeded") {
      const sessionObj = event.data?.object;
      if (sessionObj) {
        const orgId = sessionObj.metadata?.orgId ?? sessionObj.client_reference_id ?? "00000000-0000-0000-0000-000000000000";
        const planId = (sessionObj.metadata?.planId ?? "pro_monthly") as PlanId;
        const paymentId = sessionObj.id;
        const amount = sessionObj.amount_total ?? 29900;

        // 2. Atomically Promote Organization Quota
        const db = getDb();
        db.promoteOrgQuota(orgId, planId, "stripe", paymentId, amount, "USD");
      }
    }

    return NextResponse.json({ received: true, status: "processed" });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Webhook processing error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
