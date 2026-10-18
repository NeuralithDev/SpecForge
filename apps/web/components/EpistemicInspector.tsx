"use client";

import React, { useState } from "react";
import type { DiscoveredEndpoint, ResidualUnknownView, EvidenceRecordView } from "../lib/types";

interface EpistemicInspectorProps {
  readonly endpoints: readonly DiscoveredEndpoint[];
  readonly unknowns: readonly ResidualUnknownView[];
  readonly evidenceRecords: readonly EvidenceRecordView[];
  readonly coverageScore: number;
  readonly closureStatus: "ready" | "partial" | "failed";
  readonly filteredAssetsCount?: number;
}

export default function EpistemicInspector({
  endpoints,
  unknowns,
  evidenceRecords,
  coverageScore,
  closureStatus,
  filteredAssetsCount,
}: EpistemicInspectorProps) {
  const [selectedEndpoint, setSelectedEndpoint] = useState<DiscoveredEndpoint | null>(
    endpoints[0] ?? null,
  );
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const methodBadgeColor = (method: string) => {
    switch (method.toUpperCase()) {
      case "GET":
        return "bg-emerald-500/10 text-emerald-400 border-emerald-500/20";
      case "POST":
        return "bg-indigo-500/10 text-indigo-400 border-indigo-500/20";
      case "PUT":
        return "bg-amber-500/10 text-amber-400 border-amber-500/20";
      case "DELETE":
        return "bg-rose-500/10 text-rose-400 border-rose-500/20";
      default:
        return "bg-cyan-500/10 text-cyan-400 border-cyan-500/20";
    }
  };

  const statusBadgeColor = (status?: number) => {
    if (!status) return "bg-slate-800 text-slate-300";
    if (status >= 200 && status < 300)
      return "bg-emerald-500/15 text-emerald-400 border border-emerald-500/25";
    if (status >= 400 && status < 500)
      return "bg-amber-500/15 text-amber-400 border border-amber-500/25";
    return "bg-rose-500/15 text-rose-400 border border-rose-500/25";
  };

  return (
    <div className="space-y-6">
      {/* 4 Stat Overview Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Discovered Endpoints */}
        <div className="glass-panel rounded-xl p-5 border border-slate-800 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">
              Discovered Endpoints
            </span>
            <span className="w-2 h-2 rounded-full bg-indigo-400"></span>
          </div>
          <div className="mt-2 flex items-baseline space-x-2">
            <span className="text-3xl font-black text-white font-mono">
              {endpoints.length}
            </span>
            <span className="text-xs text-slate-400 font-medium">Verified Routes</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-2">
            {filteredAssetsCount !== undefined && filteredAssetsCount > 0 ? (
              <span className="text-emerald-400/90 font-medium">
                Filtered {filteredAssetsCount} static & tracker assets
              </span>
            ) : (
              "Extracted from network flow & AST"
            )}
          </p>
        </div>

        {/* Card 2: Evidence Records */}
        <div className="glass-panel rounded-xl p-5 border border-slate-800 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">
              Evidence Ledger Records
            </span>
            <span className="w-2 h-2 rounded-full bg-cyan-400"></span>
          </div>
          <div className="mt-2 flex items-baseline space-x-2">
            <span className="text-3xl font-black text-white font-mono">
              {evidenceRecords.length}
            </span>
            <span className="text-xs text-cyan-400 font-mono">SHA-256 Anchored</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-2">
            100% Observed / Derived Provenance
          </p>
        </div>

        {/* Card 3: Residual Unknowns */}
        <div className="glass-panel rounded-xl p-5 border border-slate-800 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">
              Residual Unknowns
            </span>
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse"></span>
          </div>
          <div className="mt-2 flex items-baseline space-x-2">
            <span className="text-3xl font-black text-amber-400 font-mono">
              {unknowns.length}
            </span>
            <span className="text-xs text-amber-300 font-medium">Dynamic Tokens</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-2">
            Flagged for operator env var injection
          </p>
        </div>

        {/* Card 4: Obligation Score */}
        <div className="glass-panel rounded-xl p-5 border border-slate-800 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">
              Obligation Matrix Score
            </span>
            <span
              className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full border ${
                closureStatus === "ready"
                  ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/25"
                  : "bg-amber-500/10 text-amber-400 border-amber-500/25"
              }`}
            >
              {closureStatus}
            </span>
          </div>
          <div className="mt-2 flex items-baseline space-x-2">
            <span className="text-3xl font-black text-emerald-400 font-mono">
              {coverageScore.toFixed(1)}%
            </span>
            <span className="text-xs text-slate-400 font-medium">Closure Index</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-2">
            Mathematical parity verification
          </p>
        </div>
      </div>

      {/* Main Epistemic Inspector: Discovered API Endpoints Table */}
      <div className="glass-panel rounded-2xl border border-slate-800 overflow-hidden shadow-glow">
        <div className="px-6 py-4 border-b border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-900/50">
          <div>
            <h3 className="text-base font-bold text-white flex items-center space-x-2">
              <span>Epistemic Inspector: Discovered Endpoints</span>
              <span className="text-xs font-mono font-normal text-slate-400">
                ({endpoints.length} verified)
              </span>
            </h3>
            <p className="text-xs text-slate-400">
              Select an endpoint to inspect its HTTP parameters, response contract, and evidence link.
            </p>
          </div>

          <div className="flex items-center space-x-2 text-xs">
            <span className="text-slate-400">Confidence:</span>
            <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 font-mono font-medium border border-emerald-500/20">
              observed (empirical)
            </span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/80 text-slate-400 uppercase font-mono text-[10px] tracking-wider border-b border-slate-800">
              <tr>
                <th className="px-6 py-3">Method</th>
                <th className="px-6 py-3">API Route Path</th>
                <th className="px-6 py-3">Status</th>
                <th className="px-6 py-3">Parameters</th>
                <th className="px-6 py-3">Dynamic Tokens</th>
                <th className="px-6 py-3">Evidence ID</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50">
              {endpoints.map((ep, idx) => {
                const isSelected = selectedEndpoint?.path === ep.path && selectedEndpoint?.method === ep.method;
                return (
                  <tr
                    key={`${ep.method}-${ep.path}-${idx}`}
                    onClick={() => setSelectedEndpoint(ep)}
                    className={`cursor-pointer transition-colors ${
                      isSelected
                        ? "bg-indigo-600/10 hover:bg-indigo-600/15"
                        : "hover:bg-slate-900/40"
                    }`}
                  >
                    <td className="px-6 py-3.5 whitespace-nowrap">
                      <span
                        className={`font-mono font-bold px-2.5 py-1 rounded-md text-[11px] border ${methodBadgeColor(
                          ep.method,
                        )}`}
                      >
                        {ep.method}
                      </span>
                    </td>
                    <td className="px-6 py-3.5 font-mono text-slate-200 font-medium">
                      {ep.path}
                    </td>
                    <td className="px-6 py-3.5 whitespace-nowrap">
                      <span className={`px-2 py-0.5 rounded text-[11px] font-mono font-semibold ${statusBadgeColor(ep.status)}`}>
                        {ep.status ?? 200}
                      </span>
                    </td>
                    <td className="px-6 py-3.5 text-slate-400">
                      {ep.parameters.length > 0 ? (
                        <span className="font-mono text-indigo-300">
                          {ep.parameters.length} parameter{ep.parameters.length > 1 ? "s" : ""}
                        </span>
                      ) : (
                        <span className="text-slate-400">None</span>
                      )}
                    </td>
                    <td className="px-6 py-3.5">
                      {ep.dynamicTokens.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {ep.dynamicTokens.map((t) => (
                            <span
                              key={t}
                              className="px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-amber-500/10 text-amber-300 border border-amber-500/20"
                            >
                              {t}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-slate-400 font-mono">—</span>
                      )}
                    </td>
                    <td className="px-6 py-3.5 whitespace-nowrap font-mono text-slate-400">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          copyToClipboard(ep.evidenceId, ep.evidenceId);
                        }}
                        className="hover:text-indigo-400 transition-colors flex items-center space-x-1"
                        title="Click to copy Evidence ID"
                      >
                        <span>{ep.evidenceId.slice(0, 14)}...</span>
                        {copiedId === ep.evidenceId ? (
                          <span className="text-emerald-400 text-[10px]">✓</span>
                        ) : (
                          <svg className="w-3 h-3 text-slate-400 hover:text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                          </svg>
                        )}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Selected Endpoint Detailed Drawer / Card */}
        {selectedEndpoint && (
          <div className="p-5 border-t border-slate-800 bg-slate-950/70">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center space-x-2">
                <span className={`font-mono font-bold px-2 py-0.5 rounded text-xs border ${methodBadgeColor(selectedEndpoint.method)}`}>
                  {selectedEndpoint.method}
                </span>
                <span className="font-mono text-sm font-semibold text-white">
                  {selectedEndpoint.url}
                </span>
              </div>
              <span className="text-xs font-mono text-slate-400">
                Surface ID: <span className="text-indigo-400">{selectedEndpoint.surfaceId}</span>
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-mono">
              <div className="bg-slate-900/80 p-3 rounded-lg border border-slate-800">
                <span className="text-slate-400 block mb-1 font-semibold text-[11px] uppercase tracking-wider">
                  Observed Request Headers
                </span>
                <pre className="text-slate-300 text-[11px] overflow-x-auto max-h-24">
                  {JSON.stringify(selectedEndpoint.requestHeaders, null, 2)}
                </pre>
              </div>

              <div className="bg-slate-900/80 p-3 rounded-lg border border-slate-800">
                <span className="text-slate-400 block mb-1 font-semibold text-[11px] uppercase tracking-wider">
                  Observed Response Headers
                </span>
                <pre className="text-slate-300 text-[11px] overflow-x-auto max-h-24">
                  {JSON.stringify(selectedEndpoint.responseHeaders, null, 2)}
                </pre>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Residual Unknowns Panel (Hard Epistemic Guardrail Section) */}
      <div className="glass-panel rounded-2xl border border-amber-500/20 bg-amber-950/5 p-6 relative overflow-hidden">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <div>
              <h3 className="text-sm font-bold text-white flex items-center space-x-2">
                <span>Residual Unknowns Ledger</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  {unknowns.length} Active Uncertainties
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                Unverified dynamic tokens and cryptographic parameters requiring operator environment variable injection.
              </p>
            </div>
          </div>

          <span className="text-[11px] font-mono text-amber-400 bg-amber-500/10 px-3 py-1 rounded-lg border border-amber-500/20">
            Epistemic Guardrail: ACTIVE
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
          {unknowns.map((unk) => (
            <div
              key={unk.unknown_id}
              className="bg-slate-900/90 rounded-xl p-4 border border-amber-500/20 relative flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-mono text-slate-400 font-semibold truncate max-w-[200px]">
                    {unk.unknown_id}
                  </span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-amber-500/20 text-amber-300">
                    Severity: {unk.severity}
                  </span>
                </div>
                <p className="text-xs text-slate-200 font-medium leading-relaxed">
                  {unk.question}
                </p>
              </div>

              {unk.envVarName && (
                <div className="mt-3 pt-2.5 border-t border-slate-800 flex items-center justify-between text-xs font-mono">
                  <span className="text-slate-400 text-[11px]">Required Env Var:</span>
                  <code className="text-cyan-300 bg-slate-950 px-2 py-0.5 rounded border border-slate-800 text-[11px]">
                    {unk.envVarName}
                  </code>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
