import { describe, it, expect } from "vitest";
import { synthesizeArtifacts, cleanEndpointPath } from "../engine/Synthesizer.js";
import { analyzeWorkflowTarget } from "../engine/SpecForgePipeline.js";

describe("SpecForge Studio v4.0 Epistemic Compiler & Crash-Proof Engineering", () => {
  describe("Bug 3: OpenAPI 3.1 & SDK Path Normalization", () => {
    it("cleans raw template prefix {{BASE_URL}}/v1/customers to /v1/customers", () => {
      expect(cleanEndpointPath("{{BASE_URL}}/v1/customers")).toBe("/v1/customers");
    });

    it("cleans URL-encoded %7B%7BBASE_URL%7D%7D/v1/customers", () => {
      expect(cleanEndpointPath("/%7B%7BBASE_URL%7D%7D/v1/customers")).toBe("/v1/customers");
    });

    it("cleans duplicate slashes or malformed prefix", () => {
      expect(cleanEndpointPath("//v1/customers")).toBe("/v1/customers");
      expect(cleanEndpointPath("/{{BASE_URL}}/v1/charges")).toBe("/v1/charges");
    });

    it("synthesizes clean OpenAPI path without %7B%7B template artifacts", async () => {
      const har = JSON.stringify({
        log: {
          version: "1.2",
          entries: [
            {
              request: {
                method: "GET",
                url: "https://api.stripe.com/v1/customers?limit=10",
                headers: [{ name: "Accept", value: "application/json" }],
              },
              response: {
                status: 200,
                headers: [{ name: "Content-Type", value: "application/json" }],
                content: {
                  mimeType: "application/json",
                  text: '{"object":"list","data":[]}',
                },
              },
            },
          ],
        },
      });

      const analysis = await analyzeWorkflowTarget({
        harPayload: har,
        analysisProfile: "v4.path.test",
      });

      const artifacts = await synthesizeArtifacts(analysis);
      const openApi = JSON.parse(artifacts.openApiJson);

      expect(openApi.paths["/v1/customers"]).toBeDefined();
      expect(openApi.paths["/%7B%7BBASE_URL%7D%7D/v1/customers"]).toBeUndefined();
      expect(openApi.paths["/{{BASE_URL}}/v1/customers"]).toBeUndefined();

      // Verify operationId is cleanly camelCased without 7b7b
      const getOp = openApi.paths["/v1/customers"].get;
      expect(getOp).toBeDefined();
      expect(getOp.operationId).toBe("getV1Customers");
    });
  });

  describe("Bug 4: Replay Evidence & Token Redaction Simulation", () => {
    it("detects redacted tokens and generates clean MCP tool with auth config", async () => {
      const har = JSON.stringify({
        log: {
          version: "1.2",
          entries: [
            {
              request: {
                method: "POST",
                url: "https://api.stripe.com/v1/charges",
                headers: [
                  { name: "Authorization", value: "Bearer <REDACTED_BEARER_TOKEN>" },
                  { name: "Content-Type", value: "application/json" },
                ],
                postData: {
                  mimeType: "application/json",
                  text: '{"amount":2000,"currency":"usd"}',
                },
              },
              response: {
                status: 200,
                headers: [{ name: "Content-Type", value: "application/json" }],
                content: {
                  mimeType: "application/json",
                  text: '{"id":"ch_123","status":"succeeded"}',
                },
              },
            },
          ],
        },
      });

      const analysis = await analyzeWorkflowTarget({
        harPayload: har,
        analysisProfile: "v4.auth.test",
      });

      const artifacts = await synthesizeArtifacts(analysis);
      expect(artifacts.requiredAuthConfigs.length).toBeGreaterThan(0);
      expect(artifacts.mcpServerCode).toContain("server.tool");
    });
  });
});
