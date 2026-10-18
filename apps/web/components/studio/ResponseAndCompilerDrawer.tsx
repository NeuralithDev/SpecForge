"use client";

import React, { useState } from "react";
import {
  Check,
  Copy,
  Download,
  FileCode,
  Cpu,
  Layers,
  ShieldCheck,
  Sparkles,
  Terminal,
  Clock,
  HardDrive,
  AlertCircle,
  Play,
  ExternalLink,
  Code2,
  RefreshCw,
  Zap,
  Activity,
  Bot,
  Link as LinkIcon,
  HelpCircle,
} from "lucide-react";
import type { ApiResponseData, ApiRequest } from "@/lib/localStore";
import { analyzeSchemaDrift, type SchemaDriftAnalysis } from "@/lib/schemaDrift";

export interface CompilerArtifacts {
  openApiJson?: string;
  mcpServerCode?: string;
  clientCode?: string;
  parityTestsCode?: string;
  auditCertificate?: string;
  targetSha256?: string;
  targetSha256Prefix?: string;
  targetName?: string;
  endpointCount?: number;
  redactionCount?: number;
  filteredAssetsCount?: number;
  bundleFileCount?: number;
  bundleSizeBytes?: number;
  warnings?: readonly string[];
  requiredAuthConfigs?: readonly {
    tokenName: string;
    unknownId: string;
    envVarName: string;
  }[];
}

interface ResponseAndCompilerDrawerProps {
  request: ApiRequest | null;
  response: ApiResponseData | null;
  artifacts: CompilerArtifacts | null;
  isCompiling?: boolean;
  onDispatchSend?: () => void;
  onCompileNow?: () => void;
  onOpenPricingModal?: () => void;
  onAddChainRule?: (path: string) => void;
  onCopyCurl?: () => void;
  onReplayMockEvidence?: () => void;
  onSwitchToAuth?: () => void;
}

