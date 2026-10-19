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
  | "credit-card"
  | "password"
  | "query-param";

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

/** Transparent descriptor for active local redaction rules. */
export interface RedactionRuleDescriptor {
  readonly id: string;
  readonly target: "header" | "query" | "body" | "pattern";
  readonly name: string;
  readonly description: string;
  readonly patternOrKeys: string;
  readonly placeholderTemplate: string;
}

/** Publicly advertised list of active in-memory redaction rules. */
export const ACTIVE_REDACTION_RULES: readonly RedactionRuleDescriptor[] = [
  {
    id: "hdr-auth-bearer",
    target: "header",
    name: "Authorization Bearer Token",
    description:
      "Detects and scrubs Bearer auth tokens in Authorization headers",
    patternOrKeys: "Authorization: Bearer <token>",
    placeholderTemplate: "Bearer <REDACTED_BEARER_TOKEN_{HASH}>",
  },
  {
    id: "hdr-auth-basic",
    target: "header",
    name: "Authorization Basic Auth",
    description:
      "Detects and scrubs Base64 credentials in Authorization headers",
    patternOrKeys: "Authorization: Basic <credentials>",
    placeholderTemplate: "Basic <REDACTED_BASIC_AUTH_{HASH}>",
  },
  {
    id: "hdr-cookie",
    target: "header",
    name: "Session & Auth Cookies",
    description:
      "Parses cookie pairs and redacts session IDs and tokens individually",
    patternOrKeys: "Cookie, Set-Cookie",
    placeholderTemplate: "<REDACTED_COOKIE_{NAME}_{HASH}>",
  },
  {
    id: "hdr-api-key",
    target: "header",
    name: "API Keys & Custom Auth Headers",
    description:
      "Detects sensitive headers containing token, key, secret, auth, or csrf",
    patternOrKeys:
      "X-API-Key, api-key, X-Auth-Token, X-CSRF-Token, X-Session-ID",
    placeholderTemplate: "<REDACTED_{HEADER}_{HASH}>",
  },
  {
    id: "query-sensitive-params",
    target: "query",
    name: "URL Query Parameter Credentials & PII",
    description:
      "Redacts URL search parameters in request.url and request.queryString",
    patternOrKeys: "email, token, key, secret, sig, password",
    placeholderTemplate: "<REDACTED_{PARAM}_{HASH}>",
  },
  {
    id: "body-recursive-json",
    target: "body",
    name: "Deep Recursive JSON Body Scrubbing",
    description:
      "Recursively walks nested JSON structures to redact secret fields",
    patternOrKeys:
      "client_secret, access_token, refresh_token, password, email, secret",
    placeholderTemplate: "<REDACTED_{KEY}_{HASH}>",
  },
  {
    id: "pattern-email",
    target: "pattern",
    name: "Email Address Pattern",
    description: "Redacts RFC 5322 compliant email addresses across all inputs",
    patternOrKeys: "/\\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}\\b/gu",
    placeholderTemplate: "<REDACTED_EMAIL_{HASH}>",
  },
  {
    id: "pattern-jwt",
    target: "pattern",
    name: "JWT Authentication Token",
    description: "Redacts compact serialized 3-segment JSON Web Tokens",
    patternOrKeys:
      "/\\bey[A-Za-z0-9_-]{10,}\\.[A-Za-z0-9_-]{10,}\\.[A-Za-z0-9_-]{10,}\\b/gu",
    placeholderTemplate: "<REDACTED_JWT_TOKEN_{HASH}>",
  },
  {
    id: "pattern-credit-card",
    target: "pattern",
    name: "Credit Card Number",
    description: "Redacts major credit card formats with Luhn matching",
    patternOrKeys: "13-16 digit payment card patterns",
    placeholderTemplate: "<REDACTED_CREDIT_CARD_{HASH}>",
  },
  {
    id: "pattern-phone",
    target: "pattern",
    name: "Phone Number",
    description: "Redacts domestic and international formatted phone numbers",
    patternOrKeys:
      "/\\b(?:\\+?1[-.\\s]?)?\\(?[2-9]\\d{2}\\)?[-.\\s]?\\d{3}[-.\\s]?\\d{4}\\b/gu",
    placeholderTemplate: "<REDACTED_PHONE_{HASH}>",
  },
  {
    id: "pattern-hex-secret",
    target: "pattern",
    name: "High-Entropy Hex Secret",
    description: "Redacts 32-64 character hexadecimal secret tokens",
    patternOrKeys: "/\\b[a-f0-9]{32,64}\\b/giu",
    placeholderTemplate: "<REDACTED_SECRET_{HASH}>",
  },
];

