import type { AnalysisState } from "./types";

export const INITIAL_SAMPLE_STATE: AnalysisState = {
  targetSha256: "6d14aef436df1bd65e327698daa710c726f4706e472492513303c07e87c14034",
  targetName: "production-checkout-session.har",
  targetType: "har",
  coverageScore: 94.2,
  closureStatus: "ready",
  endpoints: [
    {
      method: "POST",
      url: "https://api.acme.cloud/v1/auth/exchange",
      path: "/v1/auth/exchange",
      status: 200,
      parameters: [],
      requestHeaders: {
        "content-type": "application/json",
        "accept": "application/json",
      },
      responseHeaders: {
        "content-type": "application/json",
        "set-cookie": "session_id=s_98b712fa; Secure; HttpOnly",
      },
      dynamicTokens: [],
      evidenceId: "ev_39ef9d93d70daee195dd86bd2194940cdf1ae793bfa34eb1e9f757b616b39d69",
      surfaceId: "surface.endpoint.post.v1_auth_exchange",
      claimId: "claim.endpoint.post.v1_auth_exchange",
    },
    {
      method: "GET",
      url: "https://api.acme.cloud/v1/customers/profile?expand=billing",
      path: "/v1/customers/profile",
      status: 200,
      parameters: [
        { name: "expand", in: "query", required: false, example: "billing" },
      ],
      requestHeaders: {
        "authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
        "x-csrf-token": "cf_token_889a012b",
        "accept": "application/json",
      },
      responseHeaders: {
        "content-type": "application/json",
      },
      dynamicTokens: ["Authorization", "X-CSRF-Token"],
      evidenceId: "ev_710c92eb4417e0eebbf6b06bc3948696a798ede52fbb0117e2cf54afbcf2f559",
      surfaceId: "surface.endpoint.get.v1_customers_profile",
      claimId: "claim.endpoint.get.v1_customers_profile",
    },
    {
      method: "POST",
      url: "https://api.acme.cloud/v1/orders/checkout",
      path: "/v1/orders/checkout",
      status: 201,
      parameters: [
        { name: "currency", in: "body", required: true, example: "USD" },
        { name: "items", in: "body", required: true, example: "[{\"sku\":\"item_9\"}]" },
      ],
      requestHeaders: {
        "authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
        "idempotency-key": "idemp_5521a00f-4491",
        "content-type": "application/json",
      },
      responseHeaders: {
        "content-type": "application/json",
        "location": "/v1/orders/ord_99014",
      },
      dynamicTokens: ["Authorization"],
      evidenceId: "ev_99e33810f44bc7a1a011de548810bcaf301192837261a8f9001ba77218ac9120",
      surfaceId: "surface.endpoint.post.v1_orders_checkout",
      claimId: "claim.endpoint.post.v1_orders_checkout",
    },
    {
      method: "GET",
      url: "https://api.acme.cloud/v1/telemetry/heartbeat",
      path: "/v1/telemetry/heartbeat",
      status: 204,
      parameters: [],
      requestHeaders: {
        "user-agent": "Acme-Client/2.4.0",
      },
      responseHeaders: {
        "cache-control": "no-cache",
      },
      dynamicTokens: [],
      evidenceId: "ev_12ab88091cae77102049ba3011ecaf8900451a238491823901ba1928001fa877",
      surfaceId: "surface.endpoint.get.v1_telemetry_heartbeat",
      claimId: "claim.endpoint.get.v1_telemetry_heartbeat",
    },
  ],
  evidenceRecords: [
    {
      evidence_id: "ev_39ef9d93d70daee195dd86bd2194940cdf1ae793bfa34eb1e9f757b616b39d69",
      operation: "dissect_endpoint",
      confidence: "observed",
      authority: "shipped-artifact",
      locations: [
        { kind: "artifact-path", path: "/captures/production-checkout-session.har" },
        { kind: "file-offset", offset: 1204 },
      ],
    },
    {
      evidence_id: "ev_710c92eb4417e0eebbf6b06bc3948696a798ede52fbb0117e2cf54afbcf2f559",
      operation: "dissect_endpoint",
      confidence: "observed",
      authority: "shipped-artifact",
      locations: [
        { kind: "artifact-path", path: "/captures/production-checkout-session.har" },
        { kind: "file-offset", offset: 3840 },
      ],
    },
    {
      evidence_id: "ev_99e33810f44bc7a1a011de548810bcaf301192837261a8f9001ba77218ac9120",
      operation: "dissect_endpoint",
      confidence: "observed",
      authority: "shipped-artifact",
      locations: [
        { kind: "artifact-path", path: "/captures/production-checkout-session.har" },
        { kind: "file-offset", offset: 7420 },
      ],
    },
  ],
  unknowns: [
    {
      unknown_id: "unk_f8a01192bba710c9201488bcfa00192837418293a8b00192ca7819283011a0bb",
      question: "How is the dynamic JWT token in header 'Authorization' signed and rotated across session expiry?",
      severity: "high",
      domain: "api-protocol-token",
      status: "open",
      supporting_evidence_ids: [
        "ev_710c92eb4417e0eebbf6b06bc3948696a798ede52fbb0117e2cf54afbcf2f559",
      ],
      envVarName: "SPECFORGE_AUTH_AUTHORIZATION",
    },
    {
      unknown_id: "unk_47a49910ba771ca002938810facc001928371829001ba781920391823011ca99",
      question: "How is the dynamic token in header 'X-CSRF-Token' generated and verified for endpoint 'GET /v1/customers/profile'?",
      severity: "medium",
      domain: "api-protocol-token",
      status: "open",
      supporting_evidence_ids: [
        "ev_710c92eb4417e0eebbf6b06bc3948696a798ede52fbb0117e2cf54afbcf2f559",
      ],
      envVarName: "SPECFORGE_AUTH_X_CSRF_TOKEN",
    },
  ],
  requiredAuthConfigs: [
    {
      tokenName: "Authorization",
      unknownId: "unk_f8a01192bba710c9...",
      envVarName: "SPECFORGE_AUTH_AUTHORIZATION",
    },
    {
      tokenName: "X-CSRF-Token",
      unknownId: "unk_47a49910ba771ca0...",
      envVarName: "SPECFORGE_AUTH_X_CSRF_TOKEN",
    },
  ],
  openApiJson: `{
  "openapi": "3.1.0",
  "info": {
    "title": "Acme Cloud Synthesized API",
    "version": "1.0.0",
    "description": "Grounded in Evidence Target SHA-256: 6d14aef436df1bd65e327698daa710c726f4706e472492513303c07e87c14034",
    "x-specforge-evidence-count": 4
  },
  "paths": {
    "/v1/auth/exchange": {
      "post": {
        "summary": "Exchange credentials for session token",
        "operationId": "postV1AuthExchange",
        "x-evidence-id": "ev_39ef9d93d70daee195dd86bd2194940cdf1ae793bfa34eb1e9f757b616b39d69",
        "responses": { "200": { "description": "Success" } }
      }
    },
    "/v1/customers/profile": {
      "get": {
        "summary": "Retrieve authenticated customer profile",
        "operationId": "getV1CustomersProfile",
        "x-evidence-id": "ev_710c92eb4417e0eebbf6b06bc3948696a798ede52fbb0117e2cf54afbcf2f559",
        "parameters": [
          { "name": "expand", "in": "query", "schema": { "type": "string" } },
          { "name": "Authorization", "in": "header", "required": true, "schema": { "type": "string" } },
          { "name": "X-CSRF-Token", "in": "header", "required": true, "schema": { "type": "string" } }
        ],
        "responses": { "200": { "description": "Success" } }
      }
    }
  }
}`,
  mcpServerCode: `import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

// SPECFORGE EPISTEMIC GUARDRAIL: Required Auth Tokens
const authTokens: Record<string, string> = {
  "Authorization": process.env.SPECFORGE_AUTH_AUTHORIZATION ?? "",
  "X-CSRF-Token": process.env.SPECFORGE_AUTH_X_CSRF_TOKEN ?? "",
};

export function createServer(): McpServer {
  const server = new McpServer({
    name: "acme-cloud-mcp-server",
    version: "1.0.0",
  });

  server.tool(
    "getV1CustomersProfile",
    "Retrieve customer profile. Grounded in Evidence ev_710c92eb4417e0eebbf6b06bc3948696a798ede52fbb0117e2cf54afbcf2f559",
    { expand: z.string().optional() },
    async (params) => {
      const url = new URL("https://api.acme.cloud/v1/customers/profile");
      if (params.expand) url.searchParams.set("expand", params.expand);
      const res = await fetch(url.toString(), {
        headers: { "Accept": "application/json", ...authTokens },
      });
      return { content: [{ type: "text", text: await res.text() }] };
    }
  );

  return server;
}

if (process.argv[1] && import.meta.url.endsWith(process.argv[1])) {
  const server = createServer();
  await server.connect(new StdioServerTransport());
}`,
  clientCode: `export interface GetCustomersProfileParams {
  readonly expand?: string;
}

export class SpecForgeClient {
  constructor(private readonly options: { baseUrl?: string; authTokens?: Record<string, string> } = {}) {}

  async getV1CustomersProfile(params: GetCustomersProfileParams = {}) {
    if (!this.options.authTokens?.["Authorization"]) {
      throw new Error("Missing required dynamic token: Authorization (SPECFORGE_AUTH_AUTHORIZATION)");
    }
    const url = new URL("/v1/customers/profile", this.options.baseUrl ?? "https://api.acme.cloud");
    if (params.expand) url.searchParams.set("expand", params.expand);
    const res = await fetch(url.toString(), {
      headers: { "Accept": "application/json", ...(this.options.authTokens ?? {}) },
    });
    return { status: res.status, data: await res.json() };
  }
}`,
  parityTestsCode: `import { describe, expect, it } from "vitest";
import { SpecForgeClient } from "./client.js";

describe("Acme Cloud Parity Test Suite", () => {
  it("satisfies obligation for GET /v1/customers/profile", async () => {
    const fakeFetch: typeof fetch = async () => new Response(JSON.stringify({ id: "usr_42" }), { status: 200 });
    const client = new SpecForgeClient({ fetch: fakeFetch, authTokens: { "Authorization": "test_token" } });
    const res = await client.getV1CustomersProfile({ expand: "billing" });
    expect(res.status).toBe(200);
    expect(res.data).toBeDefined();
  });
});`,
  projectId: "00000000-0000-0000-0000-000000000001",
  redactionCount: 2,
  telemetry: {
    sanitize_ms: 1.45,
    ssrf_ms: 0.82,
    dissect_ms: 4.12,
    obligation_eval_ms: 2.35,
    synthesize_ms: 8.64,
    total_ms: 17.38,
  },
  auditCertificate: `# SPECFORGE EPISTEMIC AUDIT CERTIFICATE
**Document ID:** \`CERT-6D14AEF436DF1BD6\`  
**Certified Date:** \`2026-10-17T22:00:00.000Z\`  
**Client / Organization:** \`Enterprise Demo Corp\`  
**Target Project:** \`production-capture.har\`  

---

### [SEAL OF EPISTEMIC VERIFICATION]
> **VERIFICATION STATUS: 100% DETERMINISTICALLY VERIFIED**  
> **ZERO-HALLUCINATION GUARANTEE:** PASSED  
> **EVIDENCE CLOSURE STATUS:** \`COMPLETE\`  
> **RECONSTRUCTION OBLIGATION COVERAGE:** \`100.00%\`  

---

## 1. Executive Summary & Epistemic Guarantee
This document certifies that all synthesized artifacts in this package—including the OpenAPI 3.1 specification, Model Context Protocol (MCP) server, TypeScript client SDK, and Vitest obligation parity test suite—were extracted and synthesized under strict deterministic verification rules.

**Epistemic Anti-Hallucination Policy:**  
Every endpoint URL, HTTP method, parameter location, header schema, and response format in this repository is cryptographically anchored to byte-level evidence in the target capture ledger. SpecForge's hard guardrail guarantees that zero endpoints or schema definitions were generated through LLM speculation or unbacked inference.

---

## 2. Cryptographic Evidence Ledger
| Metric | Value | Verification Mechanism |
| :--- | :--- | :--- |
| **Primary Target SHA-256** | \`6d14aef436df1bd65e327698daa710c726f4706e472492513303c07e87c14034\` | SHA-256 Canonical Digest |
| **Total Discovered Endpoints** | \`2\` | Verified via AST / HAR Traffic Analysis |
| **Immutable Evidence Records** | \`4\` | Cryptographic Ledger IDs (\`ev_*\`) |
| **Residual Unknowns Cataloged** | \`2\` | Isolated Auth & Signature Invariants |
| **Zero-Leak Redactions Applied** | \`2\` | Pre-processing SHA-256 Salted Redaction |

---
*Certified by SpecForge Epistemic Verification Engine v1.0.0. All rights reserved.*
`,
};

export const SAMPLE_ANALYSIS_STATE = INITIAL_SAMPLE_STATE;
