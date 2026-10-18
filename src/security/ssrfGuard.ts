import dns from "node:dns/promises";
import net from "node:net";

/** Error thrown when a target URL fails SSRF security firewall checks. */
export class SsrfBlockedError extends Error {
  readonly code = "SSRF_BLOCKED";
  constructor(
    message: string,
    readonly blockedHost: string,
    readonly blockedIp?: string,
  ) {
    super(message);
    this.name = "SsrfBlockedError";
  }
}

/** Check if an IPv4 address string falls within private, loopback, link-local, or cloud metadata ranges. */
export function isPrivateOrReservedIpv4(ip: string): boolean {
  const parts = ip.split(".").map(Number);
  if (parts.length !== 4 || parts.some((p) => isNaN(p) || p < 0 || p > 255)) {
    return true; // Malformed IPv4 is treated as unsafe
  }

  const [b0, b1] = parts;
  if (b0 === undefined || b1 === undefined) return true;

  // 127.0.0.0/8 (Loopback)
  if (b0 === 127) return true;

  // 0.0.0.0/8 (Current network)
  if (b0 === 0) return true;

  // 10.0.0.0/8 (RFC-1918 Private)
  if (b0 === 10) return true;

  // 172.16.0.0/12 (RFC-1918 Private: 172.16.0.0 – 172.31.255.255)
  if (b0 === 172 && b1 >= 16 && b1 <= 31) return true;

  // 192.168.0.0/16 (RFC-1918 Private)
  if (b0 === 192 && b1 === 168) return true;

  // 169.254.0.0/16 (Link-local & Cloud Metadata: 169.254.169.254)
  if (b0 === 169 && b1 === 254) return true;

  // 100.64.0.0/10 (Carrier-Grade NAT RFC-6598: 100.64.0.0 - 100.127.255.255)
  if (b0 === 100 && b1 >= 64 && b1 <= 127) return true;

  // 224.0.0.0/4 (Multicast: 224.0.0.0 - 239.255.255.255)
  if (b0 >= 224 && b0 <= 239) return true;

  // 240.0.0.0/4 (Reserved / Future Use)
  if (b0 >= 240) return true;

  return false;
}

/** Check if an IPv6 address string falls within private, loopback, or link-local ranges. */
export function isPrivateOrReservedIpv6(ip: string): boolean {
  const normalized = ip.toLowerCase();

  // ::1 (Loopback)
  if (normalized === "::1" || normalized === "0:0:0:0:0:0:0:1") return true;

  // :: (Unspecified)
  if (normalized === "::" || normalized === "0:0:0:0:0:0:0:0") return true;

  // fe80::/10 (Link-Local)
  if (normalized.startsWith("fe80:") || /^fe[89ab][0-9a-f]:/u.test(normalized)) return true;

  // fc00::/7 (Unique Local Address: fc00::/8 and fd00::/8)
  if (normalized.startsWith("fc") || normalized.startsWith("fd")) return true;

  // IPv4-mapped IPv6 address (::ffff:192.0.2.128 or ::ffff:c000:0280)
  if (normalized.startsWith("::ffff:") || normalized.includes(":ffff:")) {
    const lastPart = normalized.substring(normalized.lastIndexOf(":") + 1);
    if (net.isIPv4(lastPart)) {
      return isPrivateOrReservedIpv4(lastPart);
    }
  }

  return false;
}

/** Check if an IP address (v4 or v6) is private or reserved. */
export function isPrivateOrReservedIp(ip: string): boolean {
  const version = net.isIP(ip);
  if (version === 4) return isPrivateOrReservedIpv4(ip);
  if (version === 6) return isPrivateOrReservedIpv6(ip);
  return true; // Unknown or invalid IP is treated as unsafe
}

/** Blocked hostname patterns for non-routable or internal destinations. */
const BLOCKED_HOST_SUFFIXES = [
  ".localhost",
  ".local",
  ".internal",
  ".arpa",
  ".home",
  ".corp",
  ".lan",
];

/**
 * Validates that a target URL is safe to fetch over the public Internet.
 * Prevents Server-Side Request Forgery (SSRF) and DNS rebinding attacks against internal services.
 */
export async function validateTargetUrlSafety(rawUrl: string): Promise<URL> {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch (err) {
    throw new SsrfBlockedError(`Invalid URL string: '${rawUrl}'`, rawUrl);
  }

  // 1. Enforce HTTP/HTTPS schemes only
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new SsrfBlockedError(
      `Forbidden URL scheme '${url.protocol}'. Only http: and https: are permitted.`,
      url.hostname,
    );
  }

  const hostname = url.hostname.toLowerCase();

  // 2. Block empty or localhost hostnames
  if (!hostname || hostname === "localhost") {
    throw new SsrfBlockedError(
      `Loopback destination '${hostname}' is blocked by SSRF firewall.`,
      hostname,
    );
  }

  // 3. Block private domain suffixes
  for (const suffix of BLOCKED_HOST_SUFFIXES) {
    if (hostname.endsWith(suffix)) {
      throw new SsrfBlockedError(
        `Internal network domain '${hostname}' is blocked by SSRF firewall.`,
        hostname,
      );
    }
  }

  // 4. If hostname is an IP literal, validate immediately
  const ipVersion = net.isIP(hostname);
  if (ipVersion !== 0) {
    if (isPrivateOrReservedIp(hostname)) {
      throw new SsrfBlockedError(
        `Direct access to private or reserved IP address '${hostname}' is blocked by SSRF firewall.`,
        hostname,
        hostname,
      );
    }
    return url;
  }

  // 5. Resolve DNS records to verify every candidate IP (anti-DNS rebinding)
  let resolvedIps: Array<{ address: string; family: number }> = [];
  try {
    resolvedIps = await dns.lookup(hostname, { all: true });
  } catch (lookupErr: unknown) {
    const msg = lookupErr instanceof Error ? lookupErr.message : String(lookupErr);
    throw new SsrfBlockedError(
      `DNS lookup failed for target host '${hostname}': ${msg}`,
      hostname,
    );
  }

  if (resolvedIps.length === 0) {
    throw new SsrfBlockedError(
      `No IP addresses resolved for target host '${hostname}'.`,
      hostname,
    );
  }

  for (const entry of resolvedIps) {
    if (isPrivateOrReservedIp(entry.address)) {
      throw new SsrfBlockedError(
        `Target host '${hostname}' resolved to private or link-local IP '${entry.address}' (SSRF firewall violation).`,
        hostname,
        entry.address,
      );
    }
  }

  return url;
}
