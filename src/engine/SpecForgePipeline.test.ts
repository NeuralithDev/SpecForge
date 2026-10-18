import { describe, expect, it } from "vitest";
import { analyzeWorkflowTarget } from "./SpecForgePipeline.js";

describe("SpecForgePipeline", () => {
  const sampleHar = JSON.stringify({
    log: {
      version: "1.2",
      creator: { name: "SpecForge Har Capture", version: "1.0" },
      entries: [
        {
          request: {
            method: "POST",
            url: "https://api.example.com/v1/auth/token",
            headers: [
              { name: "Content-Type", value: "application/json" },
              { name: "X-Requested-With", value: "XMLHttpRequest" },
            ],
            queryString: [],
            postData: {
              mimeType: "application/json",
              text: '{"grant_type":"client_credentials"}',
            },
          },
          response: {
            status: 200,
            headers: [
              { name: "Content-Type", value: "application/json" },
              { name: "Set-Cookie", value: "session=xyz123; Path=/; Secure" },
            ],
            content: {
              mimeType: "application/json",
              size: 58,
              text: '{"token_type":"Bearer","access_token":"eySampleToken123"}',
            },
          },
        },
        {
          request: {
            method: "GET",
            url: "https://api.example.com/v1/users?limit=10",
            headers: [
              { name: "Authorization", value: "Bearer eySampleToken123" },
              { name: "X-CSRF-Token", value: "a1b2c3d4e5f60718293a4b5c6d7e8f90" },
            ],
            queryString: [{ name: "limit", value: "10" }],
          },
          response: {
            status: 200,
            headers: [{ name: "Content-Type", value: "application/json" }],
            content: {
              mimeType: "application/json",
              size: 120,
              text: '{"users":[{"id":"usr_1","name":"Alice"}]}',
            },
          },
        },
      ],
    },
  });

  it("analyzes HAR payload and extracts endpoints with Evidence and Unknowns", async () => {
    const result = await analyzeWorkflowTarget({
      harPayload: sampleHar,
      analysisProfile: "specforge.default.v1",
    });

    expect(result.endpoints.length).toBe(2);

    // Verify first endpoint (auth/token)
    const authEndpoint = result.endpoints[0];
    expect(authEndpoint).toBeDefined();
    expect(authEndpoint?.method).toBe("POST");
    expect(authEndpoint?.path).toBe("/v1/auth/token");
    expect(authEndpoint?.status).toBe(200);

    // Verify second endpoint (users)
    const usersEndpoint = result.endpoints[1];
    expect(usersEndpoint).toBeDefined();
    expect(usersEndpoint?.method).toBe("GET");
    expect(usersEndpoint?.path).toBe("/v1/users");
    expect(usersEndpoint?.parameters).toEqual([
      { name: "limit", in: "query", required: false, example: "10" },
    ]);

    // Verify dynamic tokens detected on users endpoint
    expect(usersEndpoint?.dynamicTokens).toContain("Authorization");
    expect(usersEndpoint?.dynamicTokens).toContain("X-CSRF-Token");

    // Verify Evidence records
    expect(result.evidenceRecords.length).toBeGreaterThanOrEqual(3); // 1 capture + 2 endpoints
    for (const record of result.evidenceRecords) {
      expect(record.evidence_id).toMatch(/^ev_[a-f0-9]{64}$/);
      expect(record.provider.id).toBe("specforge.engine");
      expect(record.confidence).toBe("observed");
      expect(record.authority).toBe("shipped-artifact");
      expect(record.locations.length).toBeGreaterThan(0);
    }

    // Verify ResidualUnknowns flagged for dynamic tokens
    expect(result.unknowns.length).toBeGreaterThan(0);
    for (const unknown of result.unknowns) {
      expect(unknown.unknown_id).toMatch(/^unk_[a-f0-9]{64}$/);
      expect(unknown.domain).toBe("api-protocol-token");
      expect(unknown.status).toBe("open");
      expect(unknown.severity).toBe("medium");
      expect(unknown.supporting_evidence_ids.length).toBeGreaterThan(0);
    }

    // Verify Reconstruction Coverage obligation matrix
    expect(result.coverageData.surfaces.length).toBe(2);
    expect(result.coverageData.claims.length).toBe(2);
    expect(result.coverageData.verifier_contracts.length).toBe(2);
    expect(result.coverageData.boundaries.length).toBe(1);

    // Verify Reconstruction closure evaluation
    expect(result.closureResult).toBeDefined();
    expect(result.closureResult.boundary_id).toBe("boundary.specforge.api-surface");
    expect(result.closureResult.status).toBe("ready");
    expect(result.closureResult.summary.required_surfaces).toBe(2);
    expect(result.closureResult.summary.required_claims).toBe(2);
    expect(result.closureResult.summary.reasons).toBe(0);
  });

  it("handles empty input gracefully without failing", async () => {
    const result = await analyzeWorkflowTarget({
      analysisProfile: "specforge.empty.v1",
    });

    expect(result.endpoints).toEqual([]);
    expect(result.evidenceRecords.length).toBe(1);
    expect(result.unknowns).toEqual([]);
    expect(result.closureResult.status).toBe("ready");
  });

  it("dissects javascript bundle AST to discover endpoints", async () => {
    const tempBundlePath = "/tmp/specforge_test_bundle.js";
    const { writeFile, unlink } = await import("node:fs/promises");
    await writeFile(
      tempBundlePath,
      'function checkout() { fetch("/api/v2/checkout", { method: "POST" }); }',
      "utf8",
    );

    try {
      const result = await analyzeWorkflowTarget({
        bundlePath: tempBundlePath,
        analysisProfile: "specforge.bundle.v1",
      });

      expect(result.endpoints.length).toBe(1);
      expect(result.endpoints[0]?.path).toBe("/api/v2/checkout");
      expect(result.evidenceRecords.length).toBeGreaterThanOrEqual(2);
      expect(result.closureResult.status).toBe("ready");
    } finally {
      await unlink(tempBundlePath).catch(() => {});
    }
  });
});

