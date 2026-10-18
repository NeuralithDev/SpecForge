import { describe, expect, it } from "vitest";
import {
  validateTargetUrlSafety,
  isPrivateOrReservedIp,
  isPrivateOrReservedIpv4,
  isPrivateOrReservedIpv6,
  SsrfBlockedError,
} from "./ssrfGuard.js";

describe("SSRF Firewall & Safe URL Guardrails", () => {
  it("rejects non-HTTP protocols", async () => {
    await expect(validateTargetUrlSafety("file:///etc/passwd")).rejects.toThrow(
      SsrfBlockedError,
    );
    await expect(validateTargetUrlSafety("ftp://ftp.example.com/data")).rejects.toThrow(
      SsrfBlockedError,
    );
    await expect(validateTargetUrlSafety("javascript:alert(1)")).rejects.toThrow(
      SsrfBlockedError,
    );
    await expect(validateTargetUrlSafety("data:text/plain;base64,SGVsbG8=")).rejects.toThrow(
      SsrfBlockedError,
    );
  });

  it("blocks localhost and loopback IP addresses", async () => {
    await expect(validateTargetUrlSafety("http://localhost:8080/api")).rejects.toThrow(
      SsrfBlockedError,
    );
    await expect(validateTargetUrlSafety("http://127.0.0.1/api")).rejects.toThrow(
      SsrfBlockedError,
    );
    await expect(validateTargetUrlSafety("http://127.0.0.254/status")).rejects.toThrow(
      SsrfBlockedError,
    );
    await expect(validateTargetUrlSafety("http://[::1]/debug")).rejects.toThrow(
      SsrfBlockedError,
    );
  });

  it("blocks AWS/GCP/Azure link-local cloud metadata endpoints", async () => {
    await expect(
      validateTargetUrlSafety("http://169.254.169.254/latest/meta-data/"),
    ).rejects.toThrow(SsrfBlockedError);
    await expect(validateTargetUrlSafety("http://169.254.1.1/")).rejects.toThrow(
      SsrfBlockedError,
    );
  });

  it("blocks private RFC-1918 enterprise subnets", async () => {
    // 10.0.0.0/8
    await expect(validateTargetUrlSafety("http://10.0.1.5/admin")).rejects.toThrow(
      SsrfBlockedError,
    );
    // 172.16.0.0/12
    await expect(validateTargetUrlSafety("http://172.16.0.1/status")).rejects.toThrow(
      SsrfBlockedError,
    );
    await expect(validateTargetUrlSafety("http://172.31.255.255/")).rejects.toThrow(
      SsrfBlockedError,
    );
    // 192.168.0.0/16
    await expect(validateTargetUrlSafety("http://192.168.1.1/router")).rejects.toThrow(
      SsrfBlockedError,
    );
    await expect(validateTargetUrlSafety("http://192.168.100.50/")).rejects.toThrow(
      SsrfBlockedError,
    );
  });

  it("blocks Carrier-Grade NAT (100.64.0.0/10)", async () => {
    await expect(validateTargetUrlSafety("http://100.64.0.1/service")).rejects.toThrow(
      SsrfBlockedError,
    );
    await expect(validateTargetUrlSafety("http://100.127.255.254/")).rejects.toThrow(
      SsrfBlockedError,
    );
  });

  it("blocks internal non-routable domain suffixes", async () => {
    await expect(validateTargetUrlSafety("http://payment.cluster.local/")).rejects.toThrow(
      SsrfBlockedError,
    );
    await expect(validateTargetUrlSafety("http://db.corp.internal/v1")).rejects.toThrow(
      SsrfBlockedError,
    );
  });

  it("correctly identifies private and reserved IPs via helpers", () => {
    expect(isPrivateOrReservedIpv4("127.0.0.1")).toBe(true);
    expect(isPrivateOrReservedIpv4("10.10.10.10")).toBe(true);
    expect(isPrivateOrReservedIpv4("172.20.1.1")).toBe(true);
    expect(isPrivateOrReservedIpv4("192.168.0.1")).toBe(true);
    expect(isPrivateOrReservedIpv4("169.254.169.254")).toBe(true);
    expect(isPrivateOrReservedIpv4("100.64.1.1")).toBe(true);

    // Public IPs must not be classified as private
    expect(isPrivateOrReservedIpv4("8.8.8.8")).toBe(false);
    expect(isPrivateOrReservedIpv4("1.1.1.1")).toBe(false);
    expect(isPrivateOrReservedIpv4("93.184.216.34")).toBe(false);

    expect(isPrivateOrReservedIpv6("::1")).toBe(true);
    expect(isPrivateOrReservedIpv6("fe80::1ff:fe23:4567")).toBe(true);
    expect(isPrivateOrReservedIpv6("fc00::1")).toBe(true);
    expect(isPrivateOrReservedIp("8.8.8.8")).toBe(false);
  });
});
