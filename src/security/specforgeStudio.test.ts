import { describe, expect, it } from "vitest";
import { sanitizeHarPayload } from "./HarSanitizer.js";
import { validateTargetUrlSafety, SsrfBlockedError } from "./ssrfGuard.js";
import { DEMO_HAR_PAYLOAD } from "../../apps/web/lib/demoHar.js";
import { interpolateVariables, FREE_TIER_COMPILED_LIMIT, type Environment } from "../../apps/web/lib/localStore.js";

describe("SpecForge Studio - Local-First API Client Workflows", () => {
  describe("Workflow B: Local-First Store & Variable Interpolation", () => {
    const testEnv: Environment = {
      id: "env_test",
      name: "Stripe Production",
      variables: [
        { id: "v1", key: "BASE_URL", value: "https://api.stripe.com", enabled: true },
        { id: "v2", key: "BEARER_TOKEN", value: "sk_test_mock_token_99", enabled: true, isSecret: true },
        { id: "v3", key: "DISABLED_KEY", value: "should_not_interpolate", enabled: false },
      ],
    };

    it("interpolates {{BASE_URL}} and {{BEARER_TOKEN}} into endpoint URLs and headers", () => {
      const url = "{{BASE_URL}}/v1/charges";
      const header = "Bearer {{BEARER_TOKEN}}";

      expect(interpolateVariables(url, testEnv)).toBe("https://api.stripe.com/v1/charges");
      expect(interpolateVariables(header, testEnv)).toBe("Bearer sk_test_mock_token_99");
    });

    it("leaves disabled variables un-interpolated", () => {
      expect(interpolateVariables("X-Key: {{DISABLED_KEY}}", testEnv)).toBe("X-Key: {{DISABLED_KEY}}");
    });

    it("enforces 25-endpoint limit on the Free Scratchpad tier", () => {
      expect(FREE_TIER_COMPILED_LIMIT).toBe(25);
    });
  });

  describe("Workflow A: .har Magic Ingestion & HarSanitizer Integrity", () => {
    it("scrubs credentials and cookies from demo HAR into placeholders", () => {
      const sanitized = sanitizeHarPayload(DEMO_HAR_PAYLOAD);

      // Verify no live tokens remain
      expect(sanitized.sanitizedHar).not.toContain("mock_live_stripe_customer_token_scrubbed_9901");
      expect(sanitized.sanitizedHar).not.toContain("live_sess_cookie_99812");

      // Verify placeholders
      expect(sanitized.sanitizedHar).toContain("<REDACTED_BEARER_");
      expect(sanitized.redactionCount).toBeGreaterThan(0);
      expect(sanitized.dynamicTokens.length).toBeGreaterThan(0);
    });
  });

  describe("Workflow C: SSRF Guard on Request Proxy", () => {
    it("strictly blocks cloud metadata IPs (169.254.169.254)", async () => {
      await expect(validateTargetUrlSafety("http://169.254.169.254/latest/meta-data")).rejects.toThrow(
        SsrfBlockedError,
      );
    });

    it("strictly blocks private RFC-1918 subnets (10.0.0.1, 192.168.0.1)", async () => {
      await expect(validateTargetUrlSafety("http://10.0.0.1/internal")).rejects.toThrow(
        SsrfBlockedError,
      );
      await expect(validateTargetUrlSafety("http://192.168.1.1/admin")).rejects.toThrow(
        SsrfBlockedError,
      );
    });

    it("permits valid external HTTPS requests", async () => {
      const url = await validateTargetUrlSafety("https://api.github.com/zen");
      expect(url.hostname).toBe("api.github.com");
    });
  });
});
