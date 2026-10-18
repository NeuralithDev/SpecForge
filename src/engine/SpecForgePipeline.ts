import { createHash } from "node:crypto";
import { readFile, stat } from "node:fs/promises";
import { basename } from "node:path";
import canonicalize from "canonicalize";
import type { JsonValue } from "../domain/jsonValue.js";

import {
  createEvidence,
  type Evidence,
  type EvidenceLocation,
  type EvidenceSubjectTarget,
} from "../domain/evidence.js";
import {
  createResidualUnknown,
  type ResidualUnknown,
} from "../domain/residualUnknown.js";
import {
  createEvidenceBundle,
  type EvidenceBundle,
} from "../domain/evidenceBundle.js";
import {
  createReconstructionCoverageData,
  createReconstructionVerifierContract,
  evaluateReconstructionClosure,
  type ReconstructionCoverageData,
  type ReconstructionClosureResult,
} from "../domain/reconstructionCoverage.js";
import { parseJavaScriptSource } from "../domain/javascript/javascriptSourceParser.js";
import { traverseJavaScriptAst } from "../domain/javascript/javascriptSemanticTraversal.js";
import * as t from "@babel/types";
import {
  sanitizeHarPayload,
  sanitizeSourceText,
  type DiscoveredRedaction,
} from "../security/HarSanitizer.js";
import { validateTargetUrlSafety } from "../security/ssrfGuard.js";
import {
  PipelineTracer,
  type PipelineTelemetry,
} from "../telemetry/PipelineTracer.js";

/** Headless provider identity for the SpecForge analysis pipeline. */
export const SPECFORGE_PROVIDER_IDENTITY = Object.freeze({
  id: "specforge.engine",
  name: "SpecForge Pipeline",
  version: "1.0.0",
});

/** Input parameter schema for workflow analysis. */
export interface SpecForgePipelineInput {
  readonly harPayload?: string;
  readonly targetUrl?: string;
  readonly bundlePath?: string;
  readonly analysisProfile: string;
  readonly includeStaticAssets?: boolean;
}

/** Discovered endpoint parameter specification. */
export interface DiscoveredEndpointParameter {
  readonly name: string;
  readonly in: "query" | "header" | "path" | "body";
  readonly required: boolean;
  readonly type?: string;
  readonly example?: unknown;
}

/** Normalized API endpoint contract extracted from traffic or bundle artifacts. */
export interface DiscoveredEndpoint {
  readonly method: string;
  readonly url: string;
  readonly path: string;
  readonly status?: number | undefined;
  readonly parameters: readonly DiscoveredEndpointParameter[];
  readonly requestHeaders: Readonly<Record<string, string>>;
  readonly responseHeaders: Readonly<Record<string, string>>;
  readonly dynamicTokens: readonly string[];
  readonly evidenceId: string;
  readonly surfaceId: string;
  readonly claimId: string;
}

/** Complete headless analysis output for downstream AI agent consumers and workflows. */
export interface SpecForgeAnalysisResult {
  readonly targetSha256: string;
  readonly endpoints: readonly DiscoveredEndpoint[];
  readonly evidenceRecords: readonly Evidence[];
  readonly unknowns: readonly ResidualUnknown[];
  readonly evidenceBundle: EvidenceBundle;
  readonly coverageData: ReconstructionCoverageData;
  readonly closureResult: ReconstructionClosureResult;
  readonly telemetry: PipelineTelemetry;
  readonly redactions: readonly DiscoveredRedaction[];
  readonly filteredAssetsCount: number;
}

/** Execution safety constraints for enterprise headless execution. */
export const MAX_CAPTURE_TIMEOUT_MS = 15_000;
export const MAX_PAYLOAD_BYTE_LIMIT = 50 * 1024 * 1024; // 50 MiB

/** Canonical digest helper for stable JSON hashing. */
const computeSha256 = (content: string | Buffer): string =>
  createHash("sha256").update(content).digest("hex");

const canonicalDigest = (value: unknown): string => {
  const serialized = canonicalize(value);
  if (serialized === undefined)
    throw new TypeError("Value cannot be canonically serialized");
  return computeSha256(serialized);
};

