import { NextRequest, NextResponse } from "next/server";
import { validateTargetUrlSafety, SsrfBlockedError } from "@rea/security/ssrfGuard";

export const dynamic = "force-dynamic";

/** Forbidden request headers in Node/standard fetch */
const FORBIDDEN_REQUEST_HEADERS = new Set(["content-length", "host", "connection"]);

/** Max upstream payload cap: 5MB */
const MAX_UPSTREAM_BYTES = 5 * 1024 * 1024;

/** Strict maximum timeout: 8,000ms */
const MAX_TIMEOUT_MS = 8000;

/**
 * In-memory sliding-window rate limiter:
 * 60 requests per minute per IP address.
 */
interface RateLimitBucket {
  timestamps: number[];
}
const rateLimitMap = new Map<string, RateLimitBucket>();

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const windowMs = 60 * 1000;
  const maxRequests = 60;

  let bucket = rateLimitMap.get(ip);
  if (!bucket) {
    bucket = { timestamps: [] };
    rateLimitMap.set(ip, bucket);
  }

  // Filter timestamps within the current sliding window
  bucket.timestamps = bucket.timestamps.filter((ts) => now - ts < windowMs);

  if (bucket.timestamps.length >= maxRequests) {
    return false; // Rate limit exceeded
  }

  bucket.timestamps.push(now);

  // Periodically clean up stale buckets (if map grows > 10,000 IPs)
  if (rateLimitMap.size > 10000) {
    for (const [key, b] of rateLimitMap.entries()) {
      if (b.timestamps.length === 0 || now - b.timestamps[b.timestamps.length - 1]! > windowMs) {
        rateLimitMap.delete(key);
      }
    }
  }

  return true;
}

