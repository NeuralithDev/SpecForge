"use client";

import React, { useState } from "react";

interface CodePreviewModalProps {
  readonly isOpen: boolean;
  readonly onClose: () => void;
  readonly openApiJson: string;
  readonly mcpServerCode: string;
  readonly clientCode: string;
  readonly parityTestsCode: string;
  readonly auditCertificate?: string;
  readonly initialTab?: "openapi" | "mcp" | "client" | "parity" | "audit";
}

export default function CodePreviewModal({
  isOpen,
  onClose,
  openApiJson,
  mcpServerCode,
  clientCode,
  parityTestsCode,
  auditCertificate = "",
  initialTab = "openapi",
}: CodePreviewModalProps) {
  const [activeTab, setActiveTab] = useState<"openapi" | "mcp" | "client" | "parity" | "audit">(initialTab);
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const getActiveCode = () => {
    switch (activeTab) {
      case "openapi":
        return openApiJson;
      case "mcp":
        return mcpServerCode;
      case "client":
        return clientCode;
      case "parity":
        return parityTestsCode;
      case "audit":
        return auditCertificate || "# Epistemic Audit Certificate\n\nCertificate generated upon verification.";
    }
  };

  const getFilename = () => {
    switch (activeTab) {
      case "openapi":
        return "openapi.json";
      case "mcp":
        return "mcp-server.ts";
      case "client":
        return "client.ts";
      case "parity":
        return "client.parity.test.ts";
      case "audit":
        return "EPISTEMIC_AUDIT_CERTIFICATE.md";
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(getActiveCode());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const code = getActiveCode();
    const filename = getFilename();
    const blob = new Blob([code], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 sm:p-6 animate-fadeIn">
      <div className="glass-panel w-full max-w-5xl h-[85vh] rounded-2xl border border-slate-700/80 flex flex-col shadow-2xl overflow-hidden">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-800 bg-slate-900/80 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
              </svg>
            </div>
            <div>
              <h3 className="text-sm font-bold text-white flex items-center space-x-2">
                <span>Synthesized Artifact Inspector</span>
                <span className="text-xs font-mono font-normal text-slate-400">
                  [{getFilename()}]
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                Ground-truth generated artifacts backed by authenticated Evidence records.
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <button
              onClick={handleCopy}
              className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-medium text-slate-200 transition-colors flex items-center space-x-1.5"
            >
              {copied ? (
                <>
                  <span className="text-emerald-400 font-bold">✓</span>
                  <span>Copied!</span>
                </>
              ) : (
                <>
                  <svg className="w-3.5 h-3.5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                  <span>Copy Content</span>
                </>
              )}
            </button>

            <button
              onClick={handleDownload}
              className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-xs font-medium text-white transition-colors flex items-center space-x-1.5 shadow-glow"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              <span>Download File</span>
            </button>

            <button
              onClick={onClose}
              className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Tab Selection */}
        <div className="flex bg-slate-950 px-6 py-2 border-b border-slate-800 space-x-2 overflow-x-auto">
          <button
            onClick={() => setActiveTab("audit")}
            className={`px-3 py-1.5 rounded-lg text-xs font-mono font-medium transition-colors flex items-center space-x-1.5 ${
              activeTab === "audit"
                ? "bg-amber-500/20 text-amber-300 border border-amber-500/30 font-semibold"
                : "text-amber-400/80 hover:text-amber-300"
            }`}
          >
            <span>★</span>
            <span>EPISTEMIC_AUDIT_CERTIFICATE.md</span>
          </button>
          <button
            onClick={() => setActiveTab("openapi")}
            className={`px-3 py-1.5 rounded-lg text-xs font-mono font-medium transition-colors ${
              activeTab === "openapi"
                ? "bg-indigo-600/20 text-indigo-300 border border-indigo-500/30"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            openapi.json (3.1.0)
          </button>
          <button
            onClick={() => setActiveTab("mcp")}
            className={`px-3 py-1.5 rounded-lg text-xs font-mono font-medium transition-colors ${
              activeTab === "mcp"
                ? "bg-indigo-600/20 text-indigo-300 border border-indigo-500/30"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            mcp-server.ts (@mcp/sdk)
          </button>
          <button
            onClick={() => setActiveTab("client")}
            className={`px-3 py-1.5 rounded-lg text-xs font-mono font-medium transition-colors ${
              activeTab === "client"
                ? "bg-indigo-600/20 text-indigo-300 border border-indigo-500/30"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            client.ts (TypeScript SDK)
          </button>
          <button
            onClick={() => setActiveTab("parity")}
            className={`px-3 py-1.5 rounded-lg text-xs font-mono font-medium transition-colors ${
              activeTab === "parity"
                ? "bg-indigo-600/20 text-indigo-300 border border-indigo-500/30"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            client.parity.test.ts (Vitest)
          </button>
        </div>

        {/* Code Content View */}
        <div className="flex-1 bg-slate-950 p-6 overflow-auto font-mono text-xs text-slate-200 leading-relaxed">
          <pre className="whitespace-pre">
            <code>{getActiveCode()}</code>
          </pre>
        </div>
      </div>
    </div>
  );
}
