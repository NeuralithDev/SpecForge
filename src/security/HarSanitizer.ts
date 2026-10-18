import { createHash } from "node:crypto";

/** Category of detected sensitive data. */
export type RedactionCategory =
  | "bearer-token"
  | "basic-auth"
  | "cookie"
  | "api-key"
  | "csrf-token"
  | "jwt"
  | "high-entropy-secret"
  | "email"
  | "phone"
  | "credit-card";

/** Individual redaction event record. */
export interface DiscoveredRedaction {
  readonly category: RedactionCategory;
  readonly field: string;
  readonly placeholder: string;
  readonly sha256Prefix: string;
  readonly originalKey?: string;
}

/** Dynamic authentication token isolated for runtime configuration. */
export interface DiscoveredRedactedToken {
  readonly name: string;
  readonly location: "header" | "cookie" | "query";
  readonly placeholder: string;
  readonly envVarName: string;
  readonly sha256Prefix: string;
}

/** Complete output of HAR sanitization. */
export interface HarSanitizationResult {
  readonly sanitizedHar: string;
  readonly redactionCount: number;
  readonly redactions: readonly DiscoveredRedaction[];
  readonly dynamicTokens: readonly DiscoveredRedactedToken[];
}

/** Complete output of text/bundle sanitization. */
export interface TextSanitizationResult {
  readonly sanitizedText: string;
  readonly redactionCount: number;
  readonly redactions: readonly DiscoveredRedaction[];
}

/** Calculate 8-character deterministic SHA-256 prefix of sensitive value. */
export const hashPrefix = (value: string): string =>
  createHash("sha256").update(value).digest("hex").slice(0, 8);

/** Known header names that carry credentials or sensitive auth tokens. */
const SENSITIVE_HEADER_NAMES = new Set([
  "authorization",
  "proxy-authorization",
  "x-api-key",
  "api-key",
  "apikey",
  "x-auth-token",
  "x-csrf-token",
  "x-xsrf-token",
  "csrf-token",
  "x-session-id",
  "x-signature",
  "cookie",
  "set-cookie",
]);

/** Convert token name to clean environment variable identifier. */
export const toEnvVarName = (name: string): string => {
  const clean = name.toUpperCase().replace(/[^A-Z0-9]/gu, "_").replace(/^_+|_+$/gu, "");
  return `SPECFORGE_AUTH_${clean || "TOKEN"}`;
};

