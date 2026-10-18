/**
 * cURL command parser and serializer for SpecForge Studio.
 * Robustly parses -X, --request, -H, --header, -d, --data, --data-raw, -b, --cookie, -u, --user, query params.
 */

import type { ApiRequest, HttpMethod, KeyValueParam, RequestAuthConfig, RequestBodyConfig, Environment } from "./localStore.js";
import { interpolateVariables } from "./localStore.js";

export interface ParsedCurlResult {
  method: HttpMethod;
  url: string;
  params: KeyValueParam[];
  headers: KeyValueParam[];
  auth: RequestAuthConfig;
  body: RequestBodyConfig;
}

/**
 * Parses a cURL command string into SpecForge Studio request format.
 */
export function parseCurlCommand(rawCurl: string): ParsedCurlResult {
  // Normalize escaped line breaks and excess whitespace
  const normalized = rawCurl
    .replace(/\\\r?\n/gu, " ")
    .replace(/\s+/gu, " ")
    .trim();

  // Basic regex tokenizer respecting single and double quotes
  const tokens: string[] = [];
  const regex = /[^\s"']+|"([^"\\]*(?:\\.[^"\\]*)*)"|'([^'\\]*(?:\\.[^'\\]*)*)'/gu;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(normalized)) !== null) {
    if (match[1] !== undefined) {
      tokens.push(match[1].replace(/\\"/gu, '"'));
    } else if (match[2] !== undefined) {
      tokens.push(match[2].replace(/\\'/gu, "'"));
    } else {
      tokens.push(match[0]);
    }
  }

  let method: HttpMethod = "GET";
  let url = "";
  const headers: KeyValueParam[] = [];
  const auth: RequestAuthConfig = { type: "none" };
  let bodyType: RequestBodyConfig["type"] = "none";
  let rawBody = "";

  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];
    if (!token) continue;

    if (token === "curl") {
      continue;
    }

    if (token === "-X" || token === "--request") {
      const next = tokens[++i];
      if (next) method = next.toUpperCase() as HttpMethod;
    } else if (token === "-H" || token === "--header") {
      const next = tokens[++i];
      if (next) {
        const colonIdx = next.indexOf(":");
        if (colonIdx !== -1) {
          const key = next.slice(0, colonIdx).trim();
          const val = next.slice(colonIdx + 1).trim();

          // Check if Authorization header
          if (key.toLowerCase() === "authorization") {
            if (val.toLowerCase().startsWith("bearer ")) {
              auth.type = "bearer";
              auth.bearerToken = val.slice(7).trim();
            } else if (val.toLowerCase().startsWith("basic ")) {
              auth.type = "basic";
            }
          }

          headers.push({
            id: `h_curl_${Date.now()}_${headers.length}`,
            key,
            value: val,
            enabled: true,
          });
        }
      }
    } else if (
      token === "-d" ||
      token === "--data" ||
      token === "--data-raw" ||
      token === "--data-binary"
    ) {
      const next = tokens[++i];
      if (next) {
        rawBody = next;
        bodyType = "json";
        // If method wasn't explicitly set, default to POST when data is present
        if (method === "GET") method = "POST";
      }
    } else if (token === "-b" || token === "--cookie") {
      const next = tokens[++i];
      if (next) {
        auth.type = "cookie";
        auth.cookieHeader = next;
        headers.push({
          id: `h_cookie_${Date.now()}`,
          key: "Cookie",
          value: next,
          enabled: true,
        });
      }
    } else if (token === "-u" || token === "--user") {
      const next = tokens[++i];
      if (next) {
        const [u, p] = next.split(":");
        auth.type = "basic";
        auth.basicUser = u ?? "";
        auth.basicPass = p ?? "";
      }
    } else if (!token.startsWith("-") && (!url || url.length === 0)) {
      url = token;
    }
  }

  // Parse query parameters from URL
  const params: KeyValueParam[] = [];
  try {
    const parsedUrl = new URL(url.startsWith("http") ? url : `https://${url}`);
    parsedUrl.searchParams.forEach((value, key) => {
      params.push({
        id: `p_curl_${Date.now()}_${params.length}`,
        key,
        value,
        enabled: true,
      });
    });
  } catch {
    // If invalid URL structure, leave params empty
  }

  // Try parsing raw body as JSON
  let formattedJson: string | undefined;
  if (rawBody) {
    try {
      formattedJson = JSON.stringify(JSON.parse(rawBody), null, 2);
    } catch {
      formattedJson = rawBody;
    }
  }

  return {
    method,
    url: url || "https://api.example.com/v1/endpoint",
    params,
    headers: headers.length > 0 ? headers : [
      { id: `h_init_${Date.now()}`, key: "Content-Type", value: "application/json", enabled: true },
    ],
    auth,
    body: {
      type: formattedJson ? "json" : bodyType,
      rawJson: formattedJson ?? undefined,
    },
  };
}

/**
 * Serializes an ApiRequest into a ready-to-run cURL command string.
 */
export function serializeToCurl(
  request: Partial<ApiRequest> & Pick<ApiRequest, "method" | "url">,
  env?: Environment | null
): string {
  const resolvedUrl = interpolateVariables(request.url, env);
  const parts: string[] = [`curl -X ${request.method} "${resolvedUrl}"`];

  // Headers
  for (const h of request.headers ?? []) {
    if (h.enabled && h.key.trim().length > 0) {
      const val = interpolateVariables(h.value, env);
      parts.push(`  -H "${h.key.trim()}: ${val}"`);
    }
  }

  // Auth Header
  if (request.auth?.type === "bearer" && request.auth.bearerToken) {
    const token = interpolateVariables(request.auth.bearerToken, env);
    if (!request.headers?.some((h: KeyValueParam) => h.key.toLowerCase() === "authorization")) {
      parts.push(`  -H "Authorization: Bearer ${token}"`);
    }
  } else if (request.auth?.type === "basic" && request.auth.basicUser) {
    parts.push(`  -u "${request.auth.basicUser}:${request.auth.basicPass ?? ""}"`);
  }

  // Body
  const rawBody = request.body?.rawJson ?? (request.body as { raw?: string } | undefined)?.raw;
  if (request.body?.type === "json" && rawBody) {
    const resolvedBody = interpolateVariables(rawBody, env);
    const escaped = resolvedBody.replace(/"/gu, '\\"').replace(/\n/gu, " ");
    parts.push(`  --data-raw "${escaped}"`);
  }

  return parts.join(" \\\n");
}
