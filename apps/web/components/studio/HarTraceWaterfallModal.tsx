"use client";

import React, { useState } from "react";
import {
  FileCode,
  ShieldCheck,
  X,
  Search,
  Filter,
  ArrowRight,
  Plus,
  Check,
  Layers,
  HardDrive,
  Clock,
  Lock,
} from "lucide-react";
import type { HarTraceMeta, HarTraceEntry, ApiRequest } from "@/lib/localStore";
import { METHOD_COLORS } from "./Sidebar";

interface HarTraceWaterfallModalProps {
  isOpen: boolean;
  onClose: () => void;
  trace: HarTraceMeta | null;
  onConvertToRequest: (entry: HarTraceEntry) => void;
}

export default function HarTraceWaterfallModal({
  isOpen,
  onClose,
  trace,
  onConvertToRequest,
}: HarTraceWaterfallModalProps) {
  const [filterType, setFilterType] = useState<"all" | "xhr" | "secrets" | "errors">("all");
  const [search, setSearch] = useState("");
  const [selectedEntryId, setSelectedEntryId] = useState<string | null>(null);
  const [addedIds, setAddedIds] = useState<Record<string, boolean>>({});

  if (!isOpen || !trace) return null;

  const entries = trace.entries || [];
  const selectedEntry = entries.find((e) => e.id === selectedEntryId) || entries[0] || null;

  const filteredEntries = entries.filter((entry) => {
    if (filterType === "xhr" && !entry.isXhrOrFetch) return false;
    if (filterType === "secrets" && !entry.hasRedactedSecrets) return false;
    if (filterType === "errors" && !entry.isError) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      return (
        entry.url.toLowerCase().includes(q) ||
        entry.method.toLowerCase().includes(q) ||
        entry.path.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const maxTimeMs = Math.max(...entries.map((e) => e.timeMs), 150);

  const handleAdd = (entry: HarTraceEntry) => {
    onConvertToRequest(entry);
    setAddedIds((prev) => ({ ...prev, [entry.id]: true }));
    setTimeout(() => {
      setAddedIds((prev) => ({ ...prev, [entry.id]: false }));
    }, 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-150">
      <div className="w-full max-w-5xl bg-[#0f0f12] border border-white/10 rounded-2xl shadow-2xl overflow-hidden flex flex-col font-sans max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-[#141418]">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-xl bg-gradient-to-tr from-indigo-600 to-cyan-500 text-white shadow-glow">
              <FileCode className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-base font-semibold text-slate-100">{trace.name}</h2>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  SHA: {trace.sha256Prefix}
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                  🛡️ {trace.redactionCount} Secrets Scrubbed
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Interactive network trace waterfall with HarSanitizer credential audit & 1-click endpoint promotion
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

        {/* Filters Toolbar */}
        <div className="px-6 py-2.5 border-b border-white/10 bg-[#09090b] flex items-center justify-between text-xs">
          <div className="flex items-center space-x-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                type="text"
                placeholder="Filter trace requests..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8 pr-3 py-1 bg-[#141418] border border-white/10 rounded-lg text-slate-200 placeholder-slate-500 text-xs focus:outline-none focus:border-indigo-500 w-52"
              />
            </div>

            <div className="flex items-center space-x-1 bg-[#141418] p-0.5 rounded-lg border border-white/10">
              <button
                onClick={() => setFilterType("all")}
                className={`px-2.5 py-1 rounded text-[11px] font-medium transition-colors ${
                  filterType === "all" ? "bg-white/10 text-white" : "text-slate-400 hover:text-slate-200"
                }`}
              >
                All ({entries.length})
              </button>
              <button
                onClick={() => setFilterType("xhr")}
                className={`px-2.5 py-1 rounded text-[11px] font-medium transition-colors ${
                  filterType === "xhr" ? "bg-white/10 text-white" : "text-slate-400 hover:text-slate-200"
                }`}
              >
                XHR/Fetch
              </button>
              <button
                onClick={() => setFilterType("secrets")}
                className={`px-2.5 py-1 rounded text-[11px] font-medium transition-colors ${
                  filterType === "secrets" ? "bg-indigo-600/30 text-indigo-300" : "text-slate-400 hover:text-slate-200"
                }`}
              >
                🔒 Redacted
              </button>
              <button
                onClick={() => setFilterType("errors")}
                className={`px-2.5 py-1 rounded text-[11px] font-medium transition-colors ${
                  filterType === "errors" ? "bg-rose-600/30 text-rose-300" : "text-slate-400 hover:text-slate-200"
                }`}
              >
                Errors
              </button>
            </div>
          </div>

          <div className="text-slate-400 text-[11px] font-mono">
            Showing {filteredEntries.length} of {entries.length} captured calls
          </div>
        </div>

        {/* Main 2-Pane Body: Table + Inspector */}
        <div className="flex-1 flex overflow-hidden">
          {/* Table List (Left 60%) */}
          <div className="flex-[3] border-r border-white/10 overflow-y-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead className="sticky top-0 bg-[#141418] text-[10px] text-slate-500 uppercase tracking-wider font-mono border-b border-white/10">
                <tr>
                  <th className="py-2 px-3">Method</th>
                  <th className="py-2 px-3">Status</th>
                  <th className="py-2 px-3">Path / Resource</th>
                  <th className="py-2 px-3">Waterfall</th>
                  <th className="py-2 px-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filteredEntries.map((entry) => {
                  const isSelected = selectedEntry?.id === entry.id;
                  const isAdded = addedIds[entry.id];
                  const methodStyle = METHOD_COLORS[entry.method] || METHOD_COLORS.GET;
                  const barWidth = Math.max(5, Math.min(100, Math.round((entry.timeMs / maxTimeMs) * 100)));

                  return (
                    <tr
                      key={entry.id}
                      onClick={() => setSelectedEntryId(entry.id)}
                      className={`cursor-pointer transition-colors ${
                        isSelected
                          ? "bg-violet-950/30 text-white font-medium"
                          : "hover:bg-white/5 text-slate-300"
                      }`}
                    >
                      <td className="py-2.5 px-3 whitespace-nowrap">
                        <span
                          className={`px-1.5 py-0.5 rounded text-[9px] font-mono font-bold uppercase border ${methodStyle.badge}`}
                        >
                          {entry.method}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 whitespace-nowrap">
                        <span
                          className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-semibold ${
                            entry.status >= 200 && entry.status < 300
                              ? "text-emerald-400 bg-emerald-500/10"
                              : "text-amber-400 bg-amber-500/10"
                          }`}
                        >
                          {entry.status}
                        </span>
                      </td>
                      <td className="py-2.5 px-3">
                        <div className="truncate max-w-[240px]">
                          <span className="font-mono text-slate-200 block truncate">{entry.path}</span>
                          <span className="text-[10px] text-slate-500 font-mono block truncate">{entry.domain}</span>
                        </div>
                      </td>
                      <td className="py-2.5 px-3 whitespace-nowrap w-28">
                        <div className="flex flex-col items-end">
                          <span className="text-[10px] font-mono text-slate-400">{entry.timeMs}ms</span>
                          <div className="w-full h-1 bg-white/10 rounded-full overflow-hidden mt-0.5">
                            <div
                              className="h-full bg-gradient-to-r from-indigo-500 to-cyan-400 rounded-full"
                              style={{ width: `${barWidth}%` }}
                            />
                          </div>
                        </div>
                      </td>
                      <td className="py-2.5 px-3 text-right whitespace-nowrap">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleAdd(entry);
                          }}
                          className="px-2 py-1 rounded bg-white/5 hover:bg-white/10 border border-white/10 text-[10px] font-mono text-indigo-300 hover:text-white transition-colors"
                        >
                          {isAdded ? "✓ Added" : "+ Import"}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Selected Entry Inspector (Right 40%) */}
          <div className="flex-[2] bg-[#09090b] p-4 overflow-y-auto space-y-4 text-xs font-mono">
            {selectedEntry ? (
              <>
                <div className="p-3 bg-[#141418] rounded-xl border border-white/10 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-200 font-semibold">{selectedEntry.method} {selectedEntry.path}</span>
                    <button
                      onClick={() => handleAdd(selectedEntry)}
                      className="flex items-center space-x-1 px-2.5 py-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded text-[11px] font-sans font-semibold transition-colors"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Promote to Collection</span>
                    </button>
                  </div>
                  <div className="text-[11px] text-slate-400 break-all">{selectedEntry.url}</div>
                  <div className="flex items-center space-x-2 pt-1 text-[11px]">
                    <span className="text-emerald-400">🛡️ {selectedEntry.redactionsCount} Redacted Secrets</span>
                    <span className="text-slate-600">·</span>
                    <span className="text-indigo-300">{selectedEntry.timeMs}ms</span>
                    <span className="text-slate-600">·</span>
                    <span className="text-violet-300">{selectedEntry.sizeBytes} bytes</span>
                  </div>
                </div>

                {/* Headers */}
                <div className="space-y-1">
                  <span className="text-[10px] font-semibold uppercase text-slate-500">Sanitized Request Headers</span>
                  <div className="p-2.5 bg-[#141418] rounded-lg border border-white/10 space-y-1 text-[11px]">
                    {Object.entries(selectedEntry.requestHeaders).map(([k, v]) => (
                      <div key={k} className="flex justify-between">
                        <span className="text-indigo-300">{k}:</span>
                        <span className="text-slate-300 truncate max-w-[200px]">{v}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Request / Response Body */}
                {selectedEntry.requestBody && (
                  <div className="space-y-1">
                    <span className="text-[10px] font-semibold uppercase text-slate-500">Sanitized Request Body</span>
                    <pre className="p-2.5 bg-[#141418] rounded-lg border border-white/10 text-[11px] text-slate-300 overflow-x-auto whitespace-pre-wrap">
                      {selectedEntry.requestBody}
                    </pre>
                  </div>
                )}

                {selectedEntry.responseBody && (
                  <div className="space-y-1">
                    <span className="text-[10px] font-semibold uppercase text-slate-500">Response Payload</span>
                    <pre className="p-2.5 bg-[#141418] rounded-lg border border-white/10 text-[11px] text-slate-300 overflow-x-auto whitespace-pre-wrap">
                      {selectedEntry.responseBody}
                    </pre>
                  </div>
                )}
              </>
            ) : (
              <div className="text-center py-12 text-slate-500">
                Select an entry to inspect headers and sanitized payload
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
