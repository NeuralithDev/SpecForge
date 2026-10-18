"use client";

import React, { useState } from "react";
import {
  Play,
  Check,
  AlertCircle,
  X,
  Clock,
  Download,
  Layers,
  Sparkles,
  RefreshCw,
  ShieldCheck,
} from "lucide-react";
import type { ApiCollection, ApiRequest, Environment, ApiResponseData } from "@/lib/localStore";
import { interpolateVariables } from "@/lib/localStore";
import { analyzeSchemaDrift } from "@/lib/schemaDrift";
import { METHOD_COLORS } from "./Sidebar";

interface CollectionRunnerModalProps {
  isOpen: boolean;
  onClose: () => void;
  collection: ApiCollection | null;
  requests: ApiRequest[];
  activeEnvironment: Environment | null;
}

interface RunResultItem {
  request: ApiRequest;
  response?: ApiResponseData;
  error?: string;
  isPassed: boolean;
  driftCount: number;
  latencyMs: number;
}

export default function CollectionRunnerModal({
  isOpen,
  onClose,
  collection,
  requests,
  activeEnvironment,
}: CollectionRunnerModalProps) {
  const [isRunning, setIsRunning] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(-1);
  const [results, setResults] = useState<RunResultItem[]>([]);
  const [delayMs, setDelayMs] = useState(150);

  if (!isOpen || !collection) return null;

  const collectionRequests = requests.filter((r) => r.collectionId === collection.id);

  const handleRunCollection = async () => {
    setIsRunning(true);
    setResults([]);
    setCurrentIndex(0);

    const accumulated: RunResultItem[] = [];

    for (let i = 0; i < collectionRequests.length; i++) {
      setCurrentIndex(i);
      const req = collectionRequests[i];
      if (!req) continue;

      let targetUrl = interpolateVariables(req.url, activeEnvironment);
      // Query parameters
      const enabledParams = req.params.filter((p) => p.enabled && p.key.trim().length > 0);
      if (enabledParams.length > 0) {
        try {
          const urlObj = new URL(targetUrl.startsWith("http") ? targetUrl : `https://${targetUrl}`);
          for (const p of enabledParams) {
            urlObj.searchParams.set(p.key.trim(), interpolateVariables(p.value, activeEnvironment));
          }
          targetUrl = urlObj.toString();
        } catch {
          // Keep raw
        }
      }

      // Headers
      const headers: Record<string, string> = {};
      for (const h of req.headers) {
        if (h.enabled && h.key.trim().length > 0) {
          headers[h.key.trim()] = interpolateVariables(h.value, activeEnvironment);
        }
      }

      if (req.auth.type === "bearer" && req.auth.bearerToken) {
        headers["Authorization"] = `Bearer ${interpolateVariables(req.auth.bearerToken, activeEnvironment)}`;
      }

      let body: string | null = null;
      if (req.body.type === "json" && req.body.rawJson) {
        body = interpolateVariables(req.body.rawJson, activeEnvironment);
        if (!headers["Content-Type"]) headers["Content-Type"] = "application/json";
      }

      try {
        const res = await fetch("/api/proxy", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            method: req.method,
            url: targetUrl,
            headers,
            body,
            allowLocal: true,
          }),
        });

        const resData = (await res.json()) as ApiResponseData;
        const isPassed = resData.status >= 200 && resData.status < 400;

        // Schema drift check if expectedContract exists
        let driftCount = 0;
        if (req.expectedContract?.sampleResponse && resData.json) {
          const drift = analyzeSchemaDrift(req.expectedContract.sampleResponse, resData.json);
          driftCount = drift.driftCount;
        }

        accumulated.push({
          request: req,
          response: resData,
          isPassed,
          driftCount,
          latencyMs: resData.timingMs || 50,
        });
      } catch (err: unknown) {
        accumulated.push({
          request: req,
          error: err instanceof Error ? err.message : "Dispatch failed",
          isPassed: false,
          driftCount: 0,
          latencyMs: 0,
        });
      }

      setResults([...accumulated]);

      if (delayMs > 0 && i < collectionRequests.length - 1) {
        await new Promise((r) => setTimeout(r, delayMs));
      }
    }

    setIsRunning(false);
    setCurrentIndex(-1);
  };

  const totalDuration = results.reduce((acc, r) => acc + r.latencyMs, 0);
  const avgLatency = results.length > 0 ? Math.round(totalDuration / results.length) : 0;
  const passedCount = results.filter((r) => r.isPassed).length;
  const maxLatency = Math.max(...results.map((r) => r.latencyMs), 100);

  const handleExportReport = () => {
    const report = {
      collection: collection.name,
      timestamp: new Date().toISOString(),
      summary: {
        totalRequests: collectionRequests.length,
        executed: results.length,
        passed: passedCount,
        failed: results.length - passedCount,
        avgLatencyMs: avgLatency,
        totalDurationMs: totalDuration,
      },
      results: results.map((r) => ({
        name: r.request.name,
        method: r.request.method,
        url: r.request.url,
        status: r.response?.status ?? 0,
        latencyMs: r.latencyMs,
        isPassed: r.isPassed,
        driftCount: r.driftCount,
      })),
    };

    const blob = new Blob([JSON.stringify(report, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${collection.name.toLowerCase().replace(/[^a-z0-9]/gu, "-")}-runner-report.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-150">
      <div className="w-full max-w-4xl bg-[#0f0f12] border border-white/10 rounded-2xl shadow-2xl overflow-hidden flex flex-col font-sans max-h-[85vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-[#141418]">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-xl bg-gradient-to-tr from-emerald-600 to-indigo-600 text-white shadow-glow">
              <Play className="w-5 h-5 fill-current" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-base font-semibold text-slate-100">{collection.name}</h2>
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-mono">
                  Collection Runner
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Execute sequential benchmark & contract obligation checks across all {collectionRequests.length} endpoints
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-white/5 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Toolbar & Options */}
        <div className="px-6 py-3 border-b border-white/10 bg-[#09090b] flex items-center justify-between">
          <div className="flex items-center space-x-4 text-xs text-slate-400">
            <div>
              Target Env: <span className="font-mono text-indigo-300 font-semibold">{activeEnvironment?.name || "Localhost"}</span>
            </div>
            <div className="flex items-center space-x-1.5">
              <span>Delay:</span>
              <select
                value={delayMs}
                onChange={(e) => setDelayMs(Number(e.target.value))}
                className="bg-[#141418] border border-white/10 rounded px-2 py-1 text-slate-200 text-xs font-mono"
              >
                <option value={0}>0 ms (fastest)</option>
                <option value={150}>150 ms</option>
                <option value={500}>500 ms</option>
                <option value={1000}>1000 ms</option>
              </select>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            {results.length > 0 && !isRunning && (
              <button
                onClick={handleExportReport}
                className="flex items-center space-x-1.5 px-3 py-1.5 bg-white/10 hover:bg-white/15 text-slate-200 rounded-lg text-xs font-medium border border-white/10 transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export Report</span>
              </button>
            )}
            <button
              onClick={handleRunCollection}
              disabled={isRunning || collectionRequests.length === 0}
              className="flex items-center space-x-2 px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-lg text-xs font-semibold shadow-lg shadow-emerald-600/20 transition-all"
            >
              {isRunning ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Running {currentIndex + 1}/{collectionRequests.length}...</span>
                </>
              ) : (
                <>
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>Run {collectionRequests.length} Endpoints</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Summary Metrics (when run) */}
        {results.length > 0 && (
          <div className="grid grid-cols-4 gap-3 px-6 py-3 bg-[#141418] border-b border-white/10 text-xs font-mono">
            <div className="p-2.5 rounded-lg bg-[#09090b] border border-white/5">
              <span className="text-slate-500 block text-[10px]">Passed / Total</span>
              <span className="text-emerald-400 font-bold text-sm">
                {passedCount} / {collectionRequests.length}
              </span>
            </div>
            <div className="p-2.5 rounded-lg bg-[#09090b] border border-white/5">
              <span className="text-slate-500 block text-[10px]">Total Duration</span>
              <span className="text-indigo-300 font-bold text-sm">{totalDuration} ms</span>
            </div>
            <div className="p-2.5 rounded-lg bg-[#09090b] border border-white/5">
              <span className="text-slate-500 block text-[10px]">Avg Latency</span>
              <span className="text-cyan-400 font-bold text-sm">{avgLatency} ms</span>
            </div>
            <div className="p-2.5 rounded-lg bg-[#09090b] border border-white/5">
              <span className="text-slate-500 block text-[10px]">Contract Parity</span>
              <span className="text-violet-300 font-bold text-sm">
                {results.every((r) => r.driftCount === 0) ? "100% Match" : "Drift Found"}
              </span>
            </div>
          </div>
        )}

        {/* Results / Endpoints List */}
        <div className="flex-1 overflow-y-auto p-6 space-y-2">
          {collectionRequests.map((req, idx) => {
            const resItem = results.find((r) => r.request.id === req.id);
            const isCurrentlyExecuting = isRunning && currentIndex === idx;
            const methodStyle = METHOD_COLORS[req.method] || METHOD_COLORS.GET;
            const barWidthPct = resItem ? Math.min(100, Math.round((resItem.latencyMs / maxLatency) * 100)) : 0;

            return (
              <div
                key={req.id}
                className={`p-3 rounded-xl border transition-colors flex items-center justify-between ${
                  isCurrentlyExecuting
                    ? "bg-violet-950/20 border-violet-500/40"
                    : resItem
                    ? resItem.isPassed
                      ? "bg-[#09090b] border-white/10"
                      : "bg-rose-950/20 border-rose-500/30"
                    : "bg-[#09090b]/50 border-white/5 opacity-60"
                }`}
              >
                <div className="flex items-center space-x-3 truncate flex-1 mr-4">
                  <span
                    className={`px-1.5 py-0.5 rounded text-[9px] font-mono font-bold uppercase border shrink-0 ${methodStyle.badge}`}
                  >
                    {req.method}
                  </span>
                  <div className="truncate">
                    <span className="text-xs font-semibold text-slate-200 block truncate">
                      {req.name}
                    </span>
                    <span className="text-[11px] font-mono text-slate-500 truncate block">
                      {req.url}
                    </span>
                  </div>
                </div>

                {/* Status & Waterfall Column */}
                <div className="flex items-center space-x-4 shrink-0">
                  {/* Latency Waterfall Bar */}
                  {resItem && (
                    <div className="w-24 flex flex-col items-end">
                      <span className="text-[10px] font-mono text-slate-400">{resItem.latencyMs} ms</span>
                      <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden mt-0.5">
                        <div
                          className={`h-full rounded-full ${
                            resItem.latencyMs > 300
                              ? "bg-amber-400"
                              : "bg-gradient-to-r from-emerald-500 to-cyan-400"
                          }`}
                          style={{ width: `${Math.max(5, barWidthPct)}%` }}
                        />
                      </div>
                    </div>
                  )}

                  {/* Status Indicator */}
                  {isCurrentlyExecuting ? (
                    <RefreshCw className="w-4 h-4 text-violet-400 animate-spin" />
                  ) : resItem ? (
                    <div className="flex items-center space-x-2">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold border ${
                          resItem.isPassed
                            ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                            : "bg-rose-500/10 text-rose-400 border-rose-500/30"
                        }`}
                      >
                        {resItem.response?.status || "ERR"}
                      </span>
                      {resItem.driftCount > 0 ? (
                        <span className="text-amber-400 text-[10px] font-mono" title={`${resItem.driftCount} schema drifts`}>
                          ⚠️ {resItem.driftCount}d
                        </span>
                      ) : (
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                      )}
                    </div>
                  ) : (
                    <span className="text-[11px] font-mono text-slate-600">Queued</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
