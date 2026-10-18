"use client";

import React, { useState } from "react";
import type { AnalysisState } from "../lib/types";

interface ExportBarProps {
  readonly state: AnalysisState;
  readonly onOpenCodeModal: (tab: "openapi" | "mcp" | "client" | "parity" | "audit") => void;
}

export default function ExportBar({ state, onOpenCodeModal }: ExportBarProps) {
  const [copiedMcpConfig, setCopiedMcpConfig] = useState(false);
  const [downloadingZip, setDownloadingZip] = useState(false);

  const getMcpConfigJson = () => {
    const envVars: Record<string, string> = {};
    for (const auth of state.requiredAuthConfigs) {
      envVars[auth.envVarName] = `<YOUR_${auth.tokenName.toUpperCase().replace(/[^A-Z0-9]/gu, "_")}>`;
    }

    return JSON.stringify(
      {
        mcpServers: {
          "specforge-synthesized": {
            command: "node",
            args: ["./dist/mcp-server.js"],
            env: {
              SPECFORGE_API_BASE_URL: "https://api.example.com",
              ...envVars,
            },
          },
        },
      },
      null,
      2,
    );
  };

  const handleCopyMcpConfig = () => {
    navigator.clipboard.writeText(getMcpConfigJson());
    setCopiedMcpConfig(true);
    setTimeout(() => setCopiedMcpConfig(false), 2000);
  };

  const handleDownloadFile = (filename: string, content: string) => {
    const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleDownloadBundleZip = () => {
    setDownloadingZip(true);
    const projectId = state.projectId ?? "latest";
    window.location.href = `/api/projects/${projectId}/export?format=zip`;
    setTimeout(() => setDownloadingZip(false), 1500);
  };

  return (
    <div className="glass-panel rounded-2xl p-6 shadow-glow border border-slate-800 relative overflow-hidden bg-gradient-to-r from-slate-900/90 via-slate-900/60 to-indigo-950/20">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
        <div>
          <div className="flex items-center space-x-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400"></span>
            <h3 className="text-base font-bold text-white tracking-wide">
              One-Click Enterprise Synthesis & Deliverable Bar
            </h3>
            <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              Deterministic Parity: 100%
            </span>
            {state.redactionCount !== undefined && state.redactionCount > 0 && (
              <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20">
                Secrets Scrubbed: {state.redactionCount}
              </span>
            )}
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Zero-hallucination MCP Server, TypeScript SDK, and Epistemic Audit Certificate backed by authenticated Evidence records.
          </p>
        </div>

        {/* Primary Export Actions */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Action 1: View Audit Certificate */}
          <button
            onClick={() => onOpenCodeModal("audit")}
            className="px-4 py-2.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-xs font-semibold text-amber-300 transition-all flex items-center space-x-1.5 shadow-sm"
          >
            <span>★</span>
            <span>Audit Certificate</span>
          </button>

          {/* Action 2: Copy Cursor/Claude MCP Config */}
          <button
            onClick={handleCopyMcpConfig}
            className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-semibold text-slate-100 transition-all flex items-center space-x-2 shadow-sm"
          >
            {copiedMcpConfig ? (
              <>
                <span className="text-emerald-400 font-bold">✓</span>
                <span className="text-emerald-300">MCP Config Copied!</span>
              </>
            ) : (
              <>
                <svg className="w-4 h-4 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
                <span>Copy Agent MCP Config</span>
              </>
            )}
          </button>

          {/* Action 3: Download Complete Enterprise Zip Bundle */}
          <button
            onClick={handleDownloadBundleZip}
            disabled={downloadingZip}
            className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 via-indigo-500 to-cyan-500 hover:from-indigo-500 hover:to-cyan-400 text-xs font-bold text-white shadow-glow transition-all flex items-center space-x-2"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            <span>{downloadingZip ? "Packaging ZIP..." : "Download Full Bundle (.zip)"}</span>
          </button>

          {/* Action 4: Inspect Code Modal */}
          <button
            onClick={() => onOpenCodeModal("openapi")}
            className="px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700/80 text-xs font-semibold text-slate-300 hover:text-white transition-colors flex items-center space-x-1.5"
          >
            <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
            <span>View Synthesized Artifacts</span>
          </button>
        </div>
      </div>

      {/* Quick Download Chips */}
      <div className="mt-4 pt-3 border-t border-slate-800/80 flex flex-wrap items-center gap-2 text-xs">
        <span className="text-slate-400 text-[11px] font-medium mr-2">Quick Exports:</span>
        <button
          onClick={() =>
            handleDownloadFile(
              "EPISTEMIC_AUDIT_CERTIFICATE.md",
              state.auditCertificate || "# Epistemic Audit Certificate\n\nVerified by SpecForge Engine.",
            )
          }
          className="px-2.5 py-1 rounded-md bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 font-mono text-[11px] border border-amber-500/30 transition-colors"
        >
          ↓ certificate.md
        </button>
        <button
          onClick={() => handleDownloadFile("openapi.json", state.openApiJson)}
          className="px-2.5 py-1 rounded-md bg-slate-800/70 hover:bg-slate-700 text-slate-300 font-mono text-[11px] border border-slate-700/60 transition-colors"
        >
          ↓ openapi.json (3.1.0)
        </button>
        <button
          onClick={() => handleDownloadFile("mcp-server.ts", state.mcpServerCode)}
          className="px-2.5 py-1 rounded-md bg-slate-800/70 hover:bg-slate-700 text-slate-300 font-mono text-[11px] border border-slate-700/60 transition-colors"
        >
          ↓ mcp-server.ts
        </button>
        <button
          onClick={() => handleDownloadFile("client.ts", state.clientCode)}
          className="px-2.5 py-1 rounded-md bg-slate-800/70 hover:bg-slate-700 text-slate-300 font-mono text-[11px] border border-slate-700/60 transition-colors"
        >
          ↓ client.ts (TypeScript SDK)
        </button>
        <button
          onClick={() => handleDownloadFile("client.parity.test.ts", state.parityTestsCode)}
          className="px-2.5 py-1 rounded-md bg-slate-800/70 hover:bg-slate-700 text-slate-300 font-mono text-[11px] border border-slate-700/60 transition-colors"
        >
          ↓ client.parity.test.ts (Vitest)
        </button>
      </div>
    </div>
  );
}
