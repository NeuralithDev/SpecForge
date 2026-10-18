import { describe, expect, it } from "vitest";
import { analyzeWorkflowTarget } from "./SpecForgePipeline.js";
import { synthesizeArtifacts } from "./Synthesizer.js";
import { packageProjectBundle } from "./BundlePackager.js";

describe("BundlePackager Enterprise Deliverable Generator", () => {
  it("packages a complete, self-contained project archive with all 8 files", async () => {
    const mockHar = JSON.stringify({
      log: {
        version: "1.2",
        entries: [
          {
            request: {
              method: "GET",
              url: "https://api.github.com/repos/octocat/hello-world",
              headers: [
                { name: "Authorization", value: "Bearer ghp_secret_token_123" },
                { name: "Accept", value: "application/json" },
              ],
              queryString: [{ name: "per_page", value: "30" }],
            },
            response: {
              status: 200,
              headers: [{ name: "Content-Type", value: "application/json" }],
              content: {
                text: JSON.stringify({
                  id: 1296269,
                  name: "Hello-World",
                  full_name: "octocat/Hello-World",
                }),
              },
            },
          },
        ],
      },
    });

    const analysis = await analyzeWorkflowTarget({
      harPayload: mockHar,
      analysisProfile: "specforge.enterprise.v1",
    });

    const synthesis = await synthesizeArtifacts(analysis);

    const bundle = await packageProjectBundle({
      analysis,
      synthesis,
      metadata: {
        projectName: "Enterprise-GitHub-Bridge",
        orgName: "Acme Corp Global",
      },
    });

    expect(bundle.fileCount).toBe(8);
    expect(bundle.files["package.json"]).toBeDefined();
    expect(bundle.files["tsconfig.json"]).toBeDefined();
    expect(bundle.files["openapi.json"]).toBeDefined();
    expect(bundle.files[".env.example"]).toBeDefined();
    expect(bundle.files["EPISTEMIC_AUDIT_CERTIFICATE.md"]).toBeDefined();
    expect(bundle.files["src/mcp-server.ts"]).toBeDefined();
    expect(bundle.files["src/client.ts"]).toBeDefined();
    expect(bundle.files["tests/client.parity.test.ts"]).toBeDefined();

    // Verify package.json contains correct dependencies
    const parsedPkg = JSON.parse(bundle.files["package.json"]!);
    expect(parsedPkg.dependencies["@modelcontextprotocol/sdk"]).toBeDefined();
    expect(parsedPkg.dependencies.zod).toBeDefined();
    expect(parsedPkg.scripts.test).toBe("vitest run");

    // Verify .env.example contains extracted authorization variables
    expect(bundle.files[".env.example"]).toContain("SPECFORGE_API_BASE_URL");
    expect(bundle.files[".env.example"]).toContain("SPECFORGE_AUTH_");

    // Verify Epistemic Audit Certificate content
    const cert = bundle.certificateMarkdown;
    expect(cert).toContain("# SPECFORGE EPISTEMIC AUDIT CERTIFICATE");
    expect(cert).toContain("VERIFICATION STATUS: 100% DETERMINISTICALLY VERIFIED");
    expect(cert).toContain("ZERO-HALLUCINATION GUARANTEE");
    expect(cert).toContain("Acme Corp Global");
    expect(cert).toContain("Enterprise-GitHub-Bridge");
    expect(cert).toContain(analysis.targetSha256);

    // Verify in-memory ZIP generation
    const zipBytes = await bundle.createZipBuffer();
    expect(zipBytes).toBeInstanceOf(Uint8Array);
    expect(zipBytes.byteLength).toBeGreaterThan(500);

    // Verify ZIP magic header: 'PK\x03\x04' (0x50, 0x4b, 0x03, 0x04)
    expect(zipBytes[0]).toBe(0x50);
    expect(zipBytes[1]).toBe(0x4b);
    expect(zipBytes[2]).toBe(0x03);
    expect(zipBytes[3]).toBe(0x04);
  });
});
