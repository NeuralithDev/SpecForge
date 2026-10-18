import { NextRequest, NextResponse } from "next/server";
import { createHash } from "node:crypto";
import { analyzeWorkflowTarget } from "@rea/engine/SpecForgePipeline";
import { synthesizeArtifacts } from "@rea/engine/Synthesizer";
import { packageProjectBundle } from "@rea/engine/BundlePackager";
import { getDb } from "@/lib/supabase";
import type { ApiRequest } from "@/lib/localStore";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      requests?: ApiRequest[];
      targetName?: string;
      orgId?: string;
    };

    const targetRequests = body.requests ?? [];
    if (targetRequests.length === 0) {
      return NextResponse.json({ error: "No endpoints provided for compilation." }, { status: 400 });
    }

    const orgId = body.orgId ?? "00000000-0000-0000-0000-000000000000";
    const targetName = body.targetName ?? "SpecForge Studio Collection";

    const db = getDb();
    const quota = db.getQuota(orgId);

    // 1. Quota Check (HTTP 402 Gate)
    if (quota.tier === "free" && quota.monthly_endpoints_used + targetRequests.length > quota.monthly_limit) {
      return NextResponse.json(
        {
          error: `Free Tier quota limit (${quota.monthly_limit} compiled endpoints) reached. You currently have ${quota.monthly_endpoints_used} used endpoints and attempted to compile ${targetRequests.length} more.`,
          code: "QUOTA_EXCEEDED",
          currentUsage: quota.monthly_endpoints_used,
          limit: quota.monthly_limit,
          tier: quota.tier,
          planId: quota.plan_id,
          upgradeRequired: true,
        },
        { status: 402 },
      );
    }

    // 2. Synthesize Synthetic HAR representation for Pipeline
    const harPayload = JSON.stringify({
      log: {
        version: "1.2",
        creator: { name: "SpecForge Studio", version: "1.0.0" },
        entries: targetRequests.map((r) => {
          let normalizedUrl = r.url;
          if (normalizedUrl.includes("{{") || normalizedUrl.includes("%7B%7B")) {
            normalizedUrl = normalizedUrl.replace(/^(\{\{[^}]+\}\}|%7B%7B[^%]+%7D%7D)/gu, "https://api.stripe.com");
          }
          if (!normalizedUrl.startsWith("http")) {
            normalizedUrl = `https://api.stripe.com${normalizedUrl.startsWith("/") ? "" : "/"}${normalizedUrl}`;
          }

          return {
            request: {
              method: r.method,
              url: normalizedUrl,
              headers: r.headers
                .filter((h) => h.enabled && h.key)
                .map((h) => ({ name: h.key, value: h.value })),
              queryString: r.params
                .filter((p) => p.enabled && p.key)
                .map((p) => ({ name: p.key, value: p.value })),
              postData: r.body?.rawJson
                ? { mimeType: "application/json", text: r.body.rawJson }
                : undefined,
            },
            response: {
              status: 200,
              statusText: "OK",
              headers: [
                { name: "Content-Type", value: "application/json" },
                { name: "X-SpecForge-Evidence", value: r.evidenceId ?? "synthesized" },
              ],
              content: {
                mimeType: "application/json",
                text: JSON.stringify({ success: true, compiled_from: r.name }),
              },
            },
          };
        }),
      },
    });

    // 3. Run Pipeline with Epistemic Evidence Integrity
    const analysis = await analyzeWorkflowTarget({
      harPayload,
      analysisProfile: "specforge.studio.compile.v1",
    });

    const artifacts = await synthesizeArtifacts(analysis, {
      apiKey: process.env.GEMINI_API_KEY,
    });

    const bundle = await packageProjectBundle({
      analysis,
      synthesis: artifacts,
      metadata: {
        projectName: targetName,
      },
    });

    // Increment quota atomically in db
    db.checkAndIncrementEndpointQuota(orgId, targetRequests.length);
    const updatedQuota = db.getQuota(orgId);

    return NextResponse.json({
      targetSha256: analysis.targetSha256,
      targetSha256Prefix: analysis.targetSha256.slice(0, 8),
      targetName,
      endpointCount: analysis.endpoints.length,
      openApiJson: artifacts.openApiJson,
      mcpServerCode: artifacts.mcpServerCode,
      clientCode: artifacts.clientCode,
      parityTestsCode: artifacts.parityTestsCode,
      auditCertificate: bundle.certificateMarkdown,
      warnings: artifacts.warnings,
      requiredAuthConfigs: artifacts.requiredAuthConfigs,
      bundleFileCount: bundle.fileCount,
      bundleSizeBytes: bundle.totalSizeBytes,
      quotaUsage: {
        currentUsage: updatedQuota.monthly_endpoints_used,
        limit: updatedQuota.monthly_limit,
        tier: updatedQuota.tier,
        planId: updatedQuota.plan_id,
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