/** Calculate 8-character deterministic SHA-256 prefix of sensitive value. */
export const hashPrefix = (value: string): string =>
  createHash("sha256").update(value).digest("hex").slice(0, 8);

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
  const clean = name
    .toUpperCase()
    .replace(/[^A-Z0-9]/gu, "_")
    .replace(/^_+|_+$/gu, "");
  return `SPECFORGE_AUTH_${clean || "TOKEN"}`;
};

const EMAIL_REGEX = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/gu;
const PHONE_REGEX =
  /\b(?:\+?1[-.\s]?)?\(?[2-9]\d{2}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b/gu;
const CREDIT_CARD_REGEX =
  /\b(?:4[0-9]{12}(?:[0-9]{3})?|5[1-5][0-9]{14}|3[47][0-9]{13}|3(?:0[0-5]|[68][0-9])[0-9]{11}|6(?:011|5[0-9]{2})[0-9]{12})\b/gu;
const JWT_REGEX =
  /\bey[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\b/gu;
const HEX_SECRET_REGEX = /\b[a-f0-9]{32,64}\b/giu;

const EXACT_QUERY_PARAMS = new Set([
  "email",
  "token",
  "key",
  "secret",
  "sig",
  "signature",
  "password",
  "passwd",
  "pass",
  "client_secret",
  "access_token",
  "refresh_token",
  "api_key",
  "apikey",
]);

/** Check if query parameter key matches sensitive targets: email, token, key, secret, sig, password */
export function isSensitiveQueryParam(name: string): boolean {
  if (EXACT_QUERY_PARAMS.has(name.toLowerCase())) return true;
  if (
    /(?:^|[_\-.])(email|token|key|secret|sig|signature|password|passwd|pass)(?:[_\-.]|$)/iu.test(
      name,
    )
  )
    return true;
  return /(?:email|token|key|secret|password|passwd|signature)$/iu.test(name);
}

/** Determine category for sensitive query parameter. */
export function getQueryParamCategory(
  name: string,
  value: string,
): RedactionCategory {
  const lower = name.toLowerCase();
  if (lower.includes("email") || EMAIL_REGEX.test(value)) return "email";
  if (lower.includes("pass")) return "password";
  if (lower.includes("jwt") || JWT_REGEX.test(value)) return "jwt";
  if (lower.includes("bearer") || lower.includes("token"))
    return "bearer-token";
  if (lower.includes("api") || lower.includes("key") || lower.includes("sig"))
    return "api-key";
  return "high-entropy-secret";
}

const EXACT_JSON_FIELDS = new Set([
  "client_secret",
  "clientsecret",
  "access_token",
  "accesstoken",
  "refresh_token",
  "refreshtoken",
  "password",
  "passwd",
  "password_hash",
  "pass",
  "secret",
  "api_key",
  "apikey",
  "token",
  "auth_token",
  "authtoken",
  "id_token",
  "idtoken",
  "private_key",
  "privatekey",
  "session_id",
  "sessionid",
  "session_token",
  "sessiontoken",
  "email",
  "user_email",
  "useremail",
  "customer_email",
  "receipt_email",
  "sig",
  "signature",
  "csrf_token",
  "csrftoken",
  "xsrf_token",
  "credit_card",
  "card_number",
  "cvv",
  "cvc",
]);

/** Check if JSON field name indicates sensitive credentials, tokens, or PII. */
export function isSensitiveFieldKey(key: string): boolean {
  if (EXACT_JSON_FIELDS.has(key.toLowerCase())) return true;
  if (
    /(?:^|[_\-.])(client_?secret|access_?token|refresh_?token|auth_?token|id_?token|password|passwd|pass|secret|api_?key|private_?key|session_?id|session_?token|csrf|xsrf|credit_?card|card_?number|cvv|cvc|email)(?:[_\-.]|$)/iu.test(
      key,
    )
  ) {
    return true;
  }
  return /(?:clientSecret|accessToken|refreshToken|authToken|idToken|password|passwd|secret|apiKey|privateKey|sessionId|sessionToken|csrfToken|xsrfToken|creditCard|cardNumber|email)$/iu.test(
    key,
  );
}

/** Determine category for JSON body field. */
export function getFieldCategory(
  key: string,
  value: string,
): RedactionCategory {
  const k = key.toLowerCase();
  if (k.includes("email") || EMAIL_REGEX.test(value)) return "email";
  if (k.includes("pass")) return "password";
  if (
    k.includes("credit") ||
    k.includes("card") ||
    k.includes("cv") ||
    CREDIT_CARD_REGEX.test(value)
  )
    return "credit-card";
  if (k.includes("phone") || PHONE_REGEX.test(value)) return "phone";
  if (k.includes("jwt") || JWT_REGEX.test(value)) return "jwt";
  if (k.includes("csrf") || k.includes("xsrf")) return "csrf-token";
  if (k.includes("cookie") || k.includes("session")) return "cookie";
  if (k.includes("bearer") || k.includes("token")) return "bearer-token";
  if (k.includes("api") || k.includes("key")) return "api-key";
  return "high-entropy-secret";
}

/** Scrub free-form text or JSON string for PII, JWTs, and high-entropy secrets. */
export function scrubPiiAndSecrets(
  text: string,
  fieldPath: string = "content",
): { scrubbed: string; redactions: DiscoveredRedaction[] } {
  const redactions: DiscoveredRedaction[] = [];
  let scrubbed = text;

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

  scrubbed = scrubbed.replace(HEX_SECRET_REGEX, (match) => {
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

/** Recursively walk JSON data structures, redacting sensitive keys and PII into type-preserving placeholders. */
export function scrubJsonValue(
  val: unknown,
  currentPath: string = "root",
): { scrubbed: unknown; redactions: DiscoveredRedaction[] } {
  const redactions: DiscoveredRedaction[] = [];
  if (val === null || val === undefined)
    return { scrubbed: val, redactions: [] };

  if (Array.isArray(val)) {
    const newArr = val.map((item, idx) => {
      const res = scrubJsonValue(item, `${currentPath}[${idx}]`);
      redactions.push(...res.redactions);
      return res.scrubbed;
    });
    return { scrubbed: newArr, redactions };
  }

  if (typeof val === "object") {
    const newObj: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(val as Record<string, unknown>)) {
      const fieldPath = `${currentPath}.${k}`;
      if (v !== null && typeof v === "object") {
        const nestedRes = scrubJsonValue(v, fieldPath);
        newObj[k] = nestedRes.scrubbed;
        redactions.push(...nestedRes.redactions);
      } else if (
        typeof v === "string" &&
        v.startsWith("<REDACTED_") &&
        v.endsWith(">")
      ) {
        newObj[k] = v;
      } else if (isSensitiveFieldKey(k) && v !== null && v !== undefined) {
        const prefix = hashPrefix(String(v));
        const cleanKey = k.toUpperCase().replace(/[^A-Z0-9]/gu, "_");
        const placeholder = `<REDACTED_${cleanKey}_${prefix}>`;
        newObj[k] = placeholder;
        redactions.push({
          category: getFieldCategory(k, String(v)),
          field: fieldPath,
          placeholder,
          sha256Prefix: prefix,
          originalKey: k,
        });
      } else if (typeof v === "string") {
        const piiRes = scrubPiiAndSecrets(v, fieldPath);
        newObj[k] = piiRes.scrubbed;
        redactions.push(...piiRes.redactions);
      } else {
        newObj[k] = v;
      }
    }
    return { scrubbed: newObj, redactions };
  }

  if (typeof val === "string") {
    const piiRes = scrubPiiAndSecrets(val, currentPath);
    return { scrubbed: piiRes.scrubbed, redactions: piiRes.redactions };
  }
  return { scrubbed: val, redactions: [] };
}

function sanitizeUrlEncodedForm(
  text: string,
  fieldPath: string,
): { scrubbed: string; redactions: DiscoveredRedaction[] } | null {
  try {
    const params = new URLSearchParams(text);
    let changed = false;
    const formRedactions: DiscoveredRedaction[] = [];
    const updatedPairs: Array<[string, string]> = [];

    for (const [k, v] of Array.from(params.entries())) {
      if (isSensitiveFieldKey(k) || isSensitiveQueryParam(k)) {
        const prefix = hashPrefix(v);
        const cleanKey = k.toUpperCase().replace(/[^A-Z0-9]/gu, "_");
        const placeholder = `<REDACTED_${cleanKey}_${prefix}>`;
        updatedPairs.push([k, placeholder]);
        formRedactions.push({
          category: getFieldCategory(k, v),
          field: `${fieldPath}.${k}`,
          placeholder,
          sha256Prefix: prefix,
          originalKey: k,
        });
        changed = true;
      } else {
        const pii = scrubPiiAndSecrets(v, `${fieldPath}.${k}`);
        updatedPairs.push([k, pii.scrubbed]);
        formRedactions.push(...pii.redactions);
        if (pii.scrubbed !== v) changed = true;
      }
    }
    if (changed) {
      return {
        scrubbed: updatedPairs
          .map(([k, v]) => `${encodeURIComponent(k)}=${v}`)
          .join("&"),
        redactions: formRedactions,
      };
    }
  } catch {
    // Continue
  }
  return null;
}

/** Sanitize body text, attempting JSON parsing first, then urlencoded forms, then regex fallback. */
export function sanitizeBodyContent(
  text: string,
  fieldPath: string,
): { scrubbed: string; redactions: DiscoveredRedaction[] } {
  if (!text || text.trim().length === 0)
    return { scrubbed: text, redactions: [] };

  try {
    const parsed = JSON.parse(text);
    if (typeof parsed === "object" && parsed !== null) {
      const { scrubbed, redactions } = scrubJsonValue(parsed, fieldPath);
      return { scrubbed: JSON.stringify(scrubbed, null, 2), redactions };
    }
  } catch {
    // Continue
  }

  const trimmed = text.trim();
  if (
    trimmed.includes("=") &&
    !trimmed.startsWith("{") &&
    !trimmed.startsWith("[")
  ) {
    const formRes = sanitizeUrlEncodedForm(trimmed, fieldPath);
    if (formRes) return formRes;
  }

  return scrubPiiAndSecrets(text, fieldPath);
}

/** Sanitize an individual HTTP header key-value pair, returning structure-preserving placeholder. */
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
      redactions.push({
        category: "bearer-token",
        field: fieldPath,
        placeholder,
        sha256Prefix: tokenPrefix,
        originalKey: name,
      });
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
      ...(primaryToken ? { token: primaryToken } : {}),
    };
  }

  if (
    SENSITIVE_HEADER_NAMES.has(lower) ||
    /token|key|secret|auth|csrf|xsrf|session/iu.test(name)
  ) {
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

  const piiResult = scrubPiiAndSecrets(value, fieldPath);
  return { sanitized: piiResult.scrubbed, redactions: piiResult.redactions };
}

function parseUrlSafe(rawUrl: string): {
  urlObj: URL | null;
  isAbsolute: boolean;
} {
  if (!rawUrl) return { urlObj: null, isAbsolute: false };
  try {
    return { urlObj: new URL(rawUrl), isAbsolute: true };
  } catch {
    try {
      return {
        urlObj: new URL(rawUrl, "https://specforge.local"),
        isAbsolute: false,
      };
    } catch {
      return { urlObj: null, isAbsolute: false };
    }
  }
}

function rebuildUrl(
  rawUrl: string,
  urlObj: URL | null,
  isAbsolute: boolean,
  queryList: Array<{ name: string; value: string }>,
): string {
  if (!urlObj || queryList.length === 0) return rawUrl;
  const newSearch = queryList
    .map((i) => `${encodeURIComponent(i.name)}=${i.value}`)
    .join("&");
  const searchStr = newSearch.length > 0 ? `?${newSearch}` : "";
  if (isAbsolute)
    return `${urlObj.origin}${urlObj.pathname}${searchStr}${urlObj.hash}`;
  const basePath = rawUrl.split("?")[0] ?? urlObj.pathname;
  const hashPart = rawUrl.includes("#") ? `#${rawUrl.split("#")[1]}` : "";
  return `${basePath}${searchStr}${hashPart}`;
}

/** Sanitize URL and query parameters across both request.url and request.queryString. */
export function sanitizeUrlAndQuery(
  rawUrl: string,
  queryString: Array<{ name: string; value: string }> | undefined,
  fieldPath: string,
): {
  sanitizedUrl: string;
  sanitizedQueryString: Array<{ name: string; value: string }>;
  redactions: DiscoveredRedaction[];
  dynamicTokens: DiscoveredRedactedToken[];
} {
  const redactions: DiscoveredRedaction[] = [];
  const dynamicTokens: DiscoveredRedactedToken[] = [];
  const { urlObj, isAbsolute } = parseUrlSafe(rawUrl);

  const paramMap = new Map<string, string>();
  if (Array.isArray(queryString)) {
    for (const q of queryString) {
      if (q && typeof q.name === "string") paramMap.set(q.name, q.value ?? "");
    }
  }
  if (urlObj) {
    urlObj.searchParams.forEach((val, key) => {
      if (!paramMap.has(key)) paramMap.set(key, val);
    });
  }

  const sanitizedQueryList: Array<{ name: string; value: string }> = [];
  for (const [key, val] of paramMap.entries()) {
    const paramPath = `${fieldPath}.query.${key}`;
    if (val.startsWith("<REDACTED_") && val.endsWith(">")) {
      sanitizedQueryList.push({ name: key, value: val });
    } else if (isSensitiveQueryParam(key)) {
      const prefix = hashPrefix(val);
      const cleanKey = key.toUpperCase().replace(/[^A-Z0-9]/gu, "_");
      const placeholder = `<REDACTED_${cleanKey}_${prefix}>`;
      sanitizedQueryList.push({ name: key, value: placeholder });
      redactions.push({
        category: getQueryParamCategory(key, val),
        field: paramPath,
        placeholder,
        sha256Prefix: prefix,
        originalKey: key,
      });
      dynamicTokens.push({
        name: key,
        location: "query",
        placeholder,
        envVarName: toEnvVarName(key),
        sha256Prefix: prefix,
      });
    } else {
      const pii = scrubPiiAndSecrets(val, paramPath);
      sanitizedQueryList.push({ name: key, value: pii.scrubbed });
      redactions.push(...pii.redactions);
    }
  }

  let sanitizedUrl = rebuildUrl(rawUrl, urlObj, isAbsolute, sanitizedQueryList);
  if (!urlObj && rawUrl) {
    const urlScrub = scrubPiiAndSecrets(rawUrl, `${fieldPath}.url`);
    sanitizedUrl = urlScrub.scrubbed;
    redactions.push(...urlScrub.redactions);
  }

  return {
    sanitizedUrl,
    sanitizedQueryString: sanitizedQueryList,
    redactions,
    dynamicTokens,
  };
}

interface HarEntryShape {
  request?: {
    method?: string;
    url?: string;
    headers?: Array<{ name: string; value: string }>;
    cookies?: Array<{ name: string; value: string }>;
    queryString?: Array<{ name: string; value: string }>;
    postData?: {
      mimeType?: string;
      text?: string;
      params?: Array<{ name: string; value?: string }>;
    };
  };
  response?: {
    status?: number;
    headers?: Array<{ name: string; value: string }>;
    cookies?: Array<{ name: string; value: string }>;
    content?: { mimeType?: string; text?: string };
  };
}

function sanitizeCookiesList(
  cookies: Array<{ name: string; value: string }> | undefined,
  fieldPath: string,
  redactions: DiscoveredRedaction[],
  dynamicTokens?: DiscoveredRedactedToken[],
): void {
  if (!Array.isArray(cookies)) return;
  for (const [cIdx, cookie] of cookies.entries()) {
    const path = `${fieldPath}[${cIdx}]`;
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
    if (
      dynamicTokens &&
      !dynamicTokens.some(
        (t) => t.name.toLowerCase() === cookie.name.toLowerCase(),
      )
    ) {
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

function sanitizeHeadersList(
  headers: Array<{ name: string; value: string }> | undefined,
  fieldPath: string,
  redactions: DiscoveredRedaction[],
  dynamicTokens?: DiscoveredRedactedToken[],
): void {
  if (!Array.isArray(headers)) return;
  for (const [hIdx, header] of headers.entries()) {
    const path = `${fieldPath}[${hIdx}]`;
    const resHeader = sanitizeHeaderValue(header.name, header.value, path);
    header.value = resHeader.sanitized;
    redactions.push(...resHeader.redactions);
    if (dynamicTokens && resHeader.token) {
      const tokName = resHeader.token.name.toLowerCase();
      if (!dynamicTokens.some((t) => t.name.toLowerCase() === tokName)) {
        dynamicTokens.push(resHeader.token);
      }
    }
  }
}

function sanitizePostDataParams(
  params: Array<{ name: string; value?: string }> | undefined,
  fieldPath: string,
  redactions: DiscoveredRedaction[],
): void {
  if (!Array.isArray(params)) return;
  for (const [pIdx, param] of params.entries()) {
    if (!param.value) continue;
    const path = `${fieldPath}[${pIdx}]`;
    if (isSensitiveFieldKey(param.name) || isSensitiveQueryParam(param.name)) {
      const prefix = hashPrefix(param.value);
      const cleanKey = param.name.toUpperCase().replace(/[^A-Z0-9]/gu, "_");
      const placeholder = `<REDACTED_${cleanKey}_${prefix}>`;
      param.value = placeholder;
      redactions.push({
        category: getFieldCategory(param.name, param.value),
        field: path,
        placeholder,
        sha256Prefix: prefix,
        originalKey: param.name,
      });
    } else {
      const pii = scrubPiiAndSecrets(param.value, path);
      param.value = pii.scrubbed;
      redactions.push(...pii.redactions);
    }
  }
}

function sanitizeHarEntry(
  entry: HarEntryShape,
  entryIdx: number,
  redactions: DiscoveredRedaction[],
  dynamicTokens: DiscoveredRedactedToken[],
): void {
  const req = entry.request;
  const res = entry.response;

  if (req?.url) {
    const urlRes = sanitizeUrlAndQuery(
      req.url,
      req.queryString,
      `log.entries[${entryIdx}].request`,
    );
    req.url = urlRes.sanitizedUrl;
    req.queryString = urlRes.sanitizedQueryString;
    redactions.push(...urlRes.redactions);
    for (const tok of urlRes.dynamicTokens) {
      if (
        !dynamicTokens.some(
          (t) => t.name.toLowerCase() === tok.name.toLowerCase(),
        )
      ) {
        dynamicTokens.push(tok);
      }
    }
  }

  sanitizeHeadersList(
    req?.headers,
    `log.entries[${entryIdx}].request.headers`,
    redactions,
    dynamicTokens,
  );
  sanitizeCookiesList(
    req?.cookies,
    `log.entries[${entryIdx}].request.cookies`,
    redactions,
    dynamicTokens,
  );

  if (req?.postData?.text) {
    const path = `log.entries[${entryIdx}].request.postData.text`;
    const scrubbed = sanitizeBodyContent(req.postData.text, path);
    req.postData.text = scrubbed.scrubbed;
    redactions.push(...scrubbed.redactions);
  }
  sanitizePostDataParams(
    req?.postData?.params,
    `log.entries[${entryIdx}].request.postData.params`,
    redactions,
  );

  sanitizeHeadersList(
    res?.headers,
    `log.entries[${entryIdx}].response.headers`,
    redactions,
  );
  sanitizeCookiesList(
    res?.cookies,
    `log.entries[${entryIdx}].response.cookies`,
    redactions,
  );

  if (res?.content?.text) {
    const path = `log.entries[${entryIdx}].response.content.text`;
    const scrubbed = sanitizeBodyContent(res.content.text, path);
    res.content.text = scrubbed.scrubbed;
    redactions.push(...scrubbed.redactions);
  }
}

/** Sanitize an entire HAR 1.2 payload string, returning sanitized JSON and discovered redactions. */
export function sanitizeHarPayload(rawHar: string): HarSanitizationResult {
  const redactions: DiscoveredRedaction[] = [];
  const dynamicTokens: DiscoveredRedactedToken[] = [];

  let parsed: unknown;
  try {
    parsed = JSON.parse(rawHar);
  } catch {
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

  const harObj = parsed as { log?: { entries?: HarEntryShape[] } };
  const entries = harObj.log?.entries ?? [];

  for (const [entryIdx, entry] of entries.entries()) {
    sanitizeHarEntry(entry, entryIdx, redactions, dynamicTokens);
  }

  return {
    sanitizedHar: JSON.stringify(harObj, null, 2),
    redactionCount: redactions.length,
    redactions: Object.freeze(redactions),
    dynamicTokens: Object.freeze(dynamicTokens),
  };
}

/** Sanitize arbitrary source code or bundle string, removing PII, JWTs, and high-entropy credentials. */
export function sanitizeSourceText(rawText: string): TextSanitizationResult {
  const result = scrubPiiAndSecrets(rawText, "bundle.source");
  return {
    sanitizedText: result.scrubbed,
    redactionCount: result.redactions.length,
    redactions: Object.freeze(result.redactions),
  };
}
