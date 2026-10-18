import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/supabase";
import { packageProjectBundle } from "@rea/engine/BundlePackager";
import { analyzeWorkflowTarget } from "@rea/engine/SpecForgePipeline";
import { synthesizeArtifacts } from "@rea/engine/Synthesizer";
import { SAMPLE_ANALYSIS_STATE } from "@/lib/sampleData";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params;
    const searchParams = request.nextUrl.searchParams;
    const format = searchParams.get("format") ?? "zip";
    const file = searchParams.get("file");

    const db = getDb();
    const project = db.getProject(id);
    const storedArtifacts = db.getArtifacts(id);

    // Build or recover bundle
    let openapi = storedArtifacts?.openapi_spec
      ? JSON.stringify(storedArtifacts.openapi_spec, null, 2)
      : SAMPLE_ANALYSIS_STATE.openApiJson;
    let mcp = storedArtifacts?.mcp_server_code || SAMPLE_ANALYSIS_STATE.mcpServerCode;
    let client = storedArtifacts?.ts_sdk_code || SAMPLE_ANALYSIS_STATE.clientCode;
    let parity = storedArtifacts?.parity_tests_code || SAMPLE_ANALYSIS_STATE.parityTestsCode;

    // Run baseline synthesis to package full bundle
    const analysis = await analyzeWorkflowTarget({
      harPayload: JSON.stringify({
        log: {
          version: "1.2",
          entries: SAMPLE_ANALYSIS_STATE.endpoints.map((e) => ({
            request: {
              method: e.method,
              url: e.url,
              headers: Object.entries(e.requestHeaders).map(([name, value]) => ({ name, value })),
              queryString: e.parameters.map((p) => ({ name: p.name, value: "sample" })),
            },
            response: {
              status: e.status ?? 200,
              headers: Object.entries(e.responseHeaders).map(([name, value]) => ({ name, value })),
            },
          })),
        },
      }),
      analysisProfile: "specforge.export.v1",
    });

    const synthesis = await synthesizeArtifacts(analysis);

    let parsedSpec: Record<string, unknown> = {};
    try {
      parsedSpec = JSON.parse(openapi);
    } catch {
      parsedSpec = synthesis.openApiSpec;
    }

    const bundle = await packageProjectBundle({
      analysis,
      synthesis: {
        openApiSpec: parsedSpec,
        openApiJson: openapi,
        mcpServerCode: mcp,
        clientCode: client,
        parityTestsCode: parity,
        warnings: synthesis.warnings,
        requiredAuthConfigs: synthesis.requiredAuthConfigs,
      },
      metadata: {
        projectName: project?.name ?? "specforge-synthesized-sdk",
      },
    });

    if (file === "certificate" || format === "certificate") {
      return new NextResponse(bundle.certificateMarkdown, {
        headers: {
          "Content-Type": "text/markdown; charset=utf-8",
          "Content-Disposition": `inline; filename="EPISTEMIC_AUDIT_CERTIFICATE.md"`,
        },
      });
    }

    if (file === "openapi") {
      return new NextResponse(openapi, {
        headers: {
          "Content-Type": "application/json; charset=utf-8",
          "Content-Disposition": `attachment; filename="openapi.json"`,
        },
      });
    }

    if (file === "mcp") {
      return new NextResponse(mcp, {
        headers: {
          "Content-Type": "text/typescript; charset=utf-8",
          "Content-Disposition": `attachment; filename="mcp-server.ts"`,
        },
      });
    }

    // Default: return complete ZIP archive
    const zipBytes = await bundle.createZipBuffer();
    return new NextResponse(Buffer.from(zipBytes), {
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="specforge-project-${id.slice(0, 8)}.zip"`,
        "Content-Length": String(zipBytes.byteLength),
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to export bundle";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
