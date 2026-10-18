import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

describe("SpecForge Studio v5.0 - Enterprise Aesthetic, Legal Cleanse & Multi-View Architecture", () => {
  const rootDir = resolve(process.cwd());

  describe("Feature 1: Legal Cleanse - Zero Competitor Trademarks", () => {
    it("ensures zero references to Postman across apps/web codebase", () => {
      const filesToCheck = [
        "apps/web/app/layout.tsx",
        "apps/web/app/api/proxy/route.ts",
        "apps/web/lib/localStore.ts",
        "apps/web/components/HeroExperience.tsx",
        "apps/web/components/landing/ArchitecturalNav.tsx",
        "apps/web/components/landing/TelemetryRuler.tsx",
        "apps/web/components/landing/OrbitalHero.tsx",
        "apps/web/components/landing/ArchitecturalFeatureGrid.tsx",
        "apps/web/components/landing/ArchitecturalComparison.tsx",
        "apps/web/components/studio/TopNav.tsx",
      ];

      for (const relPath of filesToCheck) {
        const fullPath = resolve(rootDir, relPath);
        const content = readFileSync(fullPath, "utf-8");
        const lower = content.toLowerCase();
        expect(lower.includes("postman"), `Expected 0 Postman references in ${relPath}`).toBe(false);
      }
    });

    it("verifies User-Agent in proxy route is upgraded to SpecForge-Studio/5.0 without competitor strings", () => {
      const proxyRoutePath = resolve(rootDir, "apps/web/app/api/proxy/route.ts");
      const content = readFileSync(proxyRoutePath, "utf-8");
      expect(content).toContain('User-Agent"] = "SpecForge-Studio/5.0 (+https://specforge.ai)"');
      expect(content.toLowerCase()).not.toContain("postman-alternative");
    });
  });

  describe("Feature 2: Anti-AI-Slop & Linear Aesthetic Verification", () => {
    it("verifies clean section titles in HeroExperience", () => {
      const heroPath = resolve(rootDir, "apps/web/components/HeroExperience.tsx");
      const heroContent = readFileSync(heroPath, "utf-8");
      const compContent = readFileSync(resolve(rootDir, "apps/web/components/landing/ArchitecturalComparison.tsx"), "utf-8");
      const gridContent = readFileSync(resolve(rootDir, "apps/web/components/landing/ArchitecturalFeatureGrid.tsx"), "utf-8");
      const navContent = readFileSync(resolve(rootDir, "apps/web/components/landing/ArchitecturalNav.tsx"), "utf-8");
      const content = `${heroContent}\n${compContent}\n${gridContent}\n${navContent}`;

      // Verify no literal template labels
      expect(content).not.toContain("BENTO GRID");
      expect(content).not.toContain("LIVE ARCHITECTURE PIPELINE");

      // Verify refined headers
      expect(content).toContain("Deterministic Synthesis");
      expect(content).toContain("Built for Deterministic API Engineering");
      expect(content).toContain("Why SpecForge");

      // Verify comparison table compares against Cloud-Locked API Clients
      expect(content).toContain("Cloud-Locked API Clients");
      expect(content).toContain("Manual Browser Scrapers");
    });

    it("verifies no emoji prefixes on primary action buttons or top nav", () => {
      const topNavPath = resolve(rootDir, "apps/web/components/studio/TopNav.tsx");
      const topNavContent = readFileSync(topNavPath, "utf-8");
      expect(topNavContent).not.toMatch(/[✨🚀⚡🤖🧬📦]/u);

      const heroPath = resolve(rootDir, "apps/web/components/HeroExperience.tsx");
      const heroContent = readFileSync(heroPath, "utf-8");
      expect(heroContent).not.toContain("✨ SpecForge v4.0");
    });
  });

  describe("Feature 3: 3-Mode Framer Motion Workspace Architecture", () => {
    it("verifies TopNav defines the 3 dedicated workspace modes", () => {
      const topNavPath = resolve(rootDir, "apps/web/components/studio/TopNav.tsx");
      const content = readFileSync(topNavPath, "utf-8");

      expect(content).toContain('export type WorkspaceMode = "builder" | "mcp" | "trace"');
      expect(content).toContain('"Request Builder"');
      expect(content).toContain('"Code & MCP Studio"');
      expect(content).toContain('"Trace Inspector (.har)"');
      expect(content).toContain('layoutId="activeWorkspaceTab"');
    });

    it("verifies page.tsx renders dedicated views per mode", () => {
      const pagePath = resolve(rootDir, "apps/web/app/page.tsx");
      const content = readFileSync(pagePath, "utf-8");

      expect(content).toContain('workspaceMode === "builder"');
      expect(content).toContain('workspaceMode === "mcp"');
      expect(content).toContain('workspaceMode === "trace"');
      expect(content).toContain("<McpStudioView");
      expect(content).toContain("<TraceInspectorView");
      expect(content).toContain("<ResponsePane");
    });
  });
});