export async function POST(request: NextRequest) {
  const startTime = performance.now();

  // 1. Sliding-Window Rate Limiting (60 requests/minute per IP)
  const clientIp =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "127.0.0.1";

  if (!checkRateLimit(clientIp)) {
    return NextResponse.json(
      {
        error: "Too Many Requests: Rate limit exceeded (60 requests/minute per IP).",
        code: "RATE_LIMITED",
        timingMs: 0,
      },
      {
        status: 429,
        headers: {
          "Retry-After": "60",
          "X-RateLimit-Limit": "60",
          "X-RateLimit-Remaining": "0",
        },
      },
    );
  }

  try {
    const payload = (await request.json()) as {
      method?: string;
      url?: string;
      headers?: Record<string, string>;
      body?: string | null;
      timeoutMs?: number;
      allowLocal?: boolean;
    };

    const rawUrl = payload.url?.trim();
    if (!rawUrl) {
      return NextResponse.json({ error: "Missing required 'url' parameter" }, { status: 400 });
    }

    const method = (payload.method ?? "GET").toUpperCase();
    // Enforce strict 8,000ms maximum timeout cap
    const timeoutMs = Math.min(payload.timeoutMs ?? MAX_TIMEOUT_MS, MAX_TIMEOUT_MS);

    // 2. SSRF Firewall Check
    let targetUrl: URL;
    try {
      targetUrl = new URL(rawUrl);
    } catch {
      return NextResponse.json({ error: `Invalid URL format: '${rawUrl}'` }, { status: 400 });
    }

    const isLocalhost =
      targetUrl.hostname === "localhost" ||
      targetUrl.hostname === "127.0.0.1" ||
      targetUrl.hostname === "::1";

    if (isLocalhost && (payload.allowLocal || process.env.NODE_ENV !== "production")) {
      // In local offline scratchpad mode, permit local development endpoints
      if (targetUrl.protocol !== "http:" && targetUrl.protocol !== "https:") {
        return NextResponse.json(
          { error: `Forbidden scheme '${targetUrl.protocol}'. Only http: and https: are supported.` },
          { status: 400 },
        );
      }
    } else {
      // Enforce strict production ssrfGuard against DNS rebinding and internal subnets
      try {
        await validateTargetUrlSafety(rawUrl);
      } catch (err: unknown) {
        if (err instanceof SsrfBlockedError) {
          return NextResponse.json(
            {
              error: err.message,
              code: "SSRF_BLOCKED",
              blockedHost: err.blockedHost,
              blockedIp: err.blockedIp,
            },
            { status: 403 },
          );
        }
        throw err;
      }
    }

    // 3. Prepare Headers
    const sanitizedHeaders: Record<string, string> = {};
    if (payload.headers && typeof payload.headers === "object") {
      for (const [key, value] of Object.entries(payload.headers)) {
        if (!FORBIDDEN_REQUEST_HEADERS.has(key.toLowerCase()) && typeof value === "string") {
          sanitizedHeaders[key] = value;
        }
      }
    }

    // Default User-Agent if not provided
    if (!sanitizedHeaders["user-agent"] && !sanitizedHeaders["User-Agent"]) {
      sanitizedHeaders["User-Agent"] = "SpecForge-Studio/5.0 (+https://specforge.ai)";
    }

    // 4. Prepare Fetch Init with AbortSignal
    const fetchInit: RequestInit = {
      method,
      headers: sanitizedHeaders,
      signal: AbortSignal.timeout(timeoutMs),
      redirect: "follow",
    };

    if (method !== "GET" && method !== "HEAD" && payload.body !== undefined && payload.body !== null) {
      fetchInit.body = typeof payload.body === "string" ? payload.body : JSON.stringify(payload.body);
    }

    // 5. Execute HTTP Dispatch
    const response = await fetch(rawUrl, fetchInit);
    const timingMs = Math.round(performance.now() - startTime);

    // Read response headers
    const responseHeaders: Record<string, string> = {};
    response.headers.forEach((value, key) => {
      responseHeaders[key] = value;
    });

    // 6. Safe Stream Reading with 5MB Max Body Cap (Prevents Server OOM)
    let bodyText = "";
    let sizeBytes = 0;
    let isTruncated = false;

    if (response.body) {
      const reader = response.body.getReader();
      const chunks: Uint8Array[] = [];
      let totalBytes = 0;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        if (value) {
          totalBytes += value.byteLength;
          if (totalBytes > MAX_UPSTREAM_BYTES) {
            const allowed = value.subarray(0, value.byteLength - (totalBytes - MAX_UPSTREAM_BYTES));
            chunks.push(allowed);
            isTruncated = true;
            try {
              await reader.cancel("Response body exceeded 5MB max payload cap");
            } catch {
              // Ignored
            }
            break;
          } else {
            chunks.push(value);
          }
        }
      }

      // Merge chunks into single ArrayBuffer
      const combined = new Uint8Array(Math.min(totalBytes, MAX_UPSTREAM_BYTES));
      let offset = 0;
      for (const chunk of chunks) {
        combined.set(chunk, offset);
        offset += chunk.byteLength;
      }

      sizeBytes = totalBytes;
      bodyText = new TextDecoder().decode(combined);

      if (isTruncated) {
        bodyText += `\n\n/* [SpecForge Guard: Upstream payload truncated at 5MB limit to prevent server memory exhaustion] */`;
      }
    }

    let parsedJson: unknown = null;
    if (!isTruncated) {
      try {
        parsedJson = JSON.parse(bodyText);
      } catch {
        parsedJson = null;
      }
    }

    return NextResponse.json({
      status: response.status,
      statusText: response.statusText || (response.ok ? "OK" : "Error"),
      headers: responseHeaders,
      body: bodyText,
      json: parsedJson,
      timingMs,
      sizeBytes,
      isTruncated,
      timestamp: new Date().toISOString(),
    });
  } catch (err: unknown) {
    const timingMs = Math.round(performance.now() - startTime);
    const message = err instanceof Error ? err.message : String(err);
    const isTimeout = message.toLowerCase().includes("timeout") || message.toLowerCase().includes("abort");

    return NextResponse.json(
      {
        status: isTimeout ? 504 : 502,
        statusText: isTimeout ? "Gateway Timeout" : "Bad Gateway",
        headers: {},
        body: JSON.stringify({ error: message, timingMs }),
        error: message,
        timingMs,
        sizeBytes: 0,
        timestamp: new Date().toISOString(),
      },
      { status: 200 }, // Return 200 with error payload so the Studio UI displays the status badge cleanly
    );
  }
}