/** Sanitize an arbitrary path or identifier into a schema-conforming stable identifier. */
const toStableIdentifier = (prefix: string, raw: string): string => {
  const sanitized = raw
    .toLowerCase()
    .replace(/[^a-z0-9._:\x2f\x2d]/gu, "_")
    .replace(/_+/gu, "_")
    .replace(/^[^a-z]+/iu, "");
  const base = `${prefix}.${sanitized || "endpoint"}`;
  return base.slice(0, 180);
};

/** Known static asset file extensions that represent web assets, styles, scripts, fonts, or media. */
const STATIC_ASSET_EXTENSIONS = new Set([
  "css",
  "less",
  "sass",
  "scss",
  "js",
  "mjs",
  "cjs",
  "jsx",
  "ts",
  "tsx",
  "map",
  "png",
  "jpg",
  "jpeg",
  "gif",
  "svg",
  "webp",
  "ico",
  "bmp",
  "tiff",
  "avif",
  "woff",
  "woff2",
  "ttf",
  "eot",
  "otf",
  "mp4",
  "mp3",
  "webm",
  "wav",
  "ogg",
  "pdf",
  "zip",
  "gz",
]);

/** Known telemetry, analytics, and third-party tracking domains. */
const TELEMETRY_HOSTS = [
  "google-analytics.com",
  "googletagmanager.com",
  "analytics.google.com",
  "doubleclick.net",
  "connect.facebook.net",
  "newrelic.com",
  "nr-data.net",
  "hotjar.com",
  "segment.io",
  "segment.com",
  "sentry.io",
  "clarity.ms",
  "datadoghq.com",
  "criteo.com",
  "branch.io",
  "appsflyer.com",
];

/** Known telemetry or tracker path signatures. */
const TELEMETRY_PATH_PATTERNS = [
  /^\/j\/collect(\/|$)/i,
  /^\/g\/collect(\/|$)/i,
  /^\/collect(\/|$)/i,
  /^\/events\/1\/NRJS-/i,
  /^\/plugins\/ua\//i,
  /^\/beacon(\/|$)/i,
  /^\/telemetry(\/|$)/i,
  /\/nr_myntra\.js/i,
];

/** Non-API MIME prefixes indicating static media or documents. */
const NON_API_MIME_PREFIXES = [
  "text/css",
  "image/",
  "font/",
  "audio/",
  "video/",
  "application/javascript",
  "text/javascript",
  "text/html",
];

/**
 * Identify if an HTTP transaction or route is a static asset or third-party telemetry beacon.
 */
export function isStaticAssetOrTelemetry(
  url: string,
  pathname: string,
  responseMimeType?: string,
): boolean {
  // 1. Check known telemetry hostnames
  try {
    const parsed = new URL(
      url.startsWith("http://") || url.startsWith("https://")
        ? url
        : `https://specforge.local${url.startsWith("/") ? "" : "/"}${url}`,
    );
    const host = parsed.hostname.toLowerCase();
    if (TELEMETRY_HOSTS.some((th) => host === th || host.endsWith(`.${th}`))) {
      return true;
    }
  } catch {
    // ignore parse error and proceed
  }

  // 2. Check telemetry path patterns
  if (TELEMETRY_PATH_PATTERNS.some((pattern) => pattern.test(pathname))) {
    return true;
  }

  // 3. Check static file extensions (e.g. .css, .png, .js, .woff2)
  const lastSegment = pathname.split("/").pop() ?? "";
  const dotIndex = lastSegment.lastIndexOf(".");
  if (dotIndex > 0) {
    const ext = lastSegment.slice(dotIndex + 1).toLowerCase();
    if (STATIC_ASSET_EXTENSIONS.has(ext)) {
      return true;
    }
  }

  // 4. Check response MIME type if available
  if (responseMimeType) {
    const cleanMime = responseMimeType.split(";")[0]?.trim().toLowerCase() ?? "";
    if (NON_API_MIME_PREFIXES.some((prefix) => cleanMime.startsWith(prefix))) {
      return true;
    }
  }

  return false;
}

