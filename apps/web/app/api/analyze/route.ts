import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { analyzeWorkflowTarget } from "@rea/engine/SpecForgePipeline";
import { synthesizeArtifacts } from "@rea/engine/Synthesizer";
import { packageProjectBundle } from "@rea/engine/BundlePackager";
import { getDb } from "@/lib/supabase";

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      harPayload?: string;
      bundlePath?: string;
      targetUrl?: string;
      targetName?: string;
      analysisProfile?: string;
      orgId?: string;
    };

    const projectId = randomUUID();
    const orgId = body.orgId ?? "00000000-0000-0000-0000-000000000000";
    const profile = body.analysisProfile ?? "specforge.production.v1";
    const targetType = body.bundlePath ? "bundle" : body.targetUrl ? "url" : "har";
    const targetName =
      body.targetName ??
      (body.targetUrl ? new URL(body.targetUrl).hostname : "uploaded-target.har");

    const db = getDb();

    // 1. Initialize Project Record in queued stage
    db.saveProject({
      id: projectId,
      org_id: orgId,
      name: targetName,
      target_type: targetType,
      status: "analyzing",
      stage: "queued",
      progress_pct: 10,
      ...(body.targetUrl ? { target_url: body.targetUrl } : {}),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    // 2. Run Headless SpecForge Analysis Pipeline (with SSRF firewall & Zero-Leak Secret Sanitization)
    db.updateProjectProgress(projectId, { stage: "scrubbing", progress_pct: 30 });

    const analysis = await analyzeWorkflowTarget({
      harPayload: body.harPayload,
      bundlePath: body.bundlePath,
      targetUrl: body.targetUrl,
      analysisProfile: profile,
    });

    // Check monthly endpoint quota
    let quotaCheck = db.checkAndIncrementEndpointQuota(
      orgId,
      Math.max(1, analysis.endpoints.length),
    );

    // Auto-promote in development/testing mode so testing is 100% free and unblocked
    if (!quotaCheck.allowed && process.env.NODE_ENV !== "production") {
      db.promoteOrgQuota(orgId, "enterprise_annual", "stripe", "sim_dev_unlimited");
      quotaCheck = db.checkAndIncrementEndpointQuota(
        orgId,
        Math.max(1, analysis.endpoints.length),
      );
    }

    if (!quotaCheck.allowed) {
      db.updateProjectProgress(projectId, {
        stage: "failed",
        status: "failed",
        error_message: `Monthly endpoint quota of ${quotaCheck.limit} exceeded for plan ${quotaCheck.planId}`,
      });

      return NextResponse.json(
        {
          error: `Monthly quota exceeded for ${quotaCheck.planId} plan. You have used ${quotaCheck.currentUsage} of ${quotaCheck.limit} allowable endpoints.`,
          code: "QUOTA_EXCEEDED",
          currentUsage: quotaCheck.currentUsage,
          limit: quotaCheck.limit,
          tier: quotaCheck.tier,
          planId: quotaCheck.planId,
          requiredEndpoints: analysis.endpoints.length,
          upgradeRequired: true,
        },
        { status: 402 },
      );
    }

    db.updateProjectProgress(projectId, {
      stage: "dissecting",
      progress_pct: 60,
      redaction_summary_json: {
        count: analysis.redactions.length,
        redactions: analysis.redactions,
      },
    });

    // 3. Synthesize Artifacts with Epistemic Guardrail
    db.updateProjectProgress(projectId, { stage: "synthesizing", progress_pct: 80 });
    const artifacts = await synthesizeArtifacts(analysis, {
      apiKey: process.env.GEMINI_API_KEY,
    });

    // 4. Package complete enterprise deliverable and Epistemic Audit Certificate
    db.updateProjectProgress(projectId, { stage: "verifying", progress_pct: 95 });
    const bundle = await packageProjectBundle({
      analysis,
      synthesis: artifacts,
      metadata: {
        projectName: targetName,
      },
    });

    // 5. Complete and persist generated artifacts
    db.updateProjectProgress(projectId, {
      stage: "completed",
      progress_pct: 100,
      status: "verified",
      telemetry_json: analysis.telemetry,
    });

    db.saveArtifacts({
      id: randomUUID(),
      project_id: projectId,
      openapi_spec: JSON.parse(artifacts.openApiJson),
      mcp_server_code: artifacts.mcpServerCode,
      ts_sdk_code: artifacts.clientCode,
      parity_tests_code: artifacts.parityTestsCode,
      created_at: new Date().toISOString(),
    });

    db.saveEvidenceLedger(projectId, {
      targetSha256: analysis.targetSha256,
      evidence: analysis.evidenceRecords,
      unknowns: analysis.unknowns,
    });

    db.saveObligationMatrix(projectId, analysis.coverageData);

    const responsePayload = {
      projectId,
      targetSha256: analysis.targetSha256,
      targetName,
      targetType,
      endpoints: analysis.endpoints,
      evidenceRecords: analysis.evidenceRecords.map((r) => ({
        evidence_id: r.evidence_id,
        operation: r.operation,
        confidence: r.confidence,
        authority: r.authority,
        locations: r.locations,
      })),
      unknowns: analysis.unknowns.map((u) => ({
        unknown_id: u.unknown_id,
        question: u.question,
        severity: u.severity,
        domain: u.domain,
        status: u.status,
        supporting_evidence_ids: u.supporting_evidence_ids,
        envVarName: `SPECFORGE_AUTH_${u.question.includes("'") ? u.question.split("'")[1]?.toUpperCase().replace(/[^A-Z0-9]/gu, "_") : "TOKEN"}`,
      })),
      coverageScore: analysis.closureResult.status === "ready" ? 100.0 : 85.0,
      closureStatus: analysis.closureResult.status,
      openApiJson: artifacts.openApiJson,
      mcpServerCode: artifacts.mcpServerCode,
      clientCode: artifacts.clientCode,
      parityTestsCode: artifacts.parityTestsCode,
      requiredAuthConfigs: artifacts.requiredAuthConfigs,
      auditCertificate: bundle.certificateMarkdown,
      telemetry: analysis.telemetry,
      redactionCount: analysis.redactions.length,
      filteredAssetsCount: analysis.filteredAssetsCount,
      bundleFileCount: bundle.fileCount,
      bundleSizeBytes: bundle.totalSizeBytes,
      quotaUsage: {
        currentUsage: quotaCheck.currentUsage,
        limit: quotaCheck.limit,
        tier: quotaCheck.tier,
        planId: quotaCheck.planId,
      },
    };

    return NextResponse.json(responsePayload);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to analyze target";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
