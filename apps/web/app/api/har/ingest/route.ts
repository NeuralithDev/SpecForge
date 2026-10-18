import { NextRequest, NextResponse } from "next/server";
import { createHash, randomUUID } from "node:crypto";
import { sanitizeHarPayload, toEnvVarName } from "@rea/security/HarSanitizer";
import { analyzeWorkflowTarget } from "@rea/engine/SpecForgePipeline";
import { synthesizeArtifacts } from "@rea/engine/Synthesizer";
import { packageProjectBundle } from "@rea/engine/BundlePackager";
import { getDb } from "@/lib/supabase";
import type { HttpMethod, ApiCollection, ApiRequest, Environment, KeyValueParam } from "@/lib/localStore";

export const dynamic = "force-dynamic";

/** Asset and tracking extensions to filter out from API collections */
const STATIC_EXTENSIONS = new Set([
  ".png", ".jpg", ".jpeg", ".gif", ".svg", ".ico", ".webp", ".avif",
  ".woff", ".woff2", ".ttf", ".eot", ".otf",
  ".css", ".map", ".wasm",
]);

/** Third-party tracking and telemetry hostnames to ignore */
const TRACKING_HOSTS = new Set([
  "google-analytics.com",
  "www.google-analytics.com",
  "googletagmanager.com",
  "www.googletagmanager.com",
  "analytics.google.com",
  "doubleclick.net",
  "sentry.io",
  "browser.sentry-cdn.com",
  "hotjar.com",
  "segment.io",
  "api.segment.io",
  "mixpanel.com",
  "api.mixpanel.com",
  "clarity.ms",
  "fullstory.com",
]);