describe("SpecForgePipeline - Deduplication", () => {
  it("gracefully deduplicates multiple HTTP transactions hitting the same endpoint without throwing duplicate surface_id", async () => {
    const multiEntryHar = JSON.stringify({
      log: {
        version: "1.2",
        creator: { name: "SpecForge Har Capture", version: "1.0" },
        entries: [
          {
            request: {
              method: "GET",
              url: "https://www.example.com/v2/search?q=shoes",
              headers: [{ name: "Accept", value: "application/json" }],
              queryString: [{ name: "q", value: "shoes" }],
            },
            response: { status: 200, headers: [] },
          },
          {
            request: {
              method: "GET",
              url: "https://www.example.com/v2/search?q=shirts&page=2",
              headers: [{ name: "Accept", value: "application/json" }],
              queryString: [
                { name: "q", value: "shirts" },
                { name: "page", value: "2" },
              ],
            },
            response: { status: 200, headers: [] },
          },
          {
            request: {
              method: "GET",
              url: "https://www.example.com/v2/search?sort=price",
              headers: [{ name: "Accept", value: "application/json" }],
              queryString: [{ name: "sort", value: "price" }],
            },
            response: { status: 200, headers: [] },
          },
        ],
      },
    });

    const result = await analyzeWorkflowTarget({
      harPayload: multiEntryHar,
      analysisProfile: "specforge.dedup.v1",
    });

    // Should aggregate into a single logical endpoint with merged parameters
    expect(result.endpoints.length).toBe(1);
    expect(result.endpoints[0]?.path).toBe("/v2/search");
    const paramNames = result.endpoints[0]?.parameters.map((p) => p.name);
    expect(paramNames).toContain("q");
    expect(paramNames).toContain("page");
    expect(paramNames).toContain("sort");

    // Must evaluate coverage boundary without any duplicate surface_id error
    expect(result.coverageData.surfaces.length).toBe(1);
    expect(result.closureResult.status).toBe("ready");
  });
});

