import { describe, it, expect } from "vitest";
import { parseCurlCommand, serializeToCurl } from "../../apps/web/lib/curlParser";
import { analyzeSchemaDrift } from "../../apps/web/lib/schemaDrift";
import { extractValueFromJsonPath, applyVariableChaining, Environment } from "../../apps/web/lib/localStore";

describe("SpecForge Studio v3.0 Advanced Features", () => {
  describe("Feature 2: Smart cURL Parser", () => {
    it("parses method, headers, auth, and JSON body correctly", () => {
      const curl = `curl -X POST https://api.stripe.com/v1/charges \\
        -H "Authorization: Bearer sk_test_123" \\
        -H "Content-Type: application/json" \\
        -d '{"amount": 2000, "currency": "usd"}'`;

      const parsed = parseCurlCommand(curl);
      expect(parsed).not.toBeNull();
      expect(parsed?.method).toBe("POST");
      expect(parsed?.url).toBe("https://api.stripe.com/v1/charges");
      expect(parsed?.headers.find((h) => h.key === "Content-Type")?.value).toBe("application/json");
      expect(parsed?.auth.type).toBe("bearer");
      expect(parsed?.auth.bearerToken).toBe("sk_test_123");
      expect(parsed?.body.type).toBe("json");
      expect(JSON.parse(parsed?.body.rawJson || "{}")).toEqual({ amount: 2000, currency: "usd" });
    });

    it("serializes an endpoint back to reproducible cURL", () => {
      const curlStr = serializeToCurl({
        method: "PUT",
        url: "https://api.example.com/items/42",
        headers: [{ id: "h1", key: "X-Custom", value: "hello", enabled: true }],
        body: { type: "json", rawJson: '{"name":"widget"}' },
      });
      expect(curlStr).toContain('curl -X PUT "https://api.example.com/items/42"');
      expect(curlStr).toContain('-H "X-Custom: hello"');
      expect(curlStr).toContain('--data-raw "{\\"name\\":\\"widget\\"}"');
    });
  });

  describe("Feature 3: Variable Chaining (Response-to-Env Extractor)", () => {
    it("extracts nested jsonpath fields and updates active environment", () => {
      const responsePayload = {
        status: "succeeded",
        data: {
          id: "ch_3N123456789",
          customer: {
            id: "cus_98765",
            email: "alice@example.com",
          },
        },
      };

      expect(extractValueFromJsonPath(responsePayload, "data.id")).toBe("ch_3N123456789");
      expect(extractValueFromJsonPath(responsePayload, "data.customer.email")).toBe("alice@example.com");

      const rules = [
        {
          id: "rule-1",
          jsonPath: "data.id",
          envVarName: "LAST_CHARGE_ID",
          enabled: true,
        },
        {
          id: "rule-2",
          jsonPath: "data.customer.email",
          envVarName: "CUSTOMER_EMAIL",
          enabled: true,
        },
      ];

      const env: Environment = {
        id: "env-1",
        name: "Test Env",
        variables: [{ id: "v1", key: "BASE_URL", value: "https://api.stripe.com", enabled: true }],
      };

      const result = applyVariableChaining(responsePayload, rules, env);

      expect(result.extracted).toHaveLength(2);
      expect(result.extracted[0]).toEqual({ key: "LAST_CHARGE_ID", value: "ch_3N123456789", path: "data.id" });
      expect(result.updatedEnv?.variables.find((v) => v.key === "LAST_CHARGE_ID")?.value).toBe("ch_3N123456789");
      expect(result.updatedEnv?.variables.find((v) => v.key === "CUSTOMER_EMAIL")?.value).toBe("alice@example.com");
    });
  });

  describe("Feature 4: Schema Drift & Parity Detector", () => {
    it("detects 100% schema match on identical structures", () => {
      const baseline = { id: "123", amount: 50, active: true };
      const live = { id: "456", amount: 100, active: false };

      const drift = analyzeSchemaDrift(baseline, live);
      expect(drift.isCompleteMatch).toBe(true);
      expect(drift.matchPercentage).toBe(100);
      expect(drift.driftCount).toBe(0);
    });

    it("detects missing keys, added fields, and type mismatches", () => {
      const baseline = {
        id: "123",
        amount: 50,
        metadata: { tier: "pro" },
      };
      const live = {
        id: "123",
        amount: "50", // type mismatch: string instead of number
        metadata: { tier: "pro", region: "us-east-1" }, // added field
      };

      const drift = analyzeSchemaDrift(baseline, live);
      expect(drift.isCompleteMatch).toBe(false);
      expect(drift.items.length).toBeGreaterThan(0);

      const typeMismatch = drift.items.find((d) => d.status === "type_mismatch" && d.path === "amount");
      expect(typeMismatch).toBeDefined();
      expect(typeMismatch?.expectedType).toBe("number");
      expect(typeMismatch?.actualType).toBe("string");

      const addedField = drift.items.find((d) => d.status === "new_field" && d.path === "metadata.region");
      expect(addedField).toBeDefined();
    });
  });
});
