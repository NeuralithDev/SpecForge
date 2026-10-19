import { describe, expect, it } from "vitest";
import { sanitizeHarPayload } from "../src/security/HarSanitizer.js";
import { analyzeWorkflowTarget } from "../src/engine/SpecForgePipeline.js";
import { synthesizeArtifacts } from "../src/engine/Synthesizer.js";

/** Deliberately toxic raw HAR payload with secrets planted across all protocol layers. */
const PLANTED_SECRETS = [
  "sensitive_super_secret_bearer_token_9999",
  "dXNlcjpwYXNzd29yZDEyMw==",
  "live_sk_test_api_key_secret_998877",
  "csrf_secret_token_12345",
  "sess_secret_cookie_abcdef123",
  "sec_cookie_val_456",
  "victim_user@confidential-domain.com",
  "victim_user%40confidential-domain.com",
  "toxic_url_access_token_xyz987",
  "toxic_license_key_443322",
  "toxic_client_secret_whisper",
  "toxic_hmac_signature_887766",
  "my_unencrypted_query_pass",
  "prod_live_client_secret_deadbeef1234",
  "toxic_access_token_nested_555",
  "toxic_refresh_token_nested_777",
  "SuperSecretMasterPassword123!",
  "admin_internal@secretcorp.org",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c",
  "4111111111111111",
  "0123456789abcdef0123456789abcdef",
  "leaked_customer@private-bank.com",
  "5500000000000004",
  "212-555-0199",
  "sec_nested_level_4_secret_key_8899",
  "acc_nested_level_4_token_val",
  "ref_nested_level_4_token_val",
  "raw_pass_nested_level_4_secret",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJuYW1lIjoiQWxpY2UiLCJhZG1pbiI6dHJ1ZX0.4PdAUxBGmUMVqT9VDJ4e51-4qE6V6q76g7X73Cq9TqY",
] as const;

const TOXIC_HAR_FIXTURE = JSON.stringify({
  log: {
    version: "1.2",
    creator: { name: "SpecForge-Toxic-Security-Tester", version: "1.0" },
    entries: [
      {
        request: {
          method: "POST",
          url: "https://api.toxic.example.com/v1/auth/exchange?email=victim_user%40confidential-domain.com&token=toxic_url_access_token_xyz987&key=toxic_license_key_443322&secret=toxic_client_secret_whisper&sig=toxic_hmac_signature_887766&password=my_unencrypted_query_pass",
          headers: [
            {
              name: "Authorization",
              value: "Bearer sensitive_super_secret_bearer_token_9999",
            },
            { name: "X-API-Key", value: "live_sk_test_api_key_secret_998877" },
            { name: "X-CSRF-Token", value: "csrf_secret_token_12345" },
            {
              name: "Cookie",
              value:
                "session_id=sess_secret_cookie_abcdef123; sec_token=sec_cookie_val_456",
            },
            { name: "Content-Type", value: "application/json" },
          ],
          queryString: [
            { name: "email", value: "victim_user@confidential-domain.com" },
            { name: "token", value: "toxic_url_access_token_xyz987" },
            { name: "key", value: "toxic_license_key_443322" },
            { name: "secret", value: "toxic_client_secret_whisper" },
            { name: "sig", value: "toxic_hmac_signature_887766" },
            { name: "password", value: "my_unencrypted_query_pass" },
          ],
          cookies: [
            { name: "session_id", value: "sess_secret_cookie_abcdef123" },
            { name: "sec_token", value: "sec_cookie_val_456" },
          ],
          postData: {
            mimeType: "application/json",
            text: JSON.stringify({
              grant_type: "authorization_code",
              client_secret: "prod_live_client_secret_deadbeef1234",
              access_token: "toxic_access_token_nested_555",
              refresh_token: "toxic_refresh_token_nested_777",
              password: "SuperSecretMasterPassword123!",
              email: "admin_internal@secretcorp.org",
              jwt: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c",
              phone: "415-555-2671",
              credit_card: "4111111111111111",
              hex_secret: "0123456789abcdef0123456789abcdef",
            }),
          },
        },
        response: {
          status: 200,
          statusText: "OK",
          headers: [
            { name: "Content-Type", value: "application/json" },
            {
              name: "Set-Cookie",
              value:
                "session_id=sess_secret_cookie_abcdef123; Secure; HttpOnly",
            },
          ],
          cookies: [
            { name: "session_id", value: "sess_secret_cookie_abcdef123" },
          ],
          content: {
            mimeType: "application/json",
            text: JSON.stringify({
              status: "success",
              data: {
                account: {
                  profile: {
                    user_email: "leaked_customer@private-bank.com",
                    billing: {
                      credit_card: "5500000000000004",
                      phone: "212-555-0199",
                    },
                  },
                  security: {
                    oauth: {
                      client_secret: "sec_nested_level_4_secret_key_8899",
                      access_token: "acc_nested_level_4_token_val",
                      refresh_token: "ref_nested_level_4_token_val",
                      password_hash: "raw_pass_nested_level_4_secret",
                    },
                    session: {
                      jwt_token:
                        "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJuYW1lIjoiQWxpY2UiLCJhZG1pbiI6dHJ1ZX0.4PdAUxBGmUMVqT9VDJ4e51-4qE6V6q76g7X73Cq9TqY",
                    },
                  },
                },
              },
            }),
          },
        },
      },
    ],
  },
});

