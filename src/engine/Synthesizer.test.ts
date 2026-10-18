import { describe, expect, it } from "vitest";
import { analyzeWorkflowTarget } from "./SpecForgePipeline.js";
import {
  synthesizeArtifacts,
  EpistemicGuardrailViolationError,
} from "./Synthesizer.js";

describe("Synthesizer", () => {
  const sampleHar = JSON.stringify({
    log: {
      version: "1.2",
      entries: [
        {
          request: {
            method: "POST",
            url: "https://api.example.com/v1/auth/token",
            headers: [{ name: "Content-Type", value: "application/json" }],
            queryString: [],
            postData: {
              mimeType: "application/json",
              text: '{"client_id":"app_123"}',
            },
          },
          response: {
            status: 200,
            headers: [{ name: "Content-Type", value: "application/json" }],
            content: {
              mimeType: "application/json",
              text: '{"access_token":"eyHeader.Payload.Sig"}',
            },
          },
        },
        {
          request: {
            method: "GET",
            url: "https://api.example.com/v1/profile?lim=5",
            headers: [
              { name: "Authorization", value: "Bearer eyHeader.Payload.Sig" },
              { name: "X-CSRF-Token", value: "csrf_token_abc" },
            ],
            queryString: [{ name: "lim", value: "5" }],
          },
          response: {
            status: 200,
            headers: [{ name: "Content-Type", value: "application/json" }],
            content: {
              mimeType: "application/json",
              text: '{"id":"usr_42","name":"Test User"}',
            },
          },
        },
      ],
    },
  });

  it("synthesizes OpenAPI 3.1, MCP Server, Client SDK and Parity Tests", async () => {
    const analysis = await analyzeWorkflowTarget({
      harPayload: sampleHar,
      analysisProfile: "specforge.synthesizer.test",
    });

    const artifacts = await synthesizeArtifacts(analysis);

    // 1. Verify OpenAPI 3.1 Spec
    expect(artifacts.openApiSpec.openapi).toBe("3.1.0");
    const paths = artifacts.openApiSpec.paths as Record<string, any>;
    expect(paths["/v1/auth/token"]?.post).toBeDefined();
    expect(paths["/v1/profile"]?.get).toBeDefined();
    expect(paths["/v1/profile"]?.get["x-evidence-id"]).toMatch(/^ev_/);

    // Dynamic headers declared
    const profileParams = paths["/v1/profile"]?.get.parameters;
    expect(profileParams.some((p: any) => p.name === "Authorization")).toBe(true);
    expect(profileParams.some((p: any) => p.name === "X-CSRF-Token")).toBe(true);

    // 2. Verify MCP Server Code
    expect(artifacts.mcpServerCode).toContain("McpServer");
    expect(artifacts.mcpServerCode).toContain("StdioServerTransport");
    expect(artifacts.mcpServerCode).toContain('server.tool(');
    expect(artifacts.mcpServerCode).toContain("SPECFORGE_AUTH_AUTHORIZATION");
    expect(artifacts.mcpServerCode).toContain("SPECFORGE_AUTH_X_CSRF_TOKEN");

    // 3. Verify Client SDK Code
    expect(artifacts.clientCode).toContain("export class SpecForgeClient");
    expect(artifacts.clientCode).toContain("postV1AuthToken");
    expect(artifacts.clientCode).toContain("getV1Profile");
    expect(artifacts.clientCode).toContain("Missing required auth token 'Authorization'");

    // 4. Verify Parity Tests Code
    expect(artifacts.parityTestsCode).toContain("SpecForge Reconstruction Parity Tests");
    expect(artifacts.parityTestsCode).toContain("satisfies ReconstructionCoverage contract");
    expect(artifacts.parityTestsCode).toContain("getV1Profile");

    // 5. Verify Residual Unknown Requirements
    expect(artifacts.requiredAuthConfigs.length).toBeGreaterThanOrEqual(2);
    expect(artifacts.requiredAuthConfigs.some((a) => a.tokenName === "Authorization")).toBe(true);
    expect(artifacts.requiredAuthConfigs.some((a) => a.tokenName === "X-CSRF-Token")).toBe(true);
    expect(artifacts.warnings.length).toBeGreaterThanOrEqual(2);
  });

  it("violates epistemic guardrail if an unbacked hallucinated endpoint is introduced", async () => {
    const analysis = await analyzeWorkflowTarget({
      harPayload: sampleHar,
      analysisProfile: "specforge.synthesizer.test",
    });

    // Artificially inject an unbacked endpoint
    const tamperedAnalysis = {
      ...analysis,
      endpoints: [
        ...analysis.endpoints,
        {
          method: "DELETE",
          url: "https://api.example.com/v1/danger_invented_endpoint",
          path: "/v1/danger_invented_endpoint",
          parameters: [],
          requestHeaders: {},
          responseHeaders: {},
          dynamicTokens: [],
          evidenceId: "ev_0000000000000000000000000000000000000000000000000000000000000000",
          surfaceId: "surface.danger",
          claimId: "claim.danger",
        },
      ],
    };

    await expect(synthesizeArtifacts(tamperedAnalysis)).rejects.toThrow(
      EpistemicGuardrailViolationError,
    );
  });
});
