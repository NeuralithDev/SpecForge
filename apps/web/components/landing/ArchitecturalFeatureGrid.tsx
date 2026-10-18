"use client";

import React, { useState, useEffect } from "react";
import {
  ShieldCheck,
  Bot,
  Zap,
  ArrowRight,
  AlertTriangle,
  FileCode,
  Check,
  CheckCircle2,
  Terminal,
  Layers,
  Database,
  ExternalLink,
  Play,
  RotateCcw,
} from "lucide-react";

interface ArchitecturalFeatureGridProps {
  onLaunchStudio: () => void;
  onRunLiveDemo: () => void;
}

export default function ArchitecturalFeatureGrid({
  onLaunchStudio,
  onRunLiveDemo,
}: ArchitecturalFeatureGridProps) {
  // Cell 01: Sanitizer Live State
  const [sanitizerPhase, setSanitizerPhase] = useState<"raw" | "filtering" | "clean">("clean");

  // Cell 02: Tool simulation state
  const [mcpSimulated, setMcpSimulated] = useState(false);
  const [simOutput, setSimOutput] = useState<string | null>(null);

  // Cell 03: Drift radar active tab
  const [driftView, setDriftView] = useState<"diff" | "schema">("diff");

  // Cell 04: Chaining extraction click demo
  const [chainedVar, setChainedVar] = useState<string | null>("ch_3N9zK92eZvKYlo2C0e8U1x4q");
  const [chainPulse, setChainPulse] = useState(false);

  // Cell 05: SDK tab
  const [sdkTab, setSdkTab] = useState<"client" | "openapi" | "vitest">("client");

  // Sanitizer auto-loop
  useEffect(() => {
    const timer = setInterval(() => {
      setSanitizerPhase((prev) => {
        if (prev === "raw") return "filtering";
        if (prev === "filtering") return "clean";
        return "raw";
      });
    }, 2600);
    return () => clearInterval(timer);
  }, []);

  const handleSimulateMcp = () => {
    setMcpSimulated(true);
    setSimOutput("Dispatching JSON-RPC 2.0 tool execution...");
    setTimeout(() => {
      setSimOutput(
        JSON.stringify(
          {
            jsonrpc: "2.0",
            result: {
              content: [{ type: "text", text: '{"id":"ch_98x1","status":"succeeded","amount":4999}' }],
              isError: false,
            },
            id: 1,
          },
          null,
          2
        )
      );
    }, 350);
  };

  const handleTriggerChain = (val: string) => {
    setChainedVar(val);
    setChainPulse(true);
    setTimeout(() => setChainPulse(false), 1200);
  };

  return (
    <section id="features" className="bg-[#0B0C0E] text-zinc-100">
      {/* ------------------------------------------------------------------- */}
      {/* 1. SECTION TOP METADATA STRIP */}
      {/* ------------------------------------------------------------------- */}
      <div className="border-b border-[#222328] px-8 py-3 flex justify-between font-mono text-[11px] tracking-[0.2em] text-zinc-400 uppercase select-none">
        <span>01 / DETERMINISTIC SYNTHESIS</span>
        <span>REAL NETWORK EVIDENCE — CAPTURED IN BROWSER</span>
      </div>

      {/* ------------------------------------------------------------------- */}
      {/* 2. EDITORIAL SECTION HEADER */}
      {/* ------------------------------------------------------------------- */}
      <div className="px-8 py-16 flex flex-col lg:flex-row justify-between items-start border-b border-[#222328] gap-6">
        <div className="max-w-2xl">
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-white font-sans leading-[1.12]">
            The precision that mere{" "}
            <span className="font-editorial text-zinc-300 font-normal">prompts</span>{" "}
            cannot buy.
          </h2>
          <p className="text-zinc-400 text-base md:text-lg mt-4 leading-relaxed font-normal">
            LLMs guess API schemas and hallucinate endpoints. Capture the real HTTP traffic yourself — then let SpecForge deterministically compile the contract.
          </p>
        </div>

        <div className="text-left lg:text-right font-mono uppercase self-start">
          <div className="text-[11px] text-zinc-400 tracking-[0.22em] mb-1">SPECFORGE</div>
          <div className="text-2xl font-black tracking-[0.18em] text-zinc-200">Deterministic Synthesis</div>
        </div>
      </div>

      {/* ------------------------------------------------------------------- */}
      {/* 3. THE 6-CELL ARCHITECTURAL FEATURE GRID */}
      {/* ------------------------------------------------------------------- */}
      <div className="grid grid-cols-1 lg:grid-cols-2 border-b border-[#222328]">
        {/* =================================================================== */}
        {/* CELL 01: EDGE HARSANITIZER */}
        {/* =================================================================== */}
        <div className="border-b lg:border-r border-[#222328] flex flex-col">
          <div className="px-6 py-3 border-b border-[#222328] flex justify-between items-center font-mono text-[11px] tracking-[0.2em] text-zinc-400 uppercase">
            <span>EDGE HARSANITIZER</span>
            <span className="text-zinc-500">01</span>
          </div>

          {/* Visual Canvas (h-[320px]) */}
          <div className="h-[320px] bg-[#0E0F13] p-6 flex flex-col justify-center relative overflow-hidden group">
            <div className="w-full max-w-md mx-auto space-y-3 font-mono text-xs">
              <div className="p-3 bg-[#0B0C0E] border border-[#222328] rounded flex items-center justify-between">
                <span className="text-zinc-400 text-[11px]">STREAM</span>
                <span className="text-[11px] text-zinc-500">POST /v1/charges</span>
                <span className="text-[11px] px-1.5 py-0.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  INTERCEPTED
                </span>
              </div>

              {/* Raw vs Scrubbed Animation Box */}
              <div className="p-4 bg-[#111216] border border-[#222328] rounded space-y-2">
                <div className="flex items-center justify-between text-[11px] text-zinc-400">
                  <span>TRANSFORMATION</span>
                  <span className="text-emerald-400 font-semibold">0.4ms</span>
                </div>

                {sanitizerPhase === "raw" && (
                  <div className="p-2.5 bg-rose-500/10 border border-rose-500/20 text-rose-300 rounded text-[11px] animate-in fade-in duration-200">
                    <span className="text-zinc-400">Authorization:</span> Bearer sk_live_51Nx9A8F...
                  </div>
                )}

                {sanitizerPhase === "filtering" && (
                  <div className="p-2.5 bg-amber-500/10 border border-amber-500/20 text-amber-300 rounded text-[11px] animate-in fade-in duration-200">
                    <span className="text-zinc-400">Regex Filter:</span> Scrubbing Stripe live credentials...
                  </div>
                )}

                {sanitizerPhase === "clean" && (
                  <div className="p-2.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 rounded text-[11px] animate-in fade-in duration-200">
                    <span className="text-zinc-400">Authorization:</span> Bearer &#123;&#123;STRIPE_SECRET_KEY&#125;&#125;
                  </div>
                )}

                <div className="p-2.5 bg-[#0B0C0E] border border-[#222328] text-zinc-400 rounded text-[11px] truncate">
                  <span className="text-zinc-400">Cookie:</span> session_token=&lt;SANITIZED_IN_BROWSER&gt;
                </div>
              </div>
            </div>
          </div>

          {/* Bottom Title + Description */}
          <div className="p-8 bg-[#0B0C0E] flex-1 flex flex-col justify-between">
            <div>
              <h3 className="text-xl font-bold text-white mb-2 font-sans">
                Zero-leakage credential scrubbing
              </h3>
              <p className="text-sm text-zinc-400 leading-relaxed font-normal">
                Drop any raw Chrome .har file without fear. Live Bearer tokens, API keys, and session cookies are stripped locally in your browser before a single schema is synthesized.
              </p>
            </div>
          </div>
        </div>

        {/* =================================================================== */}
        {/* CELL 02: CLAUDE & CURSOR MCP */}
        {/* =================================================================== */}
        <div className="border-b border-[#222328] flex flex-col">
          <div className="px-6 py-3 border-b border-[#222328] flex justify-between items-center font-mono text-[11px] tracking-[0.2em] text-zinc-400 uppercase">
            <span>CLAUDE &amp; CURSOR MCP</span>
            <span className="text-zinc-500">02</span>
          </div>

          {/* Visual Canvas (h-[320px]) */}
          <div className="h-[320px] bg-[#0E0F13] p-5 flex flex-col justify-between relative overflow-hidden group font-mono">
            {/* Split IDE Preview */}
            <div className="grid grid-cols-2 gap-3 h-[210px]">
              {/* Left Column: Captured REST Endpoint */}
              <div className="p-3 bg-[#0B0C0E] border border-[#222328] rounded flex flex-col text-[11px]">
                <div className="text-zinc-400 text-[10px] pb-1 border-b border-[#222328] mb-2 uppercase">
                  Captured Packet
                </div>
                <div className="text-amber-400 font-semibold mb-1">POST /v1/charges</div>
                <div className="text-zinc-400 text-[10px] space-y-0.5 overflow-hidden">
                  <div>&#123;</div>
                  <div className="pl-2">&quot;amount&quot;: 4999,</div>
                  <div className="pl-2">&quot;currency&quot;: &quot;usd&quot;</div>
                  <div>&#125;</div>
                </div>
              </div>

              {/* Right Column: Compiled MCP Tool */}
              <div className="p-3 bg-[#111216] border border-[#222328] rounded flex flex-col text-[10px] overflow-hidden">
                <div className="text-violet-400 text-[10px] pb-1 border-b border-[#222328] mb-1.5 uppercase flex items-center justify-between">
                  <span>mcp-server.ts</span>
                  <span className="text-[9px] text-zinc-400">JSON-RPC</span>
                </div>
                <div className="text-zinc-300 leading-tight space-y-0.5 overflow-hidden">
                  <div className="text-zinc-400">server.tool(</div>
                  <div className="pl-2 text-violet-300">&quot;create_charge&quot;,</div>
                  <div className="pl-2 text-zinc-400">z.object(&#123;</div>
                  <div className="pl-4 text-zinc-300">amount: z.number(),</div>
                  <div className="pl-4 text-zinc-300">currency: z.string()</div>
                  <div className="pl-2 text-zinc-400">&#125;)</div>
                  <div className="text-zinc-400">)</div>
                </div>
              </div>
            </div>

            {/* Action Trigger */}
            <div className="flex items-center justify-between pt-2 border-t border-[#222328]">
              <span className="text-[10px] text-zinc-400">
                {mcpSimulated ? "✓ stdio simulation verified (200 OK)" : "Ready for local agent test"}
              </span>
              <button
                type="button"
                onClick={handleSimulateMcp}
                className="px-3 py-1 bg-white text-black hover:bg-zinc-200 text-[10px] font-bold uppercase tracking-wider transition-colors cursor-pointer"
              >
                Simulate Tool Call
              </button>
            </div>
          </div>

          {/* Bottom Title + Description */}
          <div className="p-8 bg-[#0B0C0E] flex-1 flex flex-col justify-between">
            <div>
              <h3 className="text-xl font-bold text-white mb-2 font-sans">
                Network trace to MCP Server in 12s
              </h3>
              <p className="text-sm text-zinc-400 leading-relaxed font-normal">
                Stop writing brittle Playwright scrapers for undocumented portals. Compile any recorded web workflow directly into a JSON-RPC 2.0 Model Context Protocol server.
              </p>
            </div>
          </div>
        </div>

        {/* =================================================================== */}
        {/* CELL 03: SCHEMA DRIFT RADAR */}
        {/* =================================================================== */}
        <div className="border-b lg:border-r border-[#222328] flex flex-col">
          <div className="px-6 py-3 border-b border-[#222328] flex justify-between items-center font-mono text-[11px] tracking-[0.2em] text-zinc-400 uppercase">
            <span>SCHEMA DRIFT RADAR</span>
            <span className="text-zinc-500">03</span>
          </div>

          {/* Visual Canvas (h-[320px]) */}
          <div className="h-[320px] bg-[#0E0F13] p-6 flex flex-col justify-center relative overflow-hidden font-mono text-xs">
            <div className="w-full max-w-md mx-auto p-4 bg-[#0B0C0E] border border-[#222328] rounded space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-[#222328]">
                <span className="text-[11px] text-zinc-400 uppercase tracking-wider">
                  SURGICAL DRIFT DETECTION
                </span>
                <span className="px-2 py-0.5 bg-amber-500/10 border border-amber-500/20 text-amber-400 text-[10px] font-semibold flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" />
                  TYPE MUTATION
                </span>
              </div>

              {/* Visual Diff Table */}
              <div className="space-y-1.5 text-[11px]">
                <div className="p-2 bg-[#111216] border border-[#222328] flex justify-between items-center text-zinc-300">
                  <span className="text-zinc-400">id</span>
                  <span className="text-emerald-400">string (match)</span>
                </div>
                <div className="p-2 bg-amber-500/10 border border-amber-500/30 flex justify-between items-center text-amber-300">
                  <span className="font-semibold">amount_captured</span>
                  <span className="text-xs">number &rarr; string</span>
                </div>
                <div className="p-2 bg-[#111216] border border-[#222328] flex justify-between items-center text-zinc-300">
                  <span className="text-zinc-400">currency</span>
                  <span className="text-emerald-400">string (match)</span>
                </div>
              </div>

              <div className="text-[10px] text-zinc-400 pt-1">
                Baseline: .har trace (recorded) · Current: live proxy response
              </div>
            </div>
          </div>

          {/* Bottom Title + Description */}
          <div className="p-8 bg-[#0B0C0E] flex-1 flex flex-col justify-between">
            <div>
              <h3 className="text-xl font-bold text-white mb-2 font-sans">
                Precise contract drift detection
              </h3>
              <p className="text-sm text-zinc-400 leading-relaxed font-normal">
                Dispatch live requests through the SSRF-guarded proxy and automatically verify every response key against your cryptographic .har baseline.
              </p>
            </div>
          </div>
        </div>

        {/* =================================================================== */}
        {/* CELL 04: VARIABLE CHAINING */}
        {/* =================================================================== */}
        <div className="border-b border-[#222328] flex flex-col">
          <div className="px-6 py-3 border-b border-[#222328] flex justify-between items-center font-mono text-[11px] tracking-[0.2em] text-zinc-400 uppercase">
            <span>VARIABLE CHAINING</span>
            <span className="text-zinc-500">04</span>
          </div>

          {/* Visual Canvas (h-[320px]) */}
          <div className="h-[320px] bg-[#0E0F13] p-6 flex flex-col justify-center relative overflow-hidden font-mono text-xs">
            <div className="w-full max-w-md mx-auto space-y-3">
              {/* Clickable JSON response node */}
              <div className="p-3.5 bg-[#0B0C0E] border border-[#222328] rounded text-[11px] space-y-1">
                <div className="text-zinc-400 text-[10px] pb-1 border-b border-[#222328] flex justify-between">
                  <span>STEP 1: RESPONSE PAYLOAD</span>
                  <span className="text-zinc-400">Click field to chain</span>
                </div>
                <div className="text-zinc-300 pt-1">
                  <span>&quot;id&quot;: </span>
                  <button
                    type="button"
                    onClick={() => handleTriggerChain("ch_3N9zK92eZvKYlo2C0e8U1x4q")}
                    className="text-emerald-400 font-semibold hover:underline cursor-pointer bg-emerald-500/10 px-1 py-0.5 rounded border border-emerald-500/20"
                  >
                    &quot;ch_3N9z...1x4q&quot;
                  </button>
                </div>
                <div className="text-zinc-400">&quot;status&quot;: &quot;succeeded&quot;</div>
              </div>

              {/* Chained destination input */}
              <div
                className={`p-3.5 bg-[#111216] border transition-all duration-300 rounded text-[11px] space-y-1 ${
                  chainPulse
                    ? "border-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.2)]"
                    : "border-[#222328]"
                }`}
              >
                <div className="text-zinc-400 text-[10px] pb-1 border-b border-[#222328]">
                  STEP 2: NEXT REQUEST URL
                </div>
                <div className="text-zinc-200 truncate pt-1">
                  GET /v1/refunds?charge=
                  <span className="text-emerald-400 font-bold bg-emerald-500/10 px-1 py-0.5 rounded">
                    &#123;&#123;LAST_CHARGE_ID&#125;&#125;
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom Title + Description */}
          <div className="p-8 bg-[#0B0C0E] flex-1 flex flex-col justify-between">
            <div>
              <h3 className="text-xl font-bold text-white mb-2 font-sans">
                Script-free variable chaining
              </h3>
              <p className="text-sm text-zinc-400 leading-relaxed font-normal">
                Extract authentication tokens, customer IDs, or cursor pagination state between sequential requests with a single click—no bloated pre-request JavaScript required.
              </p>
            </div>
          </div>
        </div>

        {/* =================================================================== */}
        {/* CELL 05: SDK & VITEST SUITE */}
        {/* =================================================================== */}
        <div className="border-b lg:border-b-0 lg:border-r border-[#222328] flex flex-col">
          <div className="px-6 py-3 border-b border-[#222328] flex justify-between items-center font-mono text-[11px] tracking-[0.2em] text-zinc-400 uppercase">
            <span>SDK &amp; VITEST SUITE</span>
            <span className="text-zinc-500">05</span>
          </div>

          {/* Visual Canvas (h-[320px]) */}
          <div className="h-[320px] bg-[#0E0F13] p-5 flex flex-col justify-between relative overflow-hidden font-mono text-xs">
            {/* Artifact Switcher */}
            <div className="flex items-center justify-between border-b border-[#222328] pb-3">
              <div className="flex items-center gap-1">
                {(["client", "openapi", "vitest"] as const).map((tab) => (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => setSdkTab(tab)}
                    className={`px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider transition-colors ${
                      sdkTab === tab
                        ? "bg-white text-black"
                        : "text-zinc-400 hover:text-zinc-200 bg-[#111216]"
                    }`}
                  >
                    {tab === "client" ? "client.ts" : tab === "openapi" ? "openapi.json" : "contract.test.ts"}
                  </button>
                ))}
              </div>
              <span className="text-[10px] text-zinc-400 flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                SHA-256 SEAL
              </span>
            </div>

            {/* Code view */}
            <div className="p-3 bg-[#0B0C0E] border border-[#222328] rounded flex-1 my-2 overflow-x-auto text-[11px] leading-relaxed text-zinc-300">
              {sdkTab === "client" && (
                <pre>{`export class StripeSDK {
  async createCharge(params: ChargeParams) {
    return this.post("/v1/charges", params);
  }
}`}</pre>
              )}
              {sdkTab === "openapi" && (
                <pre>{`{
  "openapi": "3.1.0",
  "paths": {
    "/v1/charges": { "post": { ... } }
  }
}`}</pre>
              )}
              {sdkTab === "vitest" && (
                <pre>{`test("verify charges parity", async () => {
  const res = await sdk.createCharge({ amount: 4999 });
  expect(res.status).toBe(200);
});`}</pre>
              )}
            </div>

            <div className="text-[10px] text-zinc-400 flex justify-between items-center">
              <span>Cryptographic Provenance: Verified</span>
              <span className="text-zinc-400">100% Deterministic</span>
            </div>
          </div>

          {/* Bottom Title + Description */}
          <div className="p-8 bg-[#0B0C0E] flex-1 flex flex-col justify-between">
            <div>
              <h3 className="text-xl font-bold text-white mb-2 font-sans">
                Production TypeScript SDKs &amp; tests
              </h3>
              <p className="text-sm text-zinc-400 leading-relaxed font-normal">
                Export zero-dependency TypeScript fetch clients, OpenAPI 3.1 specs, and executable Vitest parity suites anchored to real payload evidence.
              </p>
            </div>
          </div>
        </div>

        {/* =================================================================== */}
        {/* CELL 06: LOCAL-FIRST SCRATCHPAD */}
        {/* =================================================================== */}
        <div className="flex flex-col">
          <div className="px-6 py-3 border-b border-[#222328] flex justify-between items-center font-mono text-[11px] tracking-[0.2em] text-zinc-400 uppercase">
            <span>LOCAL-FIRST SCRATCHPAD</span>
            <span className="text-zinc-500">06</span>
          </div>

          {/* Visual Canvas (h-[320px]) */}
          <div className="h-[320px] bg-[#0E0F13] p-6 flex flex-col justify-center items-center relative overflow-hidden group">
            {/* Miniature Preview of SpecForge Studio */}
            <div className="w-full max-w-sm bg-[#0B0C0E] border border-[#222328] rounded p-3 shadow-xl space-y-2 font-mono text-[10px]">
              <div className="flex items-center justify-between pb-2 border-b border-[#222328]">
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-zinc-700" />
                  <div className="w-2 h-2 rounded-full bg-zinc-700" />
                  <div className="w-2 h-2 rounded-full bg-zinc-700" />
                </div>
                <span className="text-zinc-400">IndexedDB: LOCAL_PERSISTED</span>
              </div>
              <div className="grid grid-cols-3 gap-1.5 py-1 text-center">
                <div className="p-1.5 bg-[#111216] border border-[#222328] text-zinc-300">REQUEST</div>
                <div className="p-1.5 bg-[#111216] border border-[#222328] text-zinc-300">MCP CODE</div>
                <div className="p-1.5 bg-[#111216] border border-[#222328] text-zinc-300">TRACES</div>
              </div>
              <div className="p-2 bg-[#111216] border border-[#222328] text-zinc-400 text-center">
                Offline Mode · Zero Cloud Telemetry
              </div>
            </div>

            {/* Overlay Button */}
            <button
              type="button"
              onClick={onLaunchStudio}
              className="mt-4 px-5 py-2.5 bg-white text-black hover:bg-zinc-200 font-mono text-xs font-bold uppercase tracking-wider transition-colors flex items-center gap-2 cursor-pointer shadow-lg"
            >
              <span>Open Interactive Studio &rarr;</span>
            </button>
          </div>

          {/* Bottom Title + Description */}
          <div className="p-8 bg-[#0B0C0E] flex-1 flex flex-col justify-between">
            <div>
              <h3 className="text-xl font-bold text-white mb-2 font-sans">
                100% local ownership. Zero forced cloud.
              </h3>
              <p className="text-sm text-zinc-400 leading-relaxed font-normal">
                Your API collections, environment secrets, and network traces live on your machine first. Test and compile offline forever, or sync across your engineering team on your terms.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