describe("Toxic HAR Sanitizer Verification - Secret and Token Scrubbing", () => {
  it("scrubs 100% of planted PII, tokens, and credentials from all HAR layers", () => {
    const result = sanitizeHarPayload(TOXIC_HAR_FIXTURE);

    // 1. Assert 100% absence of any planted secret or PII substring
    for (const secret of PLANTED_SECRETS) {
      expect(result.sanitizedHar).not.toContain(secret);
    }

    // 2. Assert presence of expected type-preserving placeholders
    expect(result.sanitizedHar).toContain("<REDACTED_BEARER_TOKEN_");
    expect(result.sanitizedHar).toContain("<REDACTED_X_API_KEY_");
    expect(result.sanitizedHar).toContain("<REDACTED_X_CSRF_TOKEN_");
    expect(result.sanitizedHar).toContain("<REDACTED_COOKIE_SESSION_ID_");
    expect(result.sanitizedHar).toContain("<REDACTED_CLIENT_SECRET_");
    expect(result.sanitizedHar).toContain("<REDACTED_ACCESS_TOKEN_");
    expect(result.sanitizedHar).toContain("<REDACTED_REFRESH_TOKEN_");
    expect(result.sanitizedHar).toContain("<REDACTED_PASSWORD_");
    expect(result.sanitizedHar).toContain("<REDACTED_EMAIL_");
    expect(result.sanitizedHar).toContain("<REDACTED_JWT_TOKEN_");
    expect(result.sanitizedHar).toContain("<REDACTED_SECRET_");

    // 3. Assert discovery of dynamic auth tokens from headers and query parameters
    expect(
      result.dynamicTokens.some(
        (t) => t.location === "header" && t.name === "authorization",
      ),
    ).toBe(true);
    expect(
      result.dynamicTokens.some(
        (t) => t.location === "query" && t.name === "token",
      ),
    ).toBe(true);
    expect(
      result.dynamicTokens.some(
        (t) => t.location === "query" && t.name === "key",
      ),
    ).toBe(true);
    expect(
      result.dynamicTokens.some(
        (t) => t.location === "query" && t.name === "secret",
      ),
    ).toBe(true);
  });
});