describe("SpecForgePipeline - Static Asset and Telemetry Filtering", () => {
  it("filters out static assets and telemetry beacons from HAR traffic by default", async () => {
    const noisyHar = JSON.stringify({
      log: {
        version: "1.2",
        entries: [
          // Static stylesheet - should be filtered
          {
            request: {
              method: "GET",
              url: "https://www.example.com/assets/css/main.71633e5b.css",
              headers: [],
            },
            response: {
              status: 200,
              headers: [{ name: "Content-Type", value: "text/css" }],
              content: { mimeType: "text/css" },
            },
          },
          // Image sprite - should be filtered
          {
            request: {
              method: "GET",
              url: "https://www.example.com/assets/img/sprite-6-27.png",
              headers: [],
            },
            response: {
              status: 200,
              headers: [{ name: "Content-Type", value: "image/png" }],
              content: { mimeType: "image/png" },
            },
          },
          // Web font - should be filtered
          {
            request: {
              method: "GET",
              url: "https://www.example.com/fonts/Assistant-Regular.woff2",
              headers: [],
            },
            response: {
              status: 200,
              headers: [{ name: "Content-Type", value: "font/woff2" }],
              content: { mimeType: "font/woff2" },
            },
          },
          // Analytics collect beacon - should be filtered
          {
            request: {
              method: "POST",
              url: "https://www.example.com/j/collect",
              headers: [],
            },
            response: { status: 200, headers: [] },
          },
          // New Relic telemetry - should be filtered
          {
            request: {
              method: "POST",
              url: "https://bam.nr-data.net/events/1/NRJS-49cfe53b",
              headers: [],
            },
            response: { status: 200, headers: [] },
          },
          // Legitimate Business API Endpoint - MUST be kept
          {
            request: {
              method: "POST",
              url: "https://api.example.com/v1/auth/exchange",
              headers: [{ name: "Content-Type", value: "application/json" }],
              postData: {
                mimeType: "application/json",
                text: '{"auth_code":"xyz987"}',
              },
            },
            response: {
              status: 200,
              headers: [{ name: "Content-Type", value: "application/json" }],
              content: {
                mimeType: "application/json",
                text: '{"session_id":"s_123"}',
              },
            },
          },
        ],
      },
    });

    const result = await analyzeWorkflowTarget({
      harPayload: noisyHar,
      analysisProfile: "specforge.filter.v1",
    });

    // 5 noisy entries filtered out, exactly 1 legitimate API endpoint kept
    expect(result.filteredAssetsCount).toBe(5);
    expect(result.endpoints.length).toBe(1);
    expect(result.endpoints[0]?.method).toBe("POST");
    expect(result.endpoints[0]?.path).toBe("/v1/auth/exchange");
  });

  it("preserves static assets when includeStaticAssets is explicitly true", async () => {
    const assetHar = JSON.stringify({
      log: {
        version: "1.2",
        entries: [
          {
            request: {
              method: "GET",
              url: "https://www.example.com/assets/css/main.css",
              headers: [],
            },
            response: {
              status: 200,
              headers: [{ name: "Content-Type", value: "text/css" }],
              content: { mimeType: "text/css" },
            },
          },
        ],
      },
    });

    const result = await analyzeWorkflowTarget({
      harPayload: assetHar,
      analysisProfile: "specforge.unfiltered.v1",
      includeStaticAssets: true,
    });

    expect(result.filteredAssetsCount).toBe(0);
    expect(result.endpoints.length).toBe(1);
    expect(result.endpoints[0]?.path).toBe("/assets/css/main.css");
  });
});
