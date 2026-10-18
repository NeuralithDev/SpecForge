import { describe, expect, it } from "vitest";
import {
  calculateRazorpaySignature,
  verifyRazorpayWebhookSignature,
  calculateStripeSignature,
  verifyStripeWebhookSignature,
} from "./billingWebhook.js";
import { getDb } from "../../apps/web/lib/supabase.js";

describe("Cryptographic Billing Webhook Verification & Quota Enforcement", () => {
  const mockPayload = JSON.stringify({
    event: "payment.captured",
    entity: {
      id: "pay_test_987654",
      amount: 2499900,
      currency: "INR",
      notes: { orgId: "org_alpha_123", planId: "pro_monthly" },
    },
  });

  describe("Razorpay HMAC SHA-256 Webhook Verification", () => {
    const razorpaySecret = "rzp_whsec_test_secret_998877";

    it("verifies valid Razorpay signature using timingSafeEqual", () => {
      const validSignature = calculateRazorpaySignature(mockPayload, razorpaySecret);
      const isValid = verifyRazorpayWebhookSignature(mockPayload, validSignature, razorpaySecret);
      expect(isValid).toBe(true);
    });

    it("rejects tampered webhook payload or mismatched secret", () => {
      const validSignature = calculateRazorpaySignature(mockPayload, razorpaySecret);
      const tamperedPayload = mockPayload.replace("pro_monthly", "enterprise_annual");

      expect(verifyRazorpayWebhookSignature(tamperedPayload, validSignature, razorpaySecret)).toBe(
        false,
      );
      expect(verifyRazorpayWebhookSignature(mockPayload, validSignature, "wrong_secret_123")).toBe(
        false,
      );
      expect(verifyRazorpayWebhookSignature(mockPayload, null, razorpaySecret)).toBe(false);
      expect(verifyRazorpayWebhookSignature(mockPayload, "invalid_hex", razorpaySecret)).toBe(
        false,
      );
    });
  });

  describe("Stripe HMAC SHA-256 Webhook Verification with Anti-Replay", () => {
    const stripeSecret = "whsec_stripe_test_token_554433";
    const nowSec = 1700000000;

    it("verifies authentic Stripe signature within timestamp tolerance", () => {
      const header = calculateStripeSignature(mockPayload, stripeSecret, nowSec);
      const isValid = verifyStripeWebhookSignature(
        mockPayload,
        header,
        stripeSecret,
        300,
        nowSec + 10,
      );
      expect(isValid).toBe(true);
    });

    it("rejects replay attacks where webhook timestamp exceeds tolerance window", () => {
      const oldTimestamp = nowSec - 305; // 305 seconds ago (> 300s tolerance)
      const header = calculateStripeSignature(mockPayload, stripeSecret, oldTimestamp);

      const isValid = verifyStripeWebhookSignature(
        mockPayload,
        header,
        stripeSecret,
        300,
        nowSec,
      );
      expect(isValid).toBe(false);
    });

    it("rejects invalid signatures or tampered body in Stripe webhook", () => {
      const header = calculateStripeSignature(mockPayload, stripeSecret, nowSec);
      const tampered = mockPayload + " ";

      expect(verifyStripeWebhookSignature(tampered, header, stripeSecret, 300, nowSec)).toBe(false);
      expect(
        verifyStripeWebhookSignature(mockPayload, header, "wrong_stripe_whsec", 300, nowSec),
      ).toBe(false);
      expect(verifyStripeWebhookSignature(mockPayload, "malformed_header", stripeSecret, 300, nowSec)).toBe(
        false,
      );
    });
  });

  describe("Quota Ledger & Tier Promotion", () => {
    it("enforces free tier quota limit (25 endpoints) and promotes on upgrade", () => {
      const db = getDb();
      const testOrgId = "org_quota_test_001";

      // 1. Initial Free Tier check
      const initialQuota = db.getQuota(testOrgId);
      expect(initialQuota.tier).toBe("free");
      expect(initialQuota.monthly_limit).toBe(25);
      expect(initialQuota.monthly_endpoints_used).toBe(0);

      // 2. Consume 20 endpoints (Allowed)
      const check1 = db.checkAndIncrementEndpointQuota(testOrgId, 20);
      expect(check1.allowed).toBe(true);
      expect(check1.currentUsage).toBe(20);

      // 3. Attempting to consume 10 more exceeds 25 limit (Blocked)
      const check2 = db.checkAndIncrementEndpointQuota(testOrgId, 10);
      expect(check2.allowed).toBe(false);
      expect(check2.currentUsage).toBe(20);
      expect(check2.limit).toBe(25);

      // 4. Promote to Pro Monthly (500 limit)
      const proQuota = db.promoteOrgQuota(
        testOrgId,
        "pro_monthly",
        "razorpay",
        "pay_test_pro_123",
        2499900,
        "INR",
      );
      expect(proQuota.tier).toBe("pro");
      expect(proQuota.monthly_limit).toBe(500);

      // 5. Now 10 more endpoints succeed
      const check3 = db.checkAndIncrementEndpointQuota(testOrgId, 10);
      expect(check3.allowed).toBe(true);
      expect(check3.currentUsage).toBe(30);

      // 6. Verify transaction logged
      const txs = db.getBillingTransactions(testOrgId);
      expect(txs.length).toBe(1);
      expect(txs[0]?.plan_id).toBe("pro_monthly");
      expect(txs[0]?.currency).toBe("INR");
      expect(txs[0]?.amount_minor).toBe(2499900);
    });

    it("promotes to Enterprise Annual with unlimited endpoints (999999)", () => {
      const db = getDb();
      const entOrgId = "org_enterprise_test_002";

      const entQuota = db.promoteOrgQuota(
        entOrgId,
        "enterprise_annual",
        "stripe",
        "cs_test_ent_999",
        599900,
        "USD",
      );

      expect(entQuota.tier).toBe("enterprise");
      expect(entQuota.monthly_limit).toBe(999999);

      // Consuming 1000 endpoints is allowed for enterprise
      const check = db.checkAndIncrementEndpointQuota(entOrgId, 1000);
      expect(check.allowed).toBe(true);
      expect(check.currentUsage).toBe(1000);
    });
  });
});
