import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Calculates HMAC SHA-256 hex signature for Razorpay webhooks.
 */
export function calculateRazorpaySignature(rawPayload: string, secret: string): string {
  return createHmac("sha256", secret).update(rawPayload).digest("hex");
}

/**
 * Verifies the authenticity of a Razorpay webhook using cryptographic timing-safe HMAC SHA-256 comparison.
 */
export function verifyRazorpayWebhookSignature(
  rawPayload: string,
  signatureHeader: string | null | undefined,
  secret: string,
): boolean {
  if (!signatureHeader || !secret) {
    return false;
  }

  const expectedSignature = calculateRazorpaySignature(rawPayload, secret);

  const expectedBuffer = Buffer.from(expectedSignature, "utf8");
  const actualBuffer = Buffer.from(signatureHeader, "utf8");

  if (expectedBuffer.length !== actualBuffer.length) {
    return false;
  }

  return timingSafeEqual(expectedBuffer, actualBuffer);
}

/**
 * Calculates Stripe webhook signature header format (`t=timestamp,v1=signature`).
 */
export function calculateStripeSignature(
  rawPayload: string,
  secret: string,
  timestamp: number,
): string {
  const signedPayload = `${timestamp}.${rawPayload}`;
  const hmac = createHmac("sha256", secret).update(signedPayload).digest("hex");
  return `t=${timestamp},v1=${hmac}`;
}

/**
 * Verifies a Stripe webhook signature header with cryptographic HMAC SHA-256 and anti-replay timestamp tolerance.
 */
export function verifyStripeWebhookSignature(
  rawPayload: string,
  signatureHeader: string | null | undefined,
  secret: string,
  toleranceSeconds: number = 300,
  nowSeconds: number = Math.floor(Date.now() / 1000),
): boolean {
  if (!signatureHeader || !secret) {
    return false;
  }

  // Parse header: t=1612345678,v1=abcdef...,v0=...
  const parts = signatureHeader.split(",");
  let timestampStr: string | undefined;
  const signatures: string[] = [];

  for (const part of parts) {
    const [key, value] = part.trim().split("=");
    if (key === "t") {
      timestampStr = value;
    } else if (key === "v1" && value) {
      signatures.push(value);
    }
  }

  if (!timestampStr || signatures.length === 0) {
    return false;
  }

  const timestamp = Number(timestampStr);
  if (isNaN(timestamp)) {
    return false;
  }

  // Replay Attack Defense: enforce timestamp freshness
  if (Math.abs(nowSeconds - timestamp) > toleranceSeconds) {
    return false;
  }

  const signedPayload = `${timestampStr}.${rawPayload}`;
  const expectedHmac = createHmac("sha256", secret).update(signedPayload).digest("hex");
  const expectedBuffer = Buffer.from(expectedHmac, "utf8");

  // Validate against any supplied v1 signature with timingSafeEqual
  for (const sig of signatures) {
    const actualBuffer = Buffer.from(sig, "utf8");
    if (expectedBuffer.length === actualBuffer.length && timingSafeEqual(expectedBuffer, actualBuffer)) {
      return true;
    }
  }

  return false;
}