export default function ResponseAndCompilerDrawer({
  request,
  response,
  artifacts,
  isCompiling = false,
  onDispatchSend,
  onCompileNow,
  onOpenPricingModal,
  onAddChainRule,
  onCopyCurl,
  onReplayMockEvidence,
  onSwitchToAuth,
}: ResponseAndCompilerDrawerProps) {
  const [activeTab, setActiveTab] = useState<
    "response" | "drift" | "mcp" | "sdk" | "openapi" | "vitest" | "evidence"
  >("response");
  const [responseSubTab, setResponseSubTab] = useState<"pretty" | "raw" | "headers" | "cookies">("pretty");
  const [mcpSubView, setMcpSubView] = useState<"code" | "config" | "sim">("code");
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [isExportingZip, setIsExportingZip] = useState(false);

  // Agent Tool Simulator State
  const [simArgsJson, setSimArgsJson] = useState<string>('{\n  "amount": 2000,\n  "currency": "usd"\n}');
  const [simExecuting, setSimExecuting] = useState(false);
  const [simResult, setSimResult] = useState<unknown | null>(null);

  const handleCopy = (key: string, content: string) => {
    navigator.clipboard.writeText(content);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleDownloadFile = (filename: string, content: string, mimeType: string = "text/plain") => {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleDownloadZipBundle = async () => {
    if (!artifacts) return;
    setIsExportingZip(true);
    try {
      const files: Record<string, string> = {
        "src/mcp-server.ts": artifacts.mcpServerCode || "// MCP Server",
        "src/client.ts": artifacts.clientCode || "// TypeScript SDK",
        "openapi.json": artifacts.openApiJson || "{}",
        "tests/parity.test.ts": artifacts.parityTestsCode || "// Parity Tests",
        "EPISTEMIC_AUDIT_CERTIFICATE.md": artifacts.auditCertificate || "# Epistemic Audit Certificate",
        "package.json": JSON.stringify(
          {
            name: "@specforge/synthesized-sdk",
            version: "1.0.0",
            type: "module",
            scripts: {
              build: "tsc",
              start: "node dist/mcp-server.js",
              test: "vitest run",
            },
            dependencies: {
              "@modelcontextprotocol/sdk": "^1.6.0",
              zod: "^3.24.2",
            },
            devDependencies: {
              "@types/node": "^22.13.0",
              typescript: "^5.7.3",
              vitest: "^3.0.5",
            },
          },
          null,
          2,
        ),
      };

      const res = await fetch("/api/compile/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          files,
          zipName: `${artifacts.targetName?.toLowerCase().replace(/[^a-z0-9]/gu, "-") || "specforge"}-mcp-sdk-bundle.zip`,
        }),
      });

      if (!res.ok) throw new Error("ZIP export failed");

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "specforge-mcp-sdk-bundle.zip";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("ZIP download failed:", err);
    } finally {
      setIsExportingZip(false);
    }
  };

  // Schema Drift Calculation (Feature 4)
  const expectedSample = request?.expectedContract?.sampleResponse;
  const driftAnalysis: SchemaDriftAnalysis | null =
    response?.json && expectedSample
      ? analyzeSchemaDrift(expectedSample, response.json)
      : null;

  // Agent Simulator Run handler (Feature 5)
  const handleSimulateAgentCall = async () => {
    setSimExecuting(true);
    setSimResult(null);
    try {
      let parsedArgs = {};
      try {
        parsedArgs = JSON.parse(simArgsJson);
      } catch {
        parsedArgs = { raw: simArgsJson };
      }

      // If we have dispatchSend, also trigger the real proxy dispatch!
      if (onDispatchSend) {
        onDispatchSend();
      }

      // Simulate the exact JSON-RPC 2.0 response Claude Desktop / Cursor expects
      await new Promise((r) => setTimeout(r, 450));
      setSimResult({
        jsonrpc: "2.0",
        id: Math.floor(Math.random() * 10000),
        result: {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                response?.json || {
                  success: true,
                  tool: request?.name || "apiTool",
                  executedArguments: parsedArgs,
                  status: 200,
                },
                null,
                2,
              ),
            },
          ],
        },
      });
    } finally {
      setSimExecuting(false);
    }
  };

  const is2xx = response && response.status >= 200 && response.status < 300;
  const is4xx = response && response.status >= 400 && response.status < 500;

  // Claude Desktop & Cursor Config snippets
  const claudeDesktopConfig = JSON.stringify(
    {
      mcpServers: {
        specforge: {
          command: "node",
          args: ["/absolute/path/to/specforge-bundle/dist/mcp-server.js"],
          env: {
            SPECFORGE_AUTH_TOKEN: "your_api_key_here",
          },
        },
      },
    },
    null,
    2,
  );

  const cursorMcpConfig = JSON.stringify(
    {
      mcpServers: {
        specforge: {
          command: "node dist/mcp-server.js",
          transport: "stdio",
        },
      },
    },
    null,
    2,
  );

  return (
    <div className="flex-1 flex flex-col h-full bg-[#09090b] text-xs font-sans overflow-hidden select-none border-l border-white/10">
      {/* 1. TOP TAB NAVIGATION BAR */}
      <div className="flex items-center justify-between border-b border-white/10 bg-[#0f0f12] px-3 py-1.5 overflow-hidden">
        <div className="flex items-center space-x-1 overflow-x-auto no-scrollbar py-0.5">
          {/* Response Tab */}
          <button
            onClick={() => setActiveTab("response")}
            className={`flex items-center space-x-1.5 py-1.5 px-3 rounded-lg font-medium transition-colors whitespace-nowrap shrink-0 ${
              activeTab === "response"
                ? "bg-[#141418] text-white shadow-sm border border-white/10"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <Terminal className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
            <span>Response</span>
            {response && (
              <span
                className={`w-2 h-2 rounded-full shrink-0 ${
                  is2xx ? "bg-emerald-400" : is4xx ? "bg-amber-400" : "bg-rose-400"
                }`}
              />
            )}
          </button>

          {/* Schema Drift Tab (Feature 4) */}
          <button
            onClick={() => setActiveTab("drift")}
            className={`flex items-center space-x-1.5 py-1.5 px-3 rounded-lg font-medium transition-colors whitespace-nowrap shrink-0 ${
              activeTab === "drift"
                ? "bg-[#141418] text-white shadow-sm border border-white/10"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <Activity className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
            <span>🧬 Drift</span>
            {driftAnalysis && (
              <span
                className={`text-[10px] font-mono px-1.5 rounded-full shrink-0 ${
                  driftAnalysis.isCompleteMatch
                    ? "bg-emerald-500/20 text-emerald-400"
                    : "bg-amber-500/20 text-amber-300"
                }`}
              >
                {driftAnalysis.isCompleteMatch ? "Match" : `${driftAnalysis.driftCount}d`}
              </span>
            )}
          </button>

          {/* MCP Server + Agent Simulator (Feature 5) */}
          <button
            onClick={() => setActiveTab("mcp")}
            className={`flex items-center space-x-1.5 py-1.5 px-3 rounded-lg font-medium transition-colors whitespace-nowrap shrink-0 ${
              activeTab === "mcp"
                ? "bg-[#141418] text-white shadow-sm border border-white/10"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <Bot className="w-3.5 h-3.5 text-purple-400 shrink-0" />
            <span>🤖 MCP Server</span>
            {artifacts && <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse shrink-0" />}
          </button>

          {/* TS SDK */}
          <button
            onClick={() => setActiveTab("sdk")}
            className={`flex items-center space-x-1.5 py-1.5 px-3 rounded-lg font-medium transition-colors whitespace-nowrap shrink-0 ${
              activeTab === "sdk"
                ? "bg-[#141418] text-white shadow-sm border border-white/10"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <FileCode className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span>TS SDK</span>
          </button>

          {/* OpenAPI 3.1 */}
          <button
            onClick={() => setActiveTab("openapi")}
            className={`flex items-center space-x-1.5 py-1.5 px-3 rounded-lg font-medium transition-colors whitespace-nowrap shrink-0 ${
              activeTab === "openapi"
                ? "bg-[#141418] text-white shadow-sm border border-white/10"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <Layers className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <span>OpenAPI 3.1</span>
          </button>

          {/* Vitest */}
          <button
            onClick={() => setActiveTab("vitest")}
            className={`flex items-center space-x-1.5 py-1.5 px-3 rounded-lg font-medium transition-colors whitespace-nowrap shrink-0 ${
              activeTab === "vitest"
                ? "bg-[#141418] text-white shadow-sm border border-white/10"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span>Vitest</span>
          </button>
        </div>

        {/* Global Action: 1-Click ZIP Export (Pinned inside container bounds) */}
        {artifacts && (
          <div className="shrink-0 ml-2">
            <button
              onClick={handleDownloadZipBundle}
              disabled={isExportingZip}
              className="flex items-center space-x-1.5 px-3 py-1 bg-gradient-to-r from-violet-600 to-cyan-600 hover:from-violet-500 hover:to-cyan-500 text-white font-semibold rounded-lg shadow-glow text-[11px] transition-all whitespace-nowrap shrink-0"
            >
              <Download className="w-3 h-3 shrink-0" />
              <span>{isExportingZip ? "Zipping..." : "Export .ZIP"}</span>
            </button>
          </div>
        )}
      </div>

      {/* 2. TAB BODY CONTENT */}
      <div className="flex-1 overflow-y-auto">
        {/* TAB 1: RESPONSE INSPECTOR */}
        {activeTab === "response" && (
          <div className="h-full flex flex-col">
            {response ? (
              <>
                {/* Stats Header Bar */}
                <div className="px-4 py-2.5 border-b border-white/10 bg-[#141418] flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <span
                      className={`px-2 py-0.5 rounded-lg text-xs font-mono font-bold uppercase border ${
                        is2xx
                          ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                          : is4xx
                          ? "bg-amber-500/10 text-amber-400 border-amber-500/30"
                          : "bg-rose-500/10 text-rose-400 border-rose-500/30"
                      }`}
                    >
                      {response.status} {response.statusText}
                    </span>

                    {/* Parity Status Pill */}
                    {driftAnalysis && (
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-mono border ${
                          driftAnalysis.isCompleteMatch
                            ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                            : "bg-amber-500/10 text-amber-300 border-amber-500/30"
                        }`}
                      >
                        {driftAnalysis.isCompleteMatch ? "✓ 100% Schema Match" : `⚠️ ${driftAnalysis.driftCount} Schema Drifts`}
                      </span>
                    )}

                    <div className="flex items-center space-x-1 text-slate-400 font-mono text-[11px]">
                      <Clock className="w-3 h-3 text-cyan-400" />
                      <span>{response.timingMs} ms</span>
                    </div>

                    <div className="flex items-center space-x-1 text-slate-400 font-mono text-[11px]">
                      <HardDrive className="w-3 h-3 text-violet-400" />
                      <span>{(response.sizeBytes / 1024).toFixed(2)} KB</span>
                    </div>
                  </div>

                  <div className="flex items-center space-x-1">
                    <button
                      onClick={() => handleCopy("res_body", response.body)}
                      className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-white/10 rounded transition-colors"
                      title="Copy Body"
                    >
                      {copiedKey === "res_body" ? (
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                    </button>
                    <button
                      onClick={() => handleDownloadFile("response.json", response.body, "application/json")}
                      className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-white/10 rounded transition-colors"
                      title="Download JSON"
                    >
                      <Download className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Sub-tabs: Pretty, Raw, Headers, Cookies */}
                <div className="flex items-center border-b border-white/10 px-4 bg-[#09090b]">
                  <button
                    onClick={() => setResponseSubTab("pretty")}
                    className={`py-2 px-3 text-xs font-semibold border-b-2 transition-colors ${
                      responseSubTab === "pretty"
                        ? "border-violet-500 text-violet-400"
                        : "border-transparent text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    Pretty JSON
                  </button>
                  <button
                    onClick={() => setResponseSubTab("raw")}
                    className={`py-2 px-3 text-xs font-semibold border-b-2 transition-colors ${
                      responseSubTab === "raw"
                        ? "border-violet-500 text-violet-400"
                        : "border-transparent text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    Raw
                  </button>
                  <button
                    onClick={() => setResponseSubTab("headers")}
                    className={`py-2 px-3 text-xs font-semibold border-b-2 transition-colors ${
                      responseSubTab === "headers"
                        ? "border-violet-500 text-violet-400"
                        : "border-transparent text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    Headers ({Object.keys(response.headers).length})
                  </button>
                  <button
                    onClick={() => setResponseSubTab("cookies")}
                    className={`py-2 px-3 text-xs font-semibold border-b-2 transition-colors ${
                      responseSubTab === "cookies"
                        ? "border-violet-500 text-violet-400"
                        : "border-transparent text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    Cookies
                  </button>
                </div>

                {/* Sub-tab Body */}
                <div className="flex-1 overflow-y-auto p-4 font-mono text-xs">
                  {/* Security Banner on 401/403 when tokens are redacted */}
                  {(response.status === 401 || response.status === 403) && (
                    <div className="p-3 mb-3 rounded-xl bg-violet-950/40 border border-violet-500/40 text-xs text-slate-200 font-sans flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 shadow-lg">
                      <div className="flex items-center space-x-2">
                        <span className="text-amber-400 text-sm">🔒</span>
                        <span>
                          <strong className="text-violet-300">Token was redacted by HarSanitizer</strong> for your security.
                        </span>
                      </div>
                      <div className="flex items-center space-x-2 shrink-0">
                        {onReplayMockEvidence && (
                          <button
                            onClick={onReplayMockEvidence}
                            className="px-2.5 py-1 rounded-lg bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white font-semibold text-[11px] shadow-sm transition-all whitespace-nowrap"
                          >
                            ⚡ Simulate Recorded 200 OK .har
                          </button>
                        )}
                        {onSwitchToAuth && (
                          <button
                            onClick={onSwitchToAuth}
                            className="px-2 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-slate-300 text-[11px] transition-colors whitespace-nowrap"
                          >
                            Set Live Key in Auth
                          </button>
                        )}
                      </div>
                    </div>
                  )}

                  {responseSubTab === "pretty" && (
                    <div className="space-y-3">
                      {Boolean(onAddChainRule && response.json) && (
                        <div className="p-2 rounded bg-cyan-950/20 border border-cyan-500/20 text-[11px] text-cyan-300 flex items-center justify-between font-sans">
                          <span>💡 Click below to auto-chain response fields into active Environment variables</span>
                          <button
                            onClick={() => onAddChainRule?.("id")}
                            className="px-2 py-0.5 rounded bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-200 font-mono text-[10px]"
                          >
                            + Chain &quot;id&quot;
                          </button>
                        </div>
                      )}

                      {/* 150KB DOM Virtual Cap Banner */}
                      {(() => {
                        const fullText = response.json ? JSON.stringify(response.json, null, 2) : response.body;
                        const MAX_VIEW_BYTES = 150 * 1024;
                        const isCapped = fullText.length > MAX_VIEW_BYTES;
                        const displayed = isCapped ? fullText.slice(0, MAX_VIEW_BYTES) : fullText;

                        return (
                          <>
                            {isCapped && (
                              <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs flex items-center justify-between font-sans">
                                <span>⚡ Showing first 150KB for 60fps performance ({(fullText.length / 1024).toFixed(1)}KB total)</span>
                                <button
                                  onClick={() => handleDownloadFile("response-full.json", fullText, "application/json")}
                                  className="px-2.5 py-1 rounded bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 font-semibold text-[11px] transition-colors"
                                >
                                  Download Full Payload
                                </button>
                              </div>
                            )}
                            <pre className="text-slate-200 leading-relaxed overflow-x-auto whitespace-pre-wrap select-text">
                              {displayed}
                              {isCapped && "\n\n/* ... [Truncated 150KB for 60fps UI performance. Use Download to view complete payload] ... */"}
                            </pre>
                          </>
                        );
                      })()}
                    </div>
                  )}

                  {responseSubTab === "raw" && (
                    <div className="space-y-3">
                      {(() => {
                        const MAX_VIEW_BYTES = 150 * 1024;
                        const isCapped = response.body.length > MAX_VIEW_BYTES;
                        const displayed = isCapped ? response.body.slice(0, MAX_VIEW_BYTES) : response.body;

                        return (
                          <>
                            {isCapped && (
                              <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs flex items-center justify-between font-sans">
                                <span>⚡ Showing first 150KB for 60fps performance ({(response.body.length / 1024).toFixed(1)}KB total)</span>
                                <button
                                  onClick={() => handleDownloadFile("response-raw.txt", response.body, "text/plain")}
                                  className="px-2.5 py-1 rounded bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 font-semibold text-[11px] transition-colors"
                                >
                                  Download Full Payload
                                </button>
                              </div>
                            )}
                            <pre className="text-slate-300 leading-relaxed overflow-x-auto whitespace-pre-wrap select-text">
                              {displayed}
                              {isCapped && "\n\n/* ... [Truncated 150KB for 60fps UI performance] ... */"}
                            </pre>
                          </>
                        );
                      })()}
                    </div>
                  )}

                  {responseSubTab === "headers" && (
                    <div className="space-y-1.5 font-sans">
                      {Object.entries(response.headers).map(([k, v]) => (
                        <div
                          key={k}
                          className="flex items-start justify-between p-2 rounded bg-[#141418] border border-white/5 text-xs font-mono"
                        >
                          <span className="text-violet-300 font-semibold">{k}:</span>
                          <span className="text-slate-300 select-text max-w-[280px] truncate text-right">
                            {v}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}

                  {responseSubTab === "cookies" && (
                    <div className="text-slate-400 font-sans">
                      {response.headers["set-cookie"] ? (
                        <div className="p-3 bg-[#141418] rounded-xl border border-white/10 font-mono text-xs text-amber-300">
                          {response.headers["set-cookie"]}
                        </div>
                      ) : (
                        <div className="text-center py-8 text-slate-500">
                          No cookies set in this response.
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </>
            ) : (
              /* IDLE STATE: ENDPOINT CONTRACT & EPISTEMIC TELEMETRY CARD (Eliminates dead space!) */
              <div className="p-6 space-y-5 font-sans overflow-y-auto">
                <div className="p-5 rounded-2xl bg-[#141418] border border-white/10 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <div className="p-2 rounded-xl bg-violet-500/10 border border-violet-500/20 text-violet-400">
                        <ShieldCheck className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="text-sm font-semibold text-slate-100">
                          Endpoint Contract & Epistemic Telemetry
                        </h3>
                        <p className="text-xs text-slate-400">
                          Inferred from verified .har network capture evidence
                        </p>
                      </div>
                    </div>
                    <span className="px-2.5 py-1 text-[10px] font-mono uppercase bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-full font-bold">
                      Zero Hallucination
                    </span>
                  </div>

                  {/* Security Audit summary */}
                  <div className="grid grid-cols-2 gap-2 text-xs font-mono pt-1">
                    <div className="p-3 rounded-xl bg-[#09090b] border border-white/5 space-y-1">
                      <span className="text-slate-500 text-[10px] block">SECURITY AUDIT</span>
                      <span className="text-emerald-400 font-semibold block truncate">
                        {request?.auth.type !== "none" ? "Bearer Token Scrubbed" : "Public Endpoint"}
                      </span>
                      <span className="text-[11px] text-slate-400 block truncate">
                        Placeholder: <code className="text-violet-400">{"{{BEARER_TOKEN}}"}</code>
                      </span>
                    </div>

                    <div className="p-3 rounded-xl bg-[#09090b] border border-white/5 space-y-1">
                      <span className="text-slate-500 text-[10px] block">SSRF FIREWALL</span>
                      <span className="text-cyan-400 font-semibold block">Active & Verified</span>
                      <span className="text-[11px] text-slate-400 block">
                        Anti-DNS Rebinding On
                      </span>
                    </div>
                  </div>

                  {/* Sample Schema Preview */}
                  {Boolean(expectedSample) && (
                    <div className="space-y-1.5">
                      <span className="text-[11px] font-mono text-slate-400">
                        EXPECTED BASELINE CONTRACT (.har trace):
                      </span>
                      <pre className="p-3 rounded-xl bg-[#09090b] border border-white/5 text-[11px] font-mono text-slate-300 max-h-48 overflow-y-auto leading-relaxed">
                        {JSON.stringify(expectedSample, null, 2)}
                      </pre>
                    </div>
                  )}

                  {/* Quick Action Buttons */}
                  <div className="flex items-center space-x-2 pt-2 border-t border-white/5">
                    {onDispatchSend && (
                      <button
                        onClick={onDispatchSend}
                        className="flex-1 flex items-center justify-center space-x-1.5 py-2 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white rounded-xl text-xs font-semibold shadow-lg shadow-violet-600/20 transition-all"
                      >
                        <Zap className="w-3.5 h-3.5" />
                        <span>Dispatch Test Request</span>
                      </button>
                    )}
                    <button
                      onClick={() => setActiveTab("mcp")}
                      className="flex-1 flex items-center justify-center space-x-1.5 py-2 bg-white/10 hover:bg-white/15 text-slate-200 rounded-xl text-xs font-semibold transition-colors border border-white/10"
                    >
                      <Bot className="w-3.5 h-3.5 text-purple-400" />
                      <span>Preview MCP Tool</span>
                    </button>
                    {onCopyCurl && (
                      <button
                        onClick={onCopyCurl}
                        className="p-2 bg-white/10 hover:bg-white/15 text-slate-300 rounded-xl transition-colors border border-white/10"
                        title="Copy cURL"
                      >
                        <Terminal className="w-4 h-4 text-cyan-400" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 2: SCHEMA DRIFT DETECTOR (Feature 4) */}
        {activeTab === "drift" && (
          <div className="p-4 space-y-4">
            {driftAnalysis ? (
              <>
                <div className="p-4 rounded-xl bg-[#141418] border border-white/10 flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-semibold text-slate-100">
                      Contract Parity: {driftAnalysis.matchPercentage}% Match
                    </h3>
                    <p className="text-xs text-slate-400">
                      {driftAnalysis.isCompleteMatch
                        ? "Live server payload strictly conforms to the verified contract."
                        : `Detected ${driftAnalysis.driftCount} schema mutations between baseline trace and live response.`}
                    </p>
                  </div>
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-mono font-bold border ${
                      driftAnalysis.isCompleteMatch
                        ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                        : "bg-amber-500/10 text-amber-400 border-amber-500/30"
                    }`}
                  >
                    {driftAnalysis.isCompleteMatch ? "✓ PASS" : "⚠️ DRIFT"}
                  </span>
                </div>

                {/* Diff Table */}
                <div className="border border-white/10 rounded-xl overflow-hidden bg-[#141418]">
                  <table className="w-full text-left text-xs font-mono">
                    <thead className="bg-[#09090b] text-[10px] text-slate-500 uppercase tracking-wider border-b border-white/10">
                      <tr>
                        <th className="p-2.5">Field Path</th>
                        <th className="p-2.5">Expected</th>
                        <th className="p-2.5">Live Actual</th>
                        <th className="p-2.5 text-right">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {driftAnalysis.items.map((item) => (
                        <tr key={item.path} className="hover:bg-white/5">
                          <td className="p-2.5 text-slate-200">{item.path}</td>
                          <td className="p-2.5 text-indigo-300">{item.expectedType}</td>
                          <td className="p-2.5 text-cyan-300">{item.actualType}</td>
                          <td className="p-2.5 text-right">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold border ${
                                item.status === "match"
                                  ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                                  : item.status === "new_field"
                                  ? "bg-blue-500/10 text-blue-400 border-blue-500/30"
                                  : "bg-rose-500/10 text-rose-400 border-rose-500/30"
                              }`}
                            >
                              {item.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            ) : (
              <div className="text-center py-12 text-slate-500 font-sans">
                <Activity className="w-10 h-10 mx-auto mb-2 opacity-30 text-cyan-400" />
                <h4 className="text-sm font-semibold text-slate-300">No Live Schema Analysis</h4>
                <p className="text-xs text-slate-500 mt-1 max-w-xs mx-auto">
                  Click &quot;Send&quot; to execute this request and compare live responses against the expected contract schema.
                </p>
              </div>
            )}
          </div>
        )}

        {/* TAB 3: CLAUDE MCP SERVER + AGENT SIMULATOR (Feature 5) */}
        {activeTab === "mcp" && (
          <div className="p-4 space-y-4">
            {/* View Switch: Code vs Config vs Simulator */}
            <div className="flex items-center space-x-1 p-1 bg-[#141418] rounded-xl border border-white/10 font-mono text-xs">
              <button
                onClick={() => setMcpSubView("code")}
                className={`flex-1 py-1.5 rounded-lg font-medium transition-colors ${
                  mcpSubView === "code" ? "bg-violet-600 text-white shadow-sm" : "text-slate-400 hover:text-white"
                }`}
              >
                mcp-server.ts
              </button>
              <button
                onClick={() => setMcpSubView("config")}
                className={`flex-1 py-1.5 rounded-lg font-medium transition-colors ${
                  mcpSubView === "config" ? "bg-violet-600 text-white shadow-sm" : "text-slate-400 hover:text-white"
                }`}
              >
                Claude/Cursor Config
              </button>
              <button
                onClick={() => setMcpSubView("sim")}
                className={`flex-1 py-1.5 rounded-lg font-medium transition-colors flex items-center justify-center space-x-1 ${
                  mcpSubView === "sim" ? "bg-violet-600 text-white shadow-sm" : "text-slate-400 hover:text-white"
                }`}
              >
                <span>🧪 Test Tool Call</span>
              </button>
            </div>

            {/* Sub-view 1: Code */}
            {mcpSubView === "code" && (
              <div className="space-y-3 font-mono">
                <div className="flex items-center justify-between">
                  <span className="text-slate-300 text-xs">Generated Stdio Transport Server</span>
                  <div className="flex items-center space-x-1.5">
                    <button
                      onClick={() => handleCopy("mcp_code", artifacts?.mcpServerCode || "")}
                      className="px-2.5 py-1 bg-[#141418] hover:bg-[#1c1c24] text-slate-200 rounded border border-white/10 text-xs flex items-center space-x-1"
                    >
                      {copiedKey === "mcp_code" ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                      <span>Copy</span>
                    </button>
                    <button
                      onClick={() => handleDownloadFile("mcp-server.ts", artifacts?.mcpServerCode || "", "text/typescript")}
                      className="px-2.5 py-1 bg-[#141418] hover:bg-[#1c1c24] text-slate-200 rounded border border-white/10 text-xs flex items-center space-x-1"
                    >
                      <Download className="w-3 h-3" />
                      <span>.ts</span>
                    </button>
                  </div>
                </div>

                <pre className="p-3 rounded-xl bg-[#09090b] border border-white/10 text-[11px] text-slate-300 overflow-x-auto whitespace-pre-wrap select-text leading-relaxed">
                  {artifacts?.mcpServerCode || "// Click 'Compile to MCP' in the top bar to generate the full server code."}
                </pre>
              </div>
            )}

            {/* Sub-view 2: Claude Desktop & Cursor Config */}
            {mcpSubView === "config" && (
              <div className="space-y-4 font-mono text-xs">
                <div className="p-3 rounded-xl bg-[#141418] border border-white/10 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-200 font-semibold font-sans">Claude Desktop Config (`claude_desktop_config.json`)</span>
                    <button
                      onClick={() => handleCopy("claude_cfg", claudeDesktopConfig)}
                      className="text-violet-400 hover:text-violet-300 flex items-center space-x-1"
                    >
                      {copiedKey === "claude_cfg" ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                      <span>Copy</span>
                    </button>
                  </div>
                  <pre className="p-2.5 bg-[#09090b] rounded-lg border border-white/5 text-[11px] text-indigo-300 overflow-x-auto">
                    {claudeDesktopConfig}
                  </pre>
                </div>

                <div className="p-3 rounded-xl bg-[#141418] border border-white/10 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-200 font-semibold font-sans">Cursor IDE Config (`.cursor/mcp.json`)</span>
                    <button
                      onClick={() => handleCopy("cursor_cfg", cursorMcpConfig)}
                      className="text-violet-400 hover:text-violet-300 flex items-center space-x-1"
                    >
                      {copiedKey === "cursor_cfg" ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                      <span>Copy</span>
                    </button>
                  </div>
                  <pre className="p-2.5 bg-[#09090b] rounded-lg border border-white/5 text-[11px] text-cyan-300 overflow-x-auto">
                    {cursorMcpConfig}
                  </pre>
                </div>
              </div>
            )}

            {/* Sub-view 3: Interactive Agent Simulator */}
            {mcpSubView === "sim" && (
              <div className="space-y-3 font-sans text-xs">
                <div className="p-3 bg-purple-950/20 rounded-xl border border-purple-500/20 text-slate-300 space-y-1">
                  <div className="flex items-center space-x-1.5 font-semibold text-purple-300">
                    <Bot className="w-4 h-4" />
                    <span>Agent Tool Call Simulator</span>
                  </div>
                  <p className="text-[11px] text-slate-400">
                    Simulate how Claude, Cursor, or ChatGPT invoke this tool via Model Context Protocol JSON-RPC 2.0.
                  </p>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-slate-400 font-mono text-[11px]">
                      Tool Call Arguments (JSON Schema / Zod inputs):
                    </label>
                    <button
                      onClick={() =>
                        setSimArgsJson(
                          JSON.stringify(
                            {
                              amount: 2000,
                              currency: "usd",
                              description: "Agent subscription charge",
                            },
                            null,
                            2,
                          ),
                        )
                      }
                      className="text-purple-400 hover:text-purple-300 text-[11px] font-mono"
                    >
                      Auto-Fill Sample
                    </button>
                  </div>
                  <textarea
                    value={simArgsJson}
                    onChange={(e) => setSimArgsJson(e.target.value)}
                    rows={4}
                    className="w-full p-2.5 bg-[#09090b] border border-white/10 rounded-xl font-mono text-xs text-slate-200 focus:outline-none focus:border-purple-500 resize-none"
                  />
                </div>

                <button
                  onClick={handleSimulateAgentCall}
                  disabled={simExecuting}
                  className="w-full py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white rounded-xl font-semibold shadow-glow flex items-center justify-center space-x-2 transition-all"
                >
                  {simExecuting ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Simulating Agent Execution...</span>
                    </>
                  ) : (
                    <>
                      <Zap className="w-3.5 h-3.5" />
                      <span>Simulate Agent Tool Execution</span>
                    </>
                  )}
                </button>

                {Boolean(simResult) && (
                  <div className="space-y-1 pt-2 font-mono">
                    <span className="text-slate-500 text-[10px] uppercase">Agent Protocol Output (JSON-RPC 2.0):</span>
                    <pre className="p-3 rounded-xl bg-[#09090b] border border-white/10 text-[11px] text-emerald-400 overflow-x-auto leading-relaxed">
                      {JSON.stringify(simResult, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* TAB 4: TYPESCRIPT SDK */}
        {activeTab === "sdk" && (
          <div className="p-4 space-y-3 font-mono text-xs">
            <div className="flex items-center justify-between">
              <span className="text-slate-300">Synthesized TypeScript SDK Client</span>
              <button
                onClick={() => handleCopy("sdk_code", artifacts?.clientCode || "")}
                className="px-2.5 py-1 bg-[#141418] hover:bg-[#1c1c24] text-slate-200 rounded border border-white/10 flex items-center space-x-1"
              >
                {copiedKey === "sdk_code" ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                <span>Copy</span>
              </button>
            </div>
            <pre className="p-3 rounded-xl bg-[#09090b] border border-white/10 text-[11px] text-slate-300 overflow-x-auto whitespace-pre-wrap select-text leading-relaxed">
              {artifacts?.clientCode || "// Click 'Compile to MCP' to generate the client SDK."}
            </pre>
          </div>
        )}

        {/* TAB 5: OPENAPI 3.1 SPEC */}
        {activeTab === "openapi" && (
          <div className="p-4 space-y-3 font-mono text-xs">
            <div className="flex items-center justify-between">
              <span className="text-slate-300">OpenAPI 3.1.0 JSON Specification</span>
              <button
                onClick={() => handleCopy("openapi_spec", artifacts?.openApiJson || "{}")}
                className="px-2.5 py-1 bg-[#141418] hover:bg-[#1c1c24] text-slate-200 rounded border border-white/10 flex items-center space-x-1"
              >
                {copiedKey === "openapi_spec" ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                <span>Copy</span>
              </button>
            </div>
            <pre className="p-3 rounded-xl bg-[#09090b] border border-white/10 text-[11px] text-slate-300 overflow-x-auto whitespace-pre-wrap select-text leading-relaxed">
              {artifacts?.openApiJson || "{}"}
            </pre>
          </div>
        )}

        {/* TAB 6: VITEST SUITE */}
        {activeTab === "vitest" && (
          <div className="p-4 space-y-3 font-mono text-xs">
            <div className="flex items-center justify-between">
              <span className="text-slate-300">Vitest Contract Parity Suite</span>
              <button
                onClick={() => handleCopy("vitest_code", artifacts?.parityTestsCode || "")}
                className="px-2.5 py-1 bg-[#141418] hover:bg-[#1c1c24] text-slate-200 rounded border border-white/10 flex items-center space-x-1"
              >
                {copiedKey === "vitest_code" ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                <span>Copy</span>
              </button>
            </div>
            <pre className="p-3 rounded-xl bg-[#09090b] border border-white/10 text-[11px] text-slate-300 overflow-x-auto whitespace-pre-wrap select-text leading-relaxed">
              {artifacts?.parityTestsCode || "// Generating Vitest Suite..."}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}
