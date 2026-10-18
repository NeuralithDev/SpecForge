import { readFile, readdir } from "node:fs/promises";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";
import { PRODUCT_IDENTITY } from "../../src/identity.js";

const jsonExamples = (content: string): unknown[] =>
  [...content.matchAll(/```json\s*([\s\S]*?)```/gu)].map((match): unknown =>
    JSON.parse(match[1] ?? ""),
  );

const shellExamples = (content: string): string[] =>
  [...content.matchAll(/```bash\s*([\s\S]*?)```/gu)].map((match) =>
    (match[1] ?? "").trim(),
  );

describe("SpecForge documentation consistency", () => {
  it("keeps the SpecForge User Guide valid and accessible", async () => {
    const content = await readFile(resolve("docs/specforge-user-guide.md"), "utf8");
    expect(content).toContain("SpecForge");
    expect(content).toContain("Synthesis");
  });

  it("keeps the SpecForge README examples valid and parseable", async () => {
    const content = await readFile(resolve("README.md"), "utf8");
    const shell = shellExamples(content);
    expect(shell.length).toBeGreaterThan(0);
    expect(shell[0]).toContain("git clone https://github.com/NeuralithDev/SpecForge.git");
    const json = jsonExamples(content);
    expect(json.length).toBeGreaterThan(0);
  });
});