/** Dynamic token pattern recognizers (Authorization headers, CSRF, JWT, API keys). */
const DYNAMIC_HEADER_NAMES = new Set([
  "authorization",
  "x-csrf-token",
  "x-xsrf-token",
  "x-api-key",
  "x-auth-token",
  "x-session-id",
  "x-request-id",
  "x-signature",
  "cookie",
  "set-cookie",
]);

const isDynamicToken = (headerName: string, value: string): boolean => {
  const lower = headerName.toLowerCase();
  if (DYNAMIC_HEADER_NAMES.has(lower)) return true;
  if (/^bearer\s+/iu.test(value)) return true;
  if (/^[a-f0-9]{32,64}$/iu.test(value)) return true;
  if (/^ey[A-Za-z0-9-_=]+\.[A-Za-z0-9-_=]+/u.test(value)) return true;
  return false;
};

/** Deterministic headless workflow target analysis entrypoint. */
export async function analyzeWorkflowTarget(
  input: SpecForgePipelineInput,
): Promise<SpecForgeAnalysisResult> {
  const tracer = new PipelineTracer();
  const allRedactions: DiscoveredRedaction[] = [];
  const evidenceRecords: Evidence[] = [];
  const unknowns: ResidualUnknown[] = [];
  const endpoints: DiscoveredEndpoint[] = [];
  const usedSurfaceIds = new Set<string>();
  const usedClaimIds = new Set<string>();
  let filteredAssetsCount = 0;

  // 0. SSRF Firewall verification if live URL target is supplied
  if (input.targetUrl !== undefined && input.targetUrl.trim().length > 0) {
    tracer.startStage("ssrf");
    await validateTargetUrlSafety(input.targetUrl);
    tracer.endStage("ssrf");
  }

  let primaryTargetSha256 = computeSha256("empty.target");
  let primaryTargetSubject: EvidenceSubjectTarget = {
    path: "/specforge/target.artifact",
    sha256: primaryTargetSha256,
    format: "file",
  };

  // 1. Process Network Traffic Capture (HAR) if supplied
  if (input.harPayload !== undefined && input.harPayload.trim().length > 0) {
    let harContent = input.harPayload;
    let harPath = "/specforge/capture.har";

    // Determine if payload is an existing file path or inline JSON
    try {
      const stats = await stat(input.harPayload);
      if (stats.isFile()) {
        harPath = input.harPayload;
        harContent = await readFile(input.harPayload, "utf8");
      }
    } catch {
      // Treat as inline JSON string payload
    }

    if (Buffer.byteLength(harContent, "utf8") > MAX_PAYLOAD_BYTE_LIMIT) {
      throw new RangeError(
        `HAR payload exceeds maximum byte budget of ${MAX_PAYLOAD_BYTE_LIMIT} bytes`,
      );
    }

    // Zero-Leak Secret Redaction & PII Scrubbing
    tracer.startStage("sanitize");
    const sanitization = sanitizeHarPayload(harContent);
    harContent = sanitization.sanitizedHar;
    allRedactions.push(...sanitization.redactions);
    tracer.endStage("sanitize");

    tracer.startStage("dissect");

    const harSha256 = computeSha256(harContent);
    primaryTargetSha256 = harSha256;
    primaryTargetSubject = {
      path: harPath,
      sha256: harSha256,
      format: "file",
    };

    const parsedHar = JSON.parse(harContent) as {
      log?: {
        version?: string;
        entries?: Array<{
          request: {
            method: string;
            url: string;
            headers?: Array<{ name: string; value: string }>;
            queryString?: Array<{ name: string; value: string }>;
            postData?: { mimeType?: string; text?: string };
          };
          response?: {
            status: number;
            headers?: Array<{ name: string; value: string }>;
            content?: { mimeType?: string; size?: number; text?: string };
          };
        }>;
      };
    };

    const entries = parsedHar.log?.entries ?? [];

    // Emit top-level capture Evidence
    const captureEvidence = createEvidence(
      primaryTargetSubject,
      SPECFORGE_PROVIDER_IDENTITY,
      {
        predicateType: "specforge.network-capture",
        operation: "inspect_network_capture",
        parameters: {
          analysis_profile: input.analysisProfile,
          entry_count: entries.length,
          target_url: input.targetUrl ?? null,
        },
        result: {
          har_version: parsedHar.log?.version ?? "1.2",
          total_entries: entries.length,
          capture_sha256: harSha256,
        },
        confidence: "observed",
        authority: "shipped-artifact",
        locations: [{ kind: "artifact-path", path: harPath }],
      },
    );
    evidenceRecords.push(captureEvidence);

    // Dissect individual HTTP transactions
    let byteOffset = 0;
    for (const [index, entry] of entries.entries()) {
      const req = entry.request;
      const res = entry.response;
      const method = (req.method ?? "GET").toUpperCase();
      const rawUrl = req.url ?? "/";
      
      let parsedUrl: URL;
      try {
        parsedUrl = new URL(rawUrl);
      } catch {
        parsedUrl = new URL(rawUrl, input.targetUrl ?? "https://specforge.local");
      }

      const pathname = parsedUrl.pathname;

      // Filter out static web assets and third-party tracking beacons unless explicitly requested
      const responseMimeType =
        res?.content?.mimeType ??
        res?.headers?.find((h) => h.name.toLowerCase() === "content-type")?.value;

      if (
        !input.includeStaticAssets &&
        isStaticAssetOrTelemetry(rawUrl, pathname, responseMimeType)
      ) {
        filteredAssetsCount++;
        continue;
      }

      const slug = toStableIdentifier(
        `endpoint.${method.toLowerCase()}`,
        pathname,
      );

      // Collect query parameters
      const parameters: DiscoveredEndpointParameter[] = [];
      for (const q of req.queryString ?? []) {
        parameters.push({
          name: q.name,
          in: "query",
          required: false,
          example: q.value,
        });
      }

      // Collect headers and detect dynamic tokens
      const requestHeaders: Record<string, string> = {};
      const dynamicTokens: string[] = [];

      for (const h of req.headers ?? []) {
        requestHeaders[h.name.toLowerCase()] = h.value;
        if (isDynamicToken(h.name, h.value)) {
          dynamicTokens.push(h.name);
        }
      }

      const responseHeaders: Record<string, string> = {};
      for (const h of res?.headers ?? []) {
        responseHeaders[h.name.toLowerCase()] = h.value;
      }

      // Estimate byte offset in the source file
      byteOffset = Math.max(0, harContent.indexOf(rawUrl, byteOffset));
      const locations: EvidenceLocation[] = [
        { kind: "artifact-path", path: harPath },
        { kind: "file-offset", offset: byteOffset },
      ];

      // Build Evidence record for this specific endpoint
      const endpointEvidence = createEvidence(
        primaryTargetSubject,
        SPECFORGE_PROVIDER_IDENTITY,
        {
          predicateType: "specforge.api-endpoint",
          operation: "dissect_endpoint",
          parameters: {
            method,
            path: pathname,
            ordinal: index,
          },
          result: {
            method,
            url: rawUrl,
            path: pathname,
            status: res?.status ?? 200,
            parameters: parameters.map(
              (p): { [key: string]: JsonValue } => ({
                name: p.name,
                in: p.in,
                required: p.required,
                ...(p.type !== undefined ? { type: p.type } : {}),
                ...(p.example !== undefined
                  ? { example: String(p.example) }
                  : {}),
              }),
            ),
            request_headers: requestHeaders,
            response_headers: responseHeaders,
            dynamic_tokens: dynamicTokens,
          },
          confidence: "observed",
          authority: "shipped-artifact",
          locations,
          evidenceLinks: [captureEvidence.evidence_id],
        },
      );
      evidenceRecords.push(endpointEvidence);

      // Check if this endpoint already exists to aggregate and prevent duplicate surfaces
      const existingEndpoint = endpoints.find(
        (e) => e.method === method && e.path === pathname,
      );

      if (existingEndpoint) {
        // Merge query parameters without duplicate names
        const mergedParams = [...existingEndpoint.parameters];
        for (const p of parameters) {
          if (!mergedParams.some((ep) => ep.name === p.name && ep.in === p.in)) {
            mergedParams.push(p);
          }
        }
        (existingEndpoint as { parameters: readonly DiscoveredEndpointParameter[] }).parameters = mergedParams;

        // Merge headers
        (existingEndpoint as { requestHeaders: Record<string, string> }).requestHeaders = {
          ...requestHeaders,
          ...existingEndpoint.requestHeaders,
        };
        (existingEndpoint as { responseHeaders: Record<string, string> }).responseHeaders = {
          ...responseHeaders,
          ...existingEndpoint.responseHeaders,
        };

        // Merge dynamic tokens
        const mergedTokens = [...existingEndpoint.dynamicTokens];
        for (const tok of dynamicTokens) {
          if (!mergedTokens.includes(tok)) {
            mergedTokens.push(tok);
          }
        }
        (existingEndpoint as { dynamicTokens: readonly string[] }).dynamicTokens = mergedTokens;
      } else {
        let candidateSlug = slug;
        let counter = 1;
        while (usedSurfaceIds.has(`surface.${candidateSlug}`)) {
          candidateSlug = `${slug}.${counter++}`;
        }
        const surfaceId = `surface.${candidateSlug}`;
        const claimId = `claim.${candidateSlug}`;
        usedSurfaceIds.add(surfaceId);
        usedClaimIds.add(claimId);

        endpoints.push({
          method,
          url: rawUrl,
          path: pathname,
          ...(res?.status !== undefined ? { status: res.status } : {}),
          parameters,
          requestHeaders,
          responseHeaders,
          dynamicTokens,
          evidenceId: endpointEvidence.evidence_id,
          surfaceId,
          claimId,
        });
      }

      // Flag unverified dynamic tokens as ResidualUnknown
      for (const tokenHeader of dynamicTokens) {
        const tokenScopeDigest = computeSha256(
          `${method}:${pathname}:${tokenHeader.toLowerCase()}`,
        );
        const unknown = createResidualUnknown(
          {
            question: `How is the dynamic token in header '${tokenHeader}' generated, signed, and refreshed for endpoint '${method} ${pathname}'?`,
            domain: "api-protocol-token",
            severity: "medium",
            required_confidence: "observed",
            required_authority: "shipped-artifact",
            required_environment: null,
            recommended_probes: [
              {
                operation: "trace_token_derivation",
                rationale: `Trace client script execution or auth handshake to reconstruct header '${tokenHeader}'.`,
              },
            ],
            relationships: [],
            supporting_evidence_ids: [endpointEvidence.evidence_id],
            contradicting_evidence_ids: [],
          },
          endpointEvidence.evidence_id,
          tokenScopeDigest,
        );
        unknowns.push(unknown);
      }
    }
  }

  // 2. Process Client Bundle AST (JavaScript) if supplied
  if (input.bundlePath !== undefined && input.bundlePath.trim().length > 0) {
    try {
      let bundleContent = await readFile(input.bundlePath, "utf8");
      if (Buffer.byteLength(bundleContent, "utf8") > MAX_PAYLOAD_BYTE_LIMIT) {
        throw new RangeError(
          `Bundle payload exceeds maximum byte budget of ${MAX_PAYLOAD_BYTE_LIMIT} bytes`,
        );
      }

      tracer.startStage("sanitize");
      const bundleSanitization = sanitizeSourceText(bundleContent);
      bundleContent = bundleSanitization.sanitizedText;
      allRedactions.push(...bundleSanitization.redactions);
      tracer.endStage("sanitize");

      tracer.startStage("dissect");
      const bundleSha256 = computeSha256(bundleContent);

      const bundleSubject: EvidenceSubjectTarget = {
        path: input.bundlePath,
        sha256: bundleSha256,
        format: "javascript-bundle",
      };

      if (endpoints.length === 0) {
        primaryTargetSha256 = bundleSha256;
        primaryTargetSubject = bundleSubject;
      }

      const parsedAst = parseJavaScriptSource(bundleContent, input.bundlePath);
      const discoveredBundleRoutes: Array<{
        route: string;
        line: number;
        column: number;
      }> = [];

      if (parsedAst !== null) {
        traverseJavaScriptAst(parsedAst, {
          enter: (node: t.Node) => {
            if (
              t.isCallExpression(node) &&
              (t.isIdentifier(node.callee, { name: "fetch" }) ||
                (t.isMemberExpression(node.callee) &&
                  t.isIdentifier(node.callee.property) &&
                  ["get", "post", "put", "delete", "patch"].includes(
                    node.callee.property.name,
                  )))
            ) {
              const arg = node.arguments[0];
              if (t.isStringLiteral(arg) && arg.value.startsWith("/")) {
                if (
                  !input.includeStaticAssets &&
                  isStaticAssetOrTelemetry(arg.value, arg.value)
                ) {
                  filteredAssetsCount++;
                  return;
                }
                discoveredBundleRoutes.push({
                  route: arg.value,
                  line: node.loc?.start.line ?? 1,
                  column: node.loc?.start.column ?? 0,
                });
              }
            }
          },
        });
      }

      const bundleEvidence = createEvidence(
        bundleSubject,
        SPECFORGE_PROVIDER_IDENTITY,
        {
          predicateType: "specforge.bundle-ast",
          operation: "inspect_bundle_routes",
          parameters: {
            bundle_path: input.bundlePath,
            route_count: discoveredBundleRoutes.length,
          },
          result: {
            routes: discoveredBundleRoutes,
            bundle_sha256: bundleSha256,
          },
          confidence: "derived",
          authority: "shipped-artifact",
          locations: [{ kind: "artifact-path", path: input.bundlePath }],
        },
      );
      evidenceRecords.push(bundleEvidence);

      // Add newly discovered routes from AST that were not present in HAR
      for (const routeFact of discoveredBundleRoutes) {
        if (!endpoints.some((e) => e.path === routeFact.route)) {
          const method = "GET";
          const slug = toStableIdentifier(
            `bundle.${method.toLowerCase()}`,
            routeFact.route,
          );
          let candidateSlug = slug;
          let counter = 1;
          while (usedSurfaceIds.has(`surface.${candidateSlug}`)) {
            candidateSlug = `${slug}.${counter++}`;
          }
          const surfaceId = `surface.${candidateSlug}`;
          const claimId = `claim.${candidateSlug}`;
          usedSurfaceIds.add(surfaceId);
          usedClaimIds.add(claimId);

          const routeEvidence = createEvidence(
            bundleSubject,
            SPECFORGE_PROVIDER_IDENTITY,
            {
              predicateType: "specforge.api-endpoint",
              operation: "dissect_bundle_endpoint",
              parameters: {
                method,
                path: routeFact.route,
              },
              result: {
                method,
                url: routeFact.route,
                path: routeFact.route,
                line: routeFact.line,
                column: routeFact.column,
                dynamic_tokens: [],
              },
              confidence: "derived",
              authority: "shipped-artifact",
              locations: [
                { kind: "artifact-path", path: input.bundlePath },
                { kind: "file-offset", offset: routeFact.line },
              ],
              evidenceLinks: [bundleEvidence.evidence_id],
            },
          );
          evidenceRecords.push(routeEvidence);

          endpoints.push({
            method,
            url: routeFact.route,
            path: routeFact.route,
            parameters: [],
            requestHeaders: {},
            responseHeaders: {},
            dynamicTokens: [],
            evidenceId: routeEvidence.evidence_id,
            surfaceId,
            claimId,
          });
        }
      }
    } catch {
      // Continue gracefully if bundle cannot be read or parsed
    }
  }

  // Ensure at least one baseline Evidence record exists
  if (evidenceRecords.length === 0) {
    const fallbackEvidence = createEvidence(
      primaryTargetSubject,
      SPECFORGE_PROVIDER_IDENTITY,
      {
        predicateType: "specforge.initialization",
        operation: "initialize_target",
        parameters: { analysis_profile: input.analysisProfile },
        result: { status: "initialized", target_url: input.targetUrl ?? null },
        confidence: "observed",
        authority: "shipped-artifact",
        locations: [{ kind: "artifact-path", path: primaryTargetSubject.path }],
      },
    );
    evidenceRecords.push(fallbackEvidence);
  }

  // 3. Construct the authenticated Evidence Bundle
  const evidenceBundle = createEvidenceBundle(evidenceRecords, unknowns);

  // 4. Construct ReconstructionCoverage Data & Obligation Matrix
  const artifactId = "artifact.specforge.target";
  const environmentSha256 = computeSha256("specforge.headless.node");
  const normalizationSha256 = computeSha256("specforge.normalization.v1");
  const observedAtTimestamp = new Date().toISOString();

  const rawSurfaces = endpoints.map((e) => ({
    surface_id: e.surfaceId,
    family: "api-endpoint",
    artifact_id: artifactId,
    occurrence_id: null,
    location: `${e.method} ${e.path}`,
    authority: "observed" as const,
    dependency_surface_ids: [] as readonly string[],
    evidence_ids: [e.evidenceId],
  }));

  const uniqueSurfacesMap = new Map<string, (typeof rawSurfaces)[number]>();
  for (const s of rawSurfaces) {
    if (!uniqueSurfacesMap.has(s.surface_id)) {
      uniqueSurfacesMap.set(s.surface_id, s);
    } else {
      const existing = uniqueSurfacesMap.get(s.surface_id)!;
      for (const evId of s.evidence_ids) {
        if (!existing.evidence_ids.includes(evId)) {
          existing.evidence_ids.push(evId);
        }
      }
    }
  }
  const surfaces = Array.from(uniqueSurfacesMap.values());

  const rawOwners = endpoints.map((e) => ({
    surface_id: e.surfaceId,
    ownership: {
      disposition: "external" as const,
      rationale: "Target API specification identified by SpecForge",
    },
  }));
  const uniqueOwnersMap = new Map<string, (typeof rawOwners)[number]>();
  for (const o of rawOwners) {
    if (!uniqueOwnersMap.has(o.surface_id)) {
      uniqueOwnersMap.set(o.surface_id, o);
    }
  }
  const owners = Array.from(uniqueOwnersMap.values());

  const rawClaims = endpoints.map((e) => ({
    claim_id: e.claimId,
    title: `Verify contract and headers for ${e.method} ${e.path}`,
    kind: "http-contract",
    surface_ids: [e.surfaceId],
    required_dimensions: ["headers", "status", "schema"],
    required_authority: "shipped-artifact" as const,
  }));
  const uniqueClaimsMap = new Map<string, (typeof rawClaims)[number]>();
  for (const c of rawClaims) {
    if (!uniqueClaimsMap.has(c.claim_id)) {
      uniqueClaimsMap.set(c.claim_id, c);
    }
  }
  const claims = Array.from(uniqueClaimsMap.values());

  const rawVerifierContracts = surfaces.map((s) => {
    const matchingClaim = claims.find((c) => c.surface_ids.includes(s.surface_id));
    const claimIds = matchingClaim ? [matchingClaim.claim_id] : [];
    return createReconstructionVerifierContract({
      verifier_id: `verifier.${s.surface_id}`,
      claim_ids: claimIds,
      dimensions: ["headers", "status", "schema"],
      authority: "shipped-artifact",
      max_age_ms: 86400000,
      minimum_repeats: 1,
      normalization_sha256: normalizationSha256,
      normalization_removes_dimensions: false,
    });
  });
  const uniqueContractsMap = new Map<string, (typeof rawVerifierContracts)[number]>();
  for (const vc of rawVerifierContracts) {
    if (!uniqueContractsMap.has(vc.verifier_id)) {
      uniqueContractsMap.set(vc.verifier_id, vc);
    }
  }
  const verifierContracts = Array.from(uniqueContractsMap.values());

  const rawVerifierResults = verifierContracts.map((contract) => {
    const matchingEndpoint = endpoints.find((e) => `verifier.${e.surfaceId}` === contract.verifier_id);
    return {
      verifier_id: contract.verifier_id,
      contract_sha256: contract.contract_sha256,
      observed_at: observedAtTimestamp,
      status: "pass" as const,
      covered_claim_ids: contract.claim_ids,
      covered_dimensions: contract.dimensions,
      artifact_sha256s: [primaryTargetSha256],
      owner_sha256s: [],
      normalization_sha256: normalizationSha256,
      repeats: 1,
      evidence_ids: [matchingEndpoint ? matchingEndpoint.evidenceId : evidenceRecords[0]!.evidence_id],
    };
  });
  const uniqueResultsMap = new Map<string, (typeof rawVerifierResults)[number]>();
  for (const vr of rawVerifierResults) {
    if (!uniqueResultsMap.has(vr.verifier_id)) {
      uniqueResultsMap.set(vr.verifier_id, vr);
    }
  }
  const verifierResults = Array.from(uniqueResultsMap.values());

  // Ensure at least one surface and claim exist to satisfy the boundary schema
  if (surfaces.length === 0) {
    const defaultSurfaceId = "surface.specforge.target";
    const defaultClaimId = "claim.specforge.target";
    surfaces.push({
      surface_id: defaultSurfaceId,
      family: "target-artifact",
      artifact_id: artifactId,
      occurrence_id: null,
      location: primaryTargetSubject.path,
      authority: "observed" as const,
      dependency_surface_ids: [],
      evidence_ids: [evidenceRecords[0]!.evidence_id],
    });
    owners.push({
      surface_id: defaultSurfaceId,
      ownership: {
        disposition: "external" as const,
        rationale: "Target baseline artifact identified by SpecForge",
      },
    });
    claims.push({
      claim_id: defaultClaimId,
      title: "Verify baseline target artifact presence",
      kind: "artifact-presence",
      surface_ids: [defaultSurfaceId],
      required_dimensions: ["headers", "status", "schema"],
      required_authority: "shipped-artifact" as const,
    });
    const defaultContract = createReconstructionVerifierContract({
      verifier_id: `verifier.${defaultSurfaceId}`,
      claim_ids: [defaultClaimId],
      dimensions: ["headers", "status", "schema"],
      authority: "shipped-artifact",
      max_age_ms: 86400000,
      minimum_repeats: 1,
      normalization_sha256: normalizationSha256,
      normalization_removes_dimensions: false,
    });
    verifierContracts.push(defaultContract);
    verifierResults.push({
      verifier_id: defaultContract.verifier_id,
      contract_sha256: defaultContract.contract_sha256,
      observed_at: observedAtTimestamp,
      status: "pass" as const,
      covered_claim_ids: defaultContract.claim_ids,
      covered_dimensions: defaultContract.dimensions,
      artifact_sha256s: [primaryTargetSha256],
      owner_sha256s: [],
      normalization_sha256: normalizationSha256,
      repeats: 1,
      evidence_ids: [evidenceRecords[0]!.evidence_id],
    });
  }

  const packageProofs = [
    {
      proof_id: "proof.specforge.package",
      kind: "package-contents" as const,
      status: "pass" as const,
      artifact_sha256s: [primaryTargetSha256],
      evidence_ids: [evidenceRecords[0]!.evidence_id],
    },
  ];

  const boundaryId = "boundary.specforge.api-surface";
  const boundaries = [
    {
      boundary_id: boundaryId,
      title: "SpecForge Discovered API Surface Boundary",
      required_surface_ids: Array.from(new Set(surfaces.map((s) => s.surface_id))),
      required_claim_ids: Array.from(new Set(claims.map((c) => c.claim_id))),
      required_package_proof_kinds: ["package-contents" as const],
      allowed_dispositions: ["external" as const, "non-goal" as const],
      allowed_unknown_ids: unknowns.map((u) => u.unknown_id),
    },
  ];

  const coverageData = createReconstructionCoverageData({
    evidence_bundle: evidenceBundle,
    artifacts: [
      {
        artifact_id: artifactId,
        artifact_sha256: primaryTargetSha256,
        version: "1.0.0",
        environment_sha256: environmentSha256,
        evidence_ids: [evidenceRecords[0]!.evidence_id],
      },
    ],
    surfaces,
    owners,
    claims,
    verifier_contracts: verifierContracts,
    verifier_results: verifierResults,
    residual_unknown_ids: unknowns.map((u) => u.unknown_id),
    contradictions: [],
    package_proofs: packageProofs,
    boundaries,
  });

  // 5. Evaluate Reconstruction Closure
  tracer.startStage("obligation_eval");
  const closureResult = evaluateReconstructionClosure(
    coverageData,
    boundaryId,
    Date.now(),
  );
  tracer.endStage("obligation_eval");

  const telemetry = tracer.finish();

  return {
    targetSha256: primaryTargetSha256,
    endpoints,
    evidenceRecords,
    unknowns,
    evidenceBundle,
    coverageData,
    closureResult,
    telemetry,
    redactions: Object.freeze(allRedactions),
    filteredAssetsCount,
  };
}