/** PII and high-entropy secret pattern matchers. */
const EMAIL_REGEX = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/gu;
const PHONE_REGEX = /\b(?:\+?1[-.\s]?)?\(?[2-9]\d{2}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b/gu;
const CREDIT_CARD_REGEX = /\b(?:4[0-9]{12}(?:[0-9]{3})?|5[1-5][0-9]{14}|3[47][0-9]{13}|3(?:0[0-5]|[68][0-9])[0-9]{11}|6(?:011|5[0-9]{2})[0-9]{12})\b/gu;
const JWT_REGEX = /\bey[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\b/gu;
const HEX_SECRET_REGEX = /\b[a-f0-9]{32,64}\b/giu;

/**
 * Scrub free-form text or JSON string for PII, JWTs, and high-entropy secrets.
 */
export function scrubPiiAndSecrets(
  text: string,
  fieldPath: string = "content",
): { scrubbed: string; redactions: DiscoveredRedaction[] } {
  const redactions: DiscoveredRedaction[] = [];
  let scrubbed = text;

  // 1. Scrub Credit Cards
  scrubbed = scrubbed.replace(CREDIT_CARD_REGEX, (match) => {
    const prefix = hashPrefix(match);
    const placeholder = `<REDACTED_CREDIT_CARD_${prefix}>`;
    redactions.push({
      category: "credit-card",
      field: fieldPath,
      placeholder,
      sha256Prefix: prefix,
    });
    return placeholder;
  });

  // 2. Scrub Emails
  scrubbed = scrubbed.replace(EMAIL_REGEX, (match) => {
    const prefix = hashPrefix(match);
    const placeholder = `<REDACTED_EMAIL_${prefix}>`;
    redactions.push({
      category: "email",
      field: fieldPath,
      placeholder,
      sha256Prefix: prefix,
    });
    return placeholder;
  });

  // 3. Scrub Phone Numbers
  scrubbed = scrubbed.replace(PHONE_REGEX, (match) => {
    const prefix = hashPrefix(match);
    const placeholder = `<REDACTED_PHONE_${prefix}>`;
    redactions.push({
      category: "phone",
      field: fieldPath,
      placeholder,
      sha256Prefix: prefix,
    });
    return placeholder;
  });

  // 4. Scrub JWT Tokens
  scrubbed = scrubbed.replace(JWT_REGEX, (match) => {
    const prefix = hashPrefix(match);
    const placeholder = `<REDACTED_JWT_TOKEN_${prefix}>`;
    redactions.push({
      category: "jwt",
      field: fieldPath,
      placeholder,
      sha256Prefix: prefix,
    });
    return placeholder;
  });

  // 5. Scrub Hex Secrets
  scrubbed = scrubbed.replace(HEX_SECRET_REGEX, (match) => {
    // Avoid scrubbing already-redacted prefixes or standard UUIDs with hyphens
    if (match.length >= 32) {
      const prefix = hashPrefix(match);
      const placeholder = `<REDACTED_SECRET_${prefix}>`;
      redactions.push({
        category: "high-entropy-secret",
        field: fieldPath,
        placeholder,
        sha256Prefix: prefix,
      });
      return placeholder;
    }
    return match;
  });

  return { scrubbed, redactions };
}


/**
 * Sanitize an individual HTTP header key-value pair, returning structure-preserving placeholder.
 */
export function sanitizeHeaderValue(
  name: string,
  value: string,
  fieldPath: string,
): {
  sanitized: string;
  redactions: DiscoveredRedaction[];
  token?: DiscoveredRedactedToken;
} {
  const lower = name.toLowerCase();
  const redactions: DiscoveredRedaction[] = [];
  const prefix = hashPrefix(value);

  if (lower === "authorization") {
    if (/^bearer\s+/iu.test(value)) {
      const tokenValue = value.replace(/^bearer\s+/iu, "").trim();
      const tokenPrefix = hashPrefix(tokenValue);
      const placeholder = `Bearer <REDACTED_BEARER_TOKEN_${tokenPrefix}>`;
      const redaction: DiscoveredRedaction = {
        category: "bearer-token",
        field: fieldPath,
        placeholder,
        sha256Prefix: tokenPrefix,
        originalKey: name,
      };
      redactions.push(redaction);
      return {
        sanitized: placeholder,
        redactions,
        token: {
          name: "authorization",
          location: "header",
          placeholder,
          envVarName: "SPECFORGE_AUTH_BEARER_TOKEN",
          sha256Prefix: tokenPrefix,
        },
      };
    }
    if (/^basic\s+/iu.test(value)) {
      const basicPrefix = hashPrefix(value);
      const placeholder = `Basic <REDACTED_BASIC_AUTH_${basicPrefix}>`;
      redactions.push({
        category: "basic-auth",
        field: fieldPath,
        placeholder,
        sha256Prefix: basicPrefix,
        originalKey: name,
      });
      return {
        sanitized: placeholder,
        redactions,
        token: {
          name: "authorization",
          location: "header",
          placeholder,
          envVarName: "SPECFORGE_AUTH_BASIC_AUTH",
          sha256Prefix: basicPrefix,
        },
      };
    }
  }

  if (lower === "cookie" || lower === "set-cookie") {
    // Parse cookie pairs: k=v; k2=v2
    const pairs = value.split(";");
    const sanitizedPairs: string[] = [];
    let primaryToken: DiscoveredRedactedToken | undefined;

    for (const pair of pairs) {
      const [cookieName, ...cookieValParts] = pair.split("=");
      const cName = cookieName ? cookieName.trim() : "";
      const cVal = cookieValParts.join("=").trim();
      if (cName.length > 0) {
        const cPrefix = hashPrefix(cVal || cName);
        const placeholder = `<REDACTED_COOKIE_${cName.toUpperCase().replace(/[^A-Z0-9]/gu, "_")}_${cPrefix}>`;
        sanitizedPairs.push(`${cName}=${placeholder}`);
        redactions.push({
          category: "cookie",
          field: `${fieldPath}.${cName}`,
          placeholder,
          sha256Prefix: cPrefix,
          originalKey: cName,
        });
        if (!primaryToken) {
          primaryToken = {
            name: cName,
            location: "cookie",
            placeholder,
            envVarName: toEnvVarName(cName),
            sha256Prefix: cPrefix,
          };
        }
      } else {
        sanitizedPairs.push(pair);
      }
    }
    return {
      sanitized: sanitizedPairs.join("; "),
      redactions,
      ...(primaryToken !== undefined ? { token: primaryToken } : {}),
    };
  }

  if (SENSITIVE_HEADER_NAMES.has(lower) || /token|key|secret|auth|csrf|xsrf|session/iu.test(name)) {
    const isCsrf = /csrf|xsrf/iu.test(name);
    const category: RedactionCategory = isCsrf ? "csrf-token" : "api-key";
    const placeholder = `<REDACTED_${name.toUpperCase().replace(/[^A-Z0-9]/gu, "_")}_${prefix}>`;
    redactions.push({
      category,
      field: fieldPath,
      placeholder,
      sha256Prefix: prefix,
      originalKey: name,
    });
    return {
      sanitized: placeholder,
      redactions,
      token: {
        name,
        location: "header",
        placeholder,
        envVarName: toEnvVarName(name),
        sha256Prefix: prefix,
      },
    };
  }

  // Fallback: check value for JWT or PII
  const piiResult = scrubPiiAndSecrets(value, fieldPath);
  return {
    sanitized: piiResult.scrubbed,
    redactions: piiResult.redactions,
  };
}

/**
 * Sanitize an entire HAR 1.2 payload string, returning sanitized JSON and discovered redactions.
 */
export function sanitizeHarPayload(rawHar: string): HarSanitizationResult {
  const redactions: DiscoveredRedaction[] = [];
  const dynamicTokens: DiscoveredRedactedToken[] = [];

  let parsed: unknown;
  try {
    parsed = JSON.parse(rawHar);
  } catch {
    // If not JSON, scrub as text
    const textResult = sanitizeSourceText(rawHar);
    return {
      sanitizedHar: textResult.sanitizedText,
      redactionCount: textResult.redactionCount,
      redactions: textResult.redactions,
      dynamicTokens: [],
    };
  }

  if (typeof parsed !== "object" || parsed === null) {
    return {
      sanitizedHar: rawHar,
      redactionCount: 0,
      redactions: [],
      dynamicTokens: [],
    };
  }

  const harObj = parsed as {
    log?: {
      entries?: Array<{
        request?: {
          method?: string;
          url?: string;
          headers?: Array<{ name: string; value: string }>;
          cookies?: Array<{ name: string; value: string }>;
          queryString?: Array<{ name: string; value: string }>;
          postData?: { mimeType?: string; text?: string };
        };
        response?: {
          status?: number;
          headers?: Array<{ name: string; value: string }>;
          cookies?: Array<{ name: string; value: string }>;
          content?: { mimeType?: string; text?: string };
        };
      }>;
    };
  };

  const entries = harObj.log?.entries ?? [];

  for (const [entryIdx, entry] of entries.entries()) {
    const req = entry.request;
    const res = entry.response;

    // Sanitize Request Headers
    if (Array.isArray(req?.headers)) {
      for (const [hIdx, header] of req.headers.entries()) {
        const path = `log.entries[${entryIdx}].request.headers[${hIdx}]`;
        const resHeader = sanitizeHeaderValue(header.name, header.value, path);
        header.value = resHeader.sanitized;
        redactions.push(...resHeader.redactions);
        if (resHeader.token) {
          if (!dynamicTokens.some((t) => t.name.toLowerCase() === resHeader.token!.name.toLowerCase())) {
            dynamicTokens.push(resHeader.token);
          }
        }
      }
    }

    // Sanitize Request Cookies
    if (Array.isArray(req?.cookies)) {
      for (const [cIdx, cookie] of req.cookies.entries()) {
        const path = `log.entries[${entryIdx}].request.cookies[${cIdx}]`;
        const cPrefix = hashPrefix(cookie.value);
        const placeholder = `<REDACTED_COOKIE_${cookie.name.toUpperCase().replace(/[^A-Z0-9]/gu, "_")}_${cPrefix}>`;
        cookie.value = placeholder;
        redactions.push({
          category: "cookie",
          field: path,
          placeholder,
          sha256Prefix: cPrefix,
          originalKey: cookie.name,
        });
        if (!dynamicTokens.some((t) => t.name.toLowerCase() === cookie.name.toLowerCase())) {
          dynamicTokens.push({
            name: cookie.name,
            location: "cookie",
            placeholder,
            envVarName: toEnvVarName(cookie.name),
            sha256Prefix: cPrefix,
          });
        }
      }
    }

    // Sanitize Request Body (postData)
    if (req?.postData?.text) {
      const path = `log.entries[${entryIdx}].request.postData.text`;
      const scrubbed = scrubPiiAndSecrets(req.postData.text, path);
      req.postData.text = scrubbed.scrubbed;
      redactions.push(...scrubbed.redactions);
    }

    // Sanitize Response Headers
    if (Array.isArray(res?.headers)) {
      for (const [hIdx, header] of res.headers.entries()) {
        const path = `log.entries[${entryIdx}].response.headers[${hIdx}]`;
        const resHeader = sanitizeHeaderValue(header.name, header.value, path);
        header.value = resHeader.sanitized;
        redactions.push(...resHeader.redactions);
      }
    }

    // Sanitize Response Content
    if (res?.content?.text) {
      const path = `log.entries[${entryIdx}].response.content.text`;
      const scrubbed = scrubPiiAndSecrets(res.content.text, path);
      res.content.text = scrubbed.scrubbed;
      redactions.push(...scrubbed.redactions);
    }
  }

  const sanitizedHar = JSON.stringify(harObj, null, 2);

  return {
    sanitizedHar,
    redactionCount: redactions.length,
    redactions: Object.freeze(redactions),
    dynamicTokens: Object.freeze(dynamicTokens),
  };
}

/**
 * Sanitize arbitrary source code or bundle string, removing PII, JWTs, and high-entropy credentials.
 */
export function sanitizeSourceText(rawText: string): TextSanitizationResult {
  const result = scrubPiiAndSecrets(rawText, "bundle.source");
  return {
    sanitizedText: result.scrubbed,
    redactionCount: result.redactions.length,
    redactions: Object.freeze(result.redactions),
  };
}