describe("Toxic HAR Sanitizer Verification - Deep JSON Body Integrity", () => {
  it("scrubs nested request and response bodies while preserving valid structure", () => {
    const result = sanitizeHarPayload(TOXIC_HAR_FIXTURE);
    const sanitizedHarObj = JSON.parse(result.sanitizedHar) as {
      log: {
        entries: Array<{
          request: {
            url: string;
            queryString: Array<{ name: string; value: string }>;
            postData: { text: string };
          };
          response: {
            content: { text: string };
          };
        }>;
      };
    };

    const entry = sanitizedHarObj.log.entries[0]!;
    expect(entry.request.url).not.toContain("victim_user");
    expect(entry.request.url).not.toContain("toxic_url_access_token_xyz987");

    const reqBody = JSON.parse(entry.request.postData.text) as Record<
      string,
      unknown
    >;
    expect(typeof reqBody.client_secret).toBe("string");
    expect(reqBody.client_secret).toMatch(/^<REDACTED_CLIENT_SECRET_/);
    expect(typeof reqBody.access_token).toBe("string");
    expect(reqBody.access_token).toMatch(/^<REDACTED_ACCESS_TOKEN_/);
    expect(typeof reqBody.refresh_token).toBe("string");
    expect(reqBody.refresh_token).toMatch(/^<REDACTED_REFRESH_TOKEN_/);
    expect(typeof reqBody.password).toBe("string");
    expect(reqBody.password).toMatch(/^<REDACTED_PASSWORD_/);
    expect(typeof reqBody.email).toBe("string");
    expect(reqBody.email).toMatch(/^<REDACTED_EMAIL_/);

    const resBody = JSON.parse(entry.response.content.text) as {
      data: {
        account: {
          profile: {
            user_email: string;
            billing: {
              credit_card: string;
              phone: string;
            };
          };
          security: {
            oauth: {
              client_secret: string;
              access_token: string;
              refresh_token: string;
              password_hash: string;
            };
            session: {
              jwt_token: string;
            };
          };
        };
      };
    };

    expect(typeof resBody.data.account.security.oauth.client_secret).toBe(
      "string",
    );
    expect(resBody.data.account.security.oauth.client_secret).toMatch(
      /^<REDACTED_CLIENT_SECRET_/,
    );
    expect(typeof resBody.data.account.security.oauth.access_token).toBe(
      "string",
    );
    expect(resBody.data.account.security.oauth.access_token).toMatch(
      /^<REDACTED_ACCESS_TOKEN_/,
    );
    expect(typeof resBody.data.account.security.oauth.refresh_token).toBe(
      "string",
    );
    expect(resBody.data.account.security.oauth.refresh_token).toMatch(
      /^<REDACTED_REFRESH_TOKEN_/,
    );
    expect(typeof resBody.data.account.security.oauth.password_hash).toBe(
      "string",
    );
    expect(resBody.data.account.security.oauth.password_hash).toMatch(
      /^<REDACTED_PASSWORD_HASH_/,
    );

    expect(typeof resBody.data.account.profile.user_email).toBe("string");
    expect(resBody.data.account.profile.user_email).toMatch(
      /^<REDACTED_USER_EMAIL_/,
    );
    expect(typeof resBody.data.account.profile.billing.credit_card).toBe(
      "string",
    );
    expect(resBody.data.account.profile.billing.credit_card).toMatch(
      /^<REDACTED_CREDIT_CARD_/,
    );
    expect(typeof resBody.data.account.profile.billing.phone).toBe("string");
    expect(resBody.data.account.profile.billing.phone).toMatch(
      /^<REDACTED_PHONE_/,
    );
    expect(typeof resBody.data.account.security.session.jwt_token).toBe(
      "string",
    );
    expect(resBody.data.account.security.session.jwt_token).toMatch(
      /^<REDACTED_JWT_TOKEN_/,
    );
  });
});

describe("Toxic HAR Sanitizer Verification - Synthesis Pipeline", () => {
  it("preserves valid OpenAPI 3.1.0 and Zod schema types through synthesis pipeline", async () => {
    const sanitization = sanitizeHarPayload(TOXIC_HAR_FIXTURE);

    const analysis = await analyzeWorkflowTarget({
      harPayload: sanitization.sanitizedHar,
      analysisProfile: "toxic-har-pipeline-test.v1",
    });

    expect(analysis.endpoints.length).toBeGreaterThan(0);
    expect(analysis.redactions.length).toBeGreaterThan(0);

    const artifacts = await synthesizeArtifacts(analysis);

    // 1. Verify OpenAPI specification validity and absence of secrets
    expect(artifacts.openApiJson).toBeDefined();
    const openApi = JSON.parse(artifacts.openApiJson) as {
      openapi: string;
      paths: Record<
        string,
        Record<
          string,
          { parameters?: Array<{ name: string; schema: { type: string } }> }
        >
      >;
    };

    expect(openApi.openapi).toBe("3.1.0");

    for (const secret of PLANTED_SECRETS) {
      expect(artifacts.openApiJson).not.toContain(secret);
    }

    // 2. Verify MCP Server and Zod parameter generation
    expect(artifacts.mcpServerCode).toContain("z.string().optional()");
    for (const secret of PLANTED_SECRETS) {
      expect(artifacts.mcpServerCode).not.toContain(secret);
    }

    // 3. Verify parity test generation
    for (const secret of PLANTED_SECRETS) {
      expect(artifacts.parityTestsCode).not.toContain(secret);
    }
  });
});