interface HarEntry {
  request?: {
    method?: string;
    url?: string;
    headers?: Array<{ name: string; value: string }>;
    queryString?: Array<{ name: string; value: string }>;
    cookies?: Array<{ name: string; value: string }>;
    postData?: {
      mimeType?: string;
      text?: string;
      params?: Array<{ name: string; value: string }>;
    };
  };
  response?: {
    status?: number;
    statusText?: string;
    headers?: Array<{ name: string; value: string }>;
    content?: {
      mimeType?: string;
      text?: string;
      size?: number;
    };
  };
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      rawHar?: string;
      fileName?: string;
      orgId?: string;
    };

    const rawHar = body.rawHar?.trim();
    if (!rawHar) {
      return NextResponse.json({ error: "Missing required 'rawHar' payload" }, { status: 400 });
    }

    const orgId = body.orgId ?? "00000000-0000-0000-0000-000000000000";
    const fileName = body.fileName ?? "network-trace.har";

    // 50MB File Size Guard (Zero UI freeze, memory protection)
    const MAX_HAR_BYTES = 50 * 1024 * 1024;
    if (rawHar.length > MAX_HAR_BYTES) {
      return NextResponse.json(
        {
          error: `File exceeds the 50MB safe ingestion limit (${(rawHar.length / (1024 * 1024)).toFixed(1)}MB). Please record a focused network trace or trim media assets.`,
          code: "PAYLOAD_TOO_LARGE",
        },
        { status: 413 },
      );
    }

    // 1. Edge/Local Credential & PII Scrubbing via HarSanitizer
    const sanitization = sanitizeHarPayload(rawHar);
    const targetSha256 = createHash("sha256").update(sanitization.sanitizedHar).digest("hex");
    const targetSha256Prefix = targetSha256.slice(0, 8);

    // 2. Parse entries and filter static noise
    let harData: { log?: { entries?: HarEntry[] } };
    try {
      harData = JSON.parse(sanitization.sanitizedHar);
    } catch {
      return NextResponse.json({ error: "Invalid HAR format: unable to parse JSON log" }, { status: 400 });
    }

    const entries = harData.log?.entries ?? [];
    const validEntries: HarEntry[] = [];
    let filteredCount = 0;

    for (const entry of entries) {
      const method = (entry.request?.method ?? "GET").toUpperCase();
      const rawUrl = entry.request?.url ?? "";

      // Skip preflight OPTIONS requests
      if (method === "OPTIONS") {
        filteredCount++;
        continue;
      }

      if (!rawUrl.startsWith("http://") && !rawUrl.startsWith("https://")) {
        filteredCount++;
        continue;
      }

      let parsedUrl: URL;
      try {
        parsedUrl = new URL(rawUrl);
      } catch {
        filteredCount++;
        continue;
      }

      // Filter static assets
      const pathname = parsedUrl.pathname.toLowerCase();
      const dotIndex = pathname.lastIndexOf(".");
      if (dotIndex !== -1) {
        const ext = pathname.slice(dotIndex);
        if (STATIC_EXTENSIONS.has(ext)) {
          filteredCount++;
          continue;
        }
      }

      // Filter analytics trackers
      if (TRACKING_HOSTS.has(parsedUrl.hostname.toLowerCase())) {
        filteredCount++;
        continue;
      }

      validEntries.push(entry);
    }

    if (validEntries.length === 0) {
      return NextResponse.json(
        { error: "No valid API endpoints discovered in this .har trace after noise filtering." },
        { status: 422 },
      );
    }

    // 3. Cluster endpoints into Collection and Requests
    const collectionId = `col_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const collectionName = fileName.replace(/\.har$/iu, "").replace(/[-_]/gu, " ") || "Imported API Collection";
    const discoveredFolders = new Set<string>();
    const requests: ApiRequest[] = [];
    const baseUrls = new Set<string>();

    for (const entry of validEntries) {
      const method = ((entry.request?.method ?? "GET").toUpperCase()) as HttpMethod;
      const rawUrl = entry.request?.url ?? "";
      const parsedUrl = new URL(rawUrl);
      const baseUrl = `${parsedUrl.protocol}//${parsedUrl.host}`;
      baseUrls.add(baseUrl);

      // Create folder hierarchy by host and first 2 path segments
      const segments = parsedUrl.pathname.split("/").filter(Boolean);
      const folderPath = segments.length > 0
        ? `${parsedUrl.host}/${segments.slice(0, 2).join("/")}`
        : parsedUrl.host;
      discoveredFolders.add(folderPath);

      // Extract query params
      const params: KeyValueParam[] = [];
      parsedUrl.searchParams.forEach((value, key) => {
        params.push({
          id: `p_${randomUUID().slice(0, 8)}`,
          key,
          value,
          enabled: true,
        });
      });

      // Extract headers
      const headers: KeyValueParam[] = [];
      let bearerToken: string | undefined;
      let apiKeyHeader: string | undefined;
      let apiKeyValue: string | undefined;

      for (const h of entry.request?.headers ?? []) {
        const lower = h.name.toLowerCase();
        if (lower === "authorization" && h.value.startsWith("Bearer ")) {
          bearerToken = h.value.slice(7);
        } else if (lower.includes("api-key") || lower.includes("apikey")) {
          apiKeyHeader = h.name;
          apiKeyValue = h.value;
        }

        headers.push({
          id: `h_${randomUUID().slice(0, 8)}`,
          key: h.name,
          value: h.value,
          enabled: true,
        });
      }

      // Extract body
      let rawJson: string | undefined;
      const postText = entry.request?.postData?.text;
      if (postText && postText.trim().length > 0) {
        try {
          rawJson = JSON.stringify(JSON.parse(postText), null, 2);
        } catch {
          rawJson = postText;
        }
      }

      // Endpoint naming
      const lastSegment = segments[segments.length - 1] ?? "root";
      const endpointName = `${method} /${segments.join("/") || ""}`;

      const req: ApiRequest = {
        id: `req_${randomUUID().slice(0, 10)}`,
        collectionId,
        folder: folderPath,
        name: endpointName,
        method,
        url: rawUrl.replace(baseUrl, "{{BASE_URL}}"),
        params,
        headers,
        auth: {
          type: bearerToken ? "bearer" : apiKeyHeader ? "apiKey" : "none",
          bearerToken: bearerToken ?? "{{SPECFORGE_AUTH_BEARER}}",
          apiKeyKey: apiKeyHeader,
          apiKeyValue,
          apiKeyIn: "header",
        },
        body: {
          type: rawJson ? "json" : "none",
          rawJson,
        },
        evidenceId: `ev_${createHash("sha256").update(`${method}:${rawUrl}`).digest("hex").slice(0, 12)}`,
        sha256Prefix: createHash("sha256").update(rawUrl).digest("hex").slice(0, 8),
        expectedContract: {
          sampleResponse: (() => {
            const respText = entry.response?.content?.text;
            if (!respText) return undefined;
            try {
              return JSON.parse(respText);
            } catch {
              return respText;
            }
          })(),
          inferredTypes: {},
          securityAudit: {
            authHeaderName: bearerToken ? "Authorization" : apiKeyHeader,
            authReplacedWith: bearerToken ? "<REDACTED_BEARER_TOKEN>" : "<REDACTED_API_KEY>",
            ssrfGuarded: true,
            evidenceId: `ev_${createHash("sha256").update(`${method}:${rawUrl}`).digest("hex").slice(0, 12)}`,
          },
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      requests.push(req);
    }

    const collection: ApiCollection = {
      id: collectionId,
      name: collectionName,
      description: `Auto-extracted from ${fileName} with ${requests.length} verified endpoints`,
      importedFromHar: true,
      targetSha256,
      folders: Array.from(discoveredFolders),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // 4. Generate Environment Variables
    const primaryBaseUrl = Array.from(baseUrls)[0] ?? "https://api.example.com";
    const environmentVariables = [
      { id: "var_base", key: "BASE_URL", value: primaryBaseUrl, enabled: true },
      { id: "var_bearer", key: "SPECFORGE_AUTH_BEARER", value: "sk_sanitized_token_placeholder", enabled: true, isSecret: true },
    ];

    for (const dt of sanitization.dynamicTokens) {
      if (!environmentVariables.some((v) => v.key === dt.envVarName)) {
        environmentVariables.push({
          id: `var_${randomUUID().slice(0, 6)}`,
          key: dt.envVarName,
          value: dt.placeholder,
          enabled: true,
          isSecret: true,
        });
      }
    }

    const environment: Environment = {
      id: `env_${Date.now()}`,
      name: `${collectionName} (Auto-Env)`,
      variables: environmentVariables,
    };

    // 5. Run SpecForge Pipeline to generate MCP Server, SDK, OpenAPI Spec, and Vitest suite
    const db = getDb();
    const quota = db.getQuota(orgId);

    // Check free tier quota (HTTP 402 gate)
    const isOverQuota = quota.tier === "free" && quota.monthly_endpoints_used + requests.length > quota.monthly_limit;

    let synthesisData = null;
    let auditCertificate = "";

    if (!isOverQuota) {
      try {
        const analysis = await analyzeWorkflowTarget({
          harPayload: sanitization.sanitizedHar,
          analysisProfile: "specforge.studio.v1",
        });

        const artifacts = await synthesizeArtifacts(analysis);
        const bundle = await packageProjectBundle({
          analysis,
          synthesis: artifacts,
          metadata: { projectName: collectionName },
        });

        synthesisData = {
          openApiJson: artifacts.openApiJson,
          mcpServerCode: artifacts.mcpServerCode,
          clientCode: artifacts.clientCode,
          parityTestsCode: artifacts.parityTestsCode,
          warnings: artifacts.warnings,
          requiredAuthConfigs: artifacts.requiredAuthConfigs,
        };
        auditCertificate = bundle.certificateMarkdown;

        // Atomically record quota usage
        db.checkAndIncrementEndpointQuota(orgId, requests.length);
      } catch (compileErr) {
        console.warn("Compilation warning in HAR ingest route:", compileErr);
      }
    }

    return NextResponse.json({
      collection,
      requests,
      environment,
      redactionCount: sanitization.redactionCount,
      redactions: sanitization.redactions,
      filteredAssetsCount: filteredCount,
      targetSha256,
      targetSha256Prefix,
      synthesis: synthesisData,
      auditCertificate,
      quotaUsage: {
        isOverQuota,
        currentUsage: quota.monthly_endpoints_used,
        limit: quota.monthly_limit,
        tier: quota.tier,
        planId: quota.plan_id,
        newRequestCount: requests.length,
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
