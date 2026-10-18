import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { getPricingPlan, type PlanId, type SupportedCurrency } from "@/lib/billing/pricingPlans";

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      planId?: string;
      currency?: string;
      orgId?: string;
      email?: string;
      returnUrl?: string;
    };

    const planId = (body.planId ?? "pro_monthly") as PlanId;
    const currency = (body.currency?.toUpperCase() === "USD" ? "USD" : "INR") as SupportedCurrency;
    const orgId = body.orgId ?? "00000000-0000-0000-0000-000000000000";
    const email = body.email ?? "billing@specforge.ai";
    const returnUrl = body.returnUrl ?? "/";

    const plan = getPricingPlan(planId);
    if (plan.id === "free") {
      return NextResponse.json(
        { error: "Free tier does not require checkout." },
        { status: 400 },
      );
    }

    const priceInfo = plan.prices[currency];

    // =========================================================================
    // 1. RAZORPAY CHECKOUT FLOW (INR)
    // =========================================================================
    if (currency === "INR") {
      const razorpayKeyId = process.env.RAZORPAY_KEY_ID;
      const razorpaySecret = process.env.RAZORPAY_KEY_SECRET;

      if (razorpayKeyId && razorpaySecret) {
        // Create live order via Razorpay REST API
        const basicAuth = Buffer.from(`${razorpayKeyId}:${razorpaySecret}`).toString("base64");
        const orderResponse = await fetch("https://api.razorpay.com/v1/orders", {
          method: "POST",
          headers: {
            Authorization: `Basic ${basicAuth}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            amount: priceInfo.amountMinor,
            currency: "INR",
            receipt: `rcpt_${orgId.slice(0, 8)}_${Date.now()}`,
            notes: {
              orgId,
              planId: plan.id,
              customerEmail: email,
            },
          }),
        });

        if (!orderResponse.ok) {
          const err = (await orderResponse.json()) as { error?: { description?: string } };
          throw new Error(err.error?.description ?? "Razorpay order creation failed");
        }

        const order = (await orderResponse.json()) as { id: string; amount: number; currency: string };

        return NextResponse.json({
          provider: "razorpay",
          orderId: order.id,
          amountMinor: order.amount,
          currency: "INR",
          keyId: razorpayKeyId,
          planId: plan.id,
          planName: plan.name,
          email,
          isTestMode: false,
        });
      }

      // Local Demo / Sandbox simulation fallback when Razorpay credentials are not yet configured
      const simulatedOrderId = `order_sim_${randomUUID().replace(/-/gu, "").slice(0, 14)}`;
      return NextResponse.json({
        provider: "razorpay",
        orderId: simulatedOrderId,
        amountMinor: priceInfo.amountMinor,
        currency: "INR",
        keyId: "rzp_test_specforge_demo",
        planId: plan.id,
        planName: plan.name,
        email,
        isTestMode: true,
        message: "Simulated order for local demo environment without live API credentials.",
      });
    }

    // =========================================================================
    // 2. STRIPE CHECKOUT FLOW (USD)
    // =========================================================================
    const stripeSecretKey = process.env.STRIPE_SECRET_KEY;

    if (stripeSecretKey) {
      // Create live Stripe Checkout session via Stripe REST API
      const params = new URLSearchParams();
      params.append("payment_method_types[0]", "card");
      params.append("line_items[0][price_data][currency]", "usd");
      params.append("line_items[0][price_data][unit_amount]", String(priceInfo.amountMinor));
      params.append("line_items[0][price_data][product_data][name]", `SpecForge ${plan.name}`);
      params.append("line_items[0][price_data][product_data][description]", plan.subtitle);
      params.append("line_items[0][quantity]", "1");
      params.append("mode", "payment");
      params.append("customer_email", email);
      params.append("client_reference_id", orgId);
      params.append("metadata[orgId]", orgId);
      params.append("metadata[planId]", plan.id);
      params.append(
        "success_url",
        returnUrl.includes("http")
          ? `${returnUrl}?checkout_success=true&plan=${plan.id}&provider=stripe`
          : `https://specforge.ai${returnUrl}?checkout_success=true&plan=${plan.id}&provider=stripe`,
      );
      params.append(
        "cancel_url",
        returnUrl.includes("http")
          ? `${returnUrl}?checkout_cancelled=true`
          : `https://specforge.ai${returnUrl}?checkout_cancelled=true`,
      );

      const stripeResponse = await fetch("https://api.stripe.com/v1/checkout/sessions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${stripeSecretKey}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: params.toString(),
      });

      if (!stripeResponse.ok) {
        const err = (await stripeResponse.json()) as { error?: { message?: string } };
        throw new Error(err.error?.message ?? "Stripe checkout session creation failed");
      }

      const session = (await stripeResponse.json()) as { id: string; url: string };

      return NextResponse.json({
        provider: "stripe",
        checkoutUrl: session.url,
        sessionId: session.id,
        planId: plan.id,
        amountMinor: priceInfo.amountMinor,
        currency: "USD",
        isTestMode: false,
      });
    }

    // Local Demo / Sandbox simulation fallback when Stripe credentials are not yet configured
    const simulatedSessionId = `cs_sim_${randomUUID().replace(/-/gu, "").slice(0, 16)}`;
    const simulatedCheckoutUrl = `${returnUrl}${returnUrl.includes("?") ? "&" : "?"}test_checkout_success=true&plan=${plan.id}&provider=stripe`;

    return NextResponse.json({
      provider: "stripe",
      checkoutUrl: simulatedCheckoutUrl,
      sessionId: simulatedSessionId,
      planId: plan.id,
      amountMinor: priceInfo.amountMinor,
      currency: "USD",
      isTestMode: true,
      message: "Simulated Stripe checkout for local demo environment without live API credentials.",
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Checkout initialization failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
