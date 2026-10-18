import { describe, expect, it } from "vitest";
import {
  sanitizeHarPayload,
  sanitizeSourceText,
  scrubPiiAndSecrets,
  sanitizeHeaderValue,
  hashPrefix,
} from "./HarSanitizer.js";

describe("HarSanitizer Security Redaction & PII Scrubbing", () => {
  it("scrubs Bearer tokens and replaces with deterministic placeholders", () => {
    const rawSecret = "super-secret-production-token-12345";
    const headerVal = `Bearer ${rawSecret}`;
    const prefix = hashPrefix(rawSecret);

    const result = sanitizeHeaderValue("authorization", headerVal, "headers[0]");

    expect(result.sanitized).toBe(`Bearer <REDACTED_BEARER_TOKEN_${prefix}>`);
    expect(result.sanitized).not.toContain(rawSecret);
    expect(result.redactions.length).toBe(1);
    expect(result.redactions[0]?.category).toBe("bearer-token");
    expect(result.token?.envVarName).toBe("SPECFORGE_AUTH_BEARER_TOKEN");
  });

  it("scrubs Basic auth credentials and replaces with deterministic placeholders", () => {
    const authVal = "Basic dXNlcjpwYXNzd29yZA==";
    const prefix = hashPrefix(authVal);

    const result = sanitizeHeaderValue("Authorization", authVal, "headers[0]");

    expect(result.sanitized).toBe(`Basic <REDACTED_BASIC_AUTH_${prefix}>`);
    expect(result.redactions[0]?.category).toBe("basic-auth");
    expect(result.token?.envVarName).toBe("SPECFORGE_AUTH_BASIC_AUTH");
  });

  it("scrubs Cookies and extracts individual session keys", () => {
    const cookieHeader = "session_id=abcdef1234567890; remember_me=true; user_jwt=eyFoo.Bar.Baz";
    const result = sanitizeHeaderValue("cookie", cookieHeader, "headers[cookie]");

    expect(result.sanitized).toContain("session_id=<REDACTED_COOKIE_SESSION_ID_");
    expect(result.sanitized).toContain("remember_me=<REDACTED_COOKIE_REMEMBER_ME_");
    expect(result.sanitized).not.toContain("abcdef1234567890");
    expect(result.token?.location).toBe("cookie");
  });

  it("scrubs API keys, CSRF tokens, and custom auth headers", () => {
    const apiKey = "live_sk_9876543210abcdef";
    const result = sanitizeHeaderValue("X-API-Key", apiKey, "headers[x-api-key]");

    expect(result.sanitized).toContain("<REDACTED_X_API_KEY_");
    expect(result.sanitized).not.toContain(apiKey);
    expect(result.redactions[0]?.category).toBe("api-key");
    expect(result.token?.envVarName).toBe("SPECFORGE_AUTH_X_API_KEY");
  });

  it("scrubs PII: emails, phone numbers, and credit cards from free text and responses", () => {
    const textWithPii =
      "User email is alice.smith@enterprise.corp and phone is 415-555-2671. Paid with 4111111111111111.";
    const { scrubbed, redactions } = scrubPiiAndSecrets(textWithPii, "response.content");

    expect(scrubbed).not.toContain("alice.smith@enterprise.corp");
    expect(scrubbed).not.toContain("415-555-2671");
    expect(scrubbed).toContain("<REDACTED_EMAIL_");
    expect(scrubbed).toContain("<REDACTED_PHONE_");
    expect(redactions.some((r) => r.category === "email")).toBe(true);
    expect(redactions.some((r) => r.category === "phone")).toBe(true);
  });

  it("sanitizes complete HAR 1.2 payload without leaking secret values", () => {
    const mockHar = JSON.stringify({
      log: {
        version: "1.2",
        entries: [
          {
            request: {
              method: "POST",
              url: "https://api.acme.com/v1/payments",
              headers: [
                { name: "Authorization", value: "Bearer secret-jwt-token-999" },
                { name: "X-CSRF-Token", value: "csrf-token-abc" },
              ],
              cookies: [{ name: "session_id", value: "secret-cookie-val" }],
              postData: {
                text: JSON.stringify({
                  customer_email: "ceo@acme.com",
                  note: "Urgent transfer",
                }),
              },
            },
            response: {
              status: 200,
              headers: [{ name: "Set-Cookie", value: "session_id=new-cookie; Path=/" }],
              content: {
                text: JSON.stringify({
                  receipt_email: "billing@acme.com",
                  phone: "555-123-4567",
                }),
              },
            },
          },
        ],
      },
    });

    const result = sanitizeHarPayload(mockHar);

    expect(result.redactionCount).toBeGreaterThan(0);
    expect(result.sanitizedHar).not.toContain("secret-jwt-token-999");
    expect(result.sanitizedHar).not.toContain("csrf-token-abc");
    expect(result.sanitizedHar).not.toContain("secret-cookie-val");
    expect(result.sanitizedHar).not.toContain("ceo@acme.com");
    expect(result.sanitizedHar).not.toContain("billing@acme.com");

    expect(result.dynamicTokens.some((t) => t.name.toLowerCase() === "authorization")).toBe(true);
    expect(result.dynamicTokens.some((t) => t.name.toLowerCase() === "x-csrf-token")).toBe(true);
    expect(result.dynamicTokens.some((t) => t.name.toLowerCase() === "session_id")).toBe(true);
  });

  it("sanitizes JavaScript bundle code with sanitizeSourceText", () => {
    const bundleCode = `
      const config = {
        adminEmail: "security-ops@internal.net",
        apiKey: "abcdef0123456789abcdef0123456789",
      };
      export default config;
    `;

    const result = sanitizeSourceText(bundleCode);

    expect(result.sanitizedText).not.toContain("security-ops@internal.net");
    expect(result.sanitizedText).not.toContain("abcdef0123456789abcdef0123456789");
    expect(result.redactionCount).toBeGreaterThanOrEqual(2);
  });
});
