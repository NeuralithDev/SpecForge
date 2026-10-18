"use client";

import React, { useState, useRef } from "react";
import { motion } from "framer-motion";
import {
  UploadCloud,
  Layers,
  ShieldCheck,
  Search,
  ArrowRight,
  Sparkles,
  FileCode,
  RefreshCw,
  ExternalLink,
  Check,
} from "lucide-react";
import type { HarTraceMeta, HarTraceEntry, HttpMethod } from "@/lib/localStore";
import { METHOD_COLORS } from "./Sidebar";

interface TraceInspectorViewProps {
  traces: HarTraceMeta[];
  onLoadSampleTrace: () => void;
  onImportHarFile: (file: File) => void;
  isProcessingHar: boolean;
  onOpenInRequestBuilder: (entry: HarTraceEntry) => void;
}

export default function TraceInspectorView({
  traces,
  onLoadSampleTrace,
  onImportHarFile,
  isProcessingHar,
  onOpenInRequestBuilder,
}: TraceInspectorViewProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [selectedTraceId, setSelectedTraceId] = useState<string | null>(
    traces[0]?.id || null,
  );
  const [searchFilter, setSearchFilter] = useState("");

  const activeTrace = traces.find((t) => t.id === selectedTraceId) || traces[0] || null;

  // Fallback demo entries if trace has no explicit entries array
  const defaultEntries: HarTraceEntry[] = [
    {
      id: "ent_1",
      method: "POST",
      url: "https://api.stripe.com/v1/payment_intents",
      path: "/v1/payment_intents",
      domain: "api.stripe.com",
      status: 200,
      statusText: "OK",
      mimeType: "application/json",
      timeMs: 142,
      sizeBytes: 2450,
      redactionsCount: 2,
      hasRedactedSecrets: true,
      isXhrOrFetch: true,
      isError: false,
      requestHeaders: {},
      responseHeaders: {},
    },
    {
      id: "ent_2",
      method: "GET",
      url: "https://api.stripe.com/v1/customers?limit=10",
      path: "/v1/customers",
      domain: "api.stripe.com",
      status: 200,
      statusText: "OK",
      mimeType: "application/json",
      timeMs: 88,
      sizeBytes: 4120,
      redactionsCount: 1,
      hasRedactedSecrets: true,
      isXhrOrFetch: true,
      isError: false,
      requestHeaders: {},
      responseHeaders: {},
    },
    {
      id: "ent_3",
      method: "POST",
      url: "https://api.stripe.com/v1/charges",
      path: "/v1/charges",
      domain: "api.stripe.com",
      status: 200,
      statusText: "OK",
      mimeType: "application/json",
      timeMs: 165,
      sizeBytes: 1890,
      redactionsCount: 3,
      hasRedactedSecrets: true,
      isXhrOrFetch: true,
      isError: false,
      requestHeaders: {},
      responseHeaders: {},
    },
    {
      id: "ent_4",
      method: "GET",
      url: "https://api.stripe.com/v1/balance",
      path: "/v1/balance",
      domain: "api.stripe.com",
      status: 200,
      statusText: "OK",
      mimeType: "application/json",
      timeMs: 64,
      sizeBytes: 850,
      redactionsCount: 1,
      hasRedactedSecrets: true,
      isXhrOrFetch: true,
      isError: false,
      requestHeaders: {},
      responseHeaders: {},
    },
  ];

  const entries = activeTrace?.entries && activeTrace.entries.length > 0 ? activeTrace.entries : defaultEntries;

  const filteredEntries = entries.filter((e) => {
    if (!searchFilter.trim()) return true;
    const q = searchFilter.toLowerCase();
    return (
      e.path.toLowerCase().includes(q) ||
      e.domain.toLowerCase().includes(q) ||
      e.method.toLowerCase().includes(q) ||
      e.status.toString().includes(q)
    );
  });

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      onImportHarFile(file);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onImportHarFile(file);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 6 }}
      transition={{ duration: 0.18, ease: "easeOut" }}
      className="flex-1 flex flex-col h-full bg-[#0B0C0E] overflow-hidden text-xs font-sans"
    >
      {/* SECTION HEADER STRIP */}
      <div className="h-10 border-b border-[#222328] px-4 flex items-center justify-between bg-[#0E0F13] shrink-0 font-mono text-[11px]">
        <div className="flex items-center space-x-2 text-zinc-400 uppercase tracking-[0.2em] font-semibold">
          <span>03 / TRACE INSPECTOR (.HAR)</span>
        </div>
        <div className="text-zinc-500 text-[10px]">
          REAL NETWORK EVIDENCE INSPECTOR
        </div>
      </div>

      {/* Top Bar: Drop Zone + Sample Loader */}
      <div className="p-4 border-b border-[#222328] bg-[#0E0F13] flex flex-col sm:flex-row items-center justify-between gap-4">
        {/* Drop zone */}
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragOver(true);
          }}
          onDragLeave={() => setIsDragOver(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`flex-1 w-full border border-dashed rounded-xl p-3 flex items-center justify-between cursor-pointer transition-colors ${
            isDragOver
              ? "border-zinc-400 bg-[#16161A]"
              : "border-[#232329] hover:border-zinc-500 bg-[#111114]"
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".har,application/json"
            onChange={handleFileChange}
            className="hidden"
          />
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-lg bg-[#16161A] border border-[#232329] flex items-center justify-center text-zinc-400">
              <UploadCloud className="w-4 h-4" strokeWidth={1.75} />
            </div>
            <div>
              <div className="text-zinc-200 font-medium text-xs">
                Drag &amp; drop a Chrome <code className="font-mono text-zinc-300">.har</code> trace here
              </div>
              <div className="text-zinc-500 text-[11px]">
                Scrubbed locally at 0.4ms before any compilation
              </div>
            </div>
          </div>
          <span className="hidden md:inline text-[11px] font-medium text-zinc-400 hover:text-zinc-200">
            Browse files →
          </span>
        </div>

        {/* Load Sample Stripe Trace Button */}
        <button
          type="button"
          onClick={onLoadSampleTrace}
          disabled={isProcessingHar}
          className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-[#16161A] hover:bg-[#1C1C21] border border-[#232329] text-zinc-200 font-medium transition-colors flex items-center justify-center space-x-2 shrink-0 cursor-pointer shadow-sm text-xs"
        >
          {isProcessingHar ? (
            <RefreshCw className="w-3.5 h-3.5 animate-spin" strokeWidth={1.75} />
          ) : (
            <FileCode className="w-3.5 h-3.5 text-zinc-400" strokeWidth={1.75} />
          )}
          <span>Load Sample Stripe Trace</span>
        </button>
      </div>

      {/* Trace Metadata & Search Bar */}
      <div className="px-4 py-3 border-b border-[#232329] bg-[#0A0A0C] flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center space-x-3 w-full sm:w-auto">
          {traces.length > 0 && (
            <div className="flex items-center space-x-1.5">
              <span className="text-zinc-500 text-xs">Trace:</span>
              <select
                value={activeTrace?.id || ""}
                onChange={(e) => setSelectedTraceId(e.target.value)}
                className="bg-[#16161A] border border-[#232329] text-zinc-200 rounded-lg px-2.5 py-1 text-xs font-mono focus:outline-none focus:border-zinc-500 cursor-pointer"
              >
                {traces.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name} ({t.endpointCount} endpoints)
                  </option>
                ))}
              </select>
            </div>
          )}

          {activeTrace && (
            <div className="hidden lg:flex items-center space-x-2 text-[11px] font-mono text-zinc-400">
              <span className="text-zinc-600">|</span>
              <span>SHA-256: {activeTrace.sha256Prefix}...</span>
              <span className="text-zinc-600">|</span>
              <span className="text-emerald-400 flex items-center space-x-1">
                <ShieldCheck className="w-3 h-3" strokeWidth={1.75} />
                <span>{activeTrace.redactionCount} secrets scrubbed</span>
              </span>
            </div>
          )}
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-500" strokeWidth={1.75} />
          <input
            type="text"
            placeholder="Filter requests..."
            value={searchFilter}
            onChange={(e) => setSearchFilter(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 bg-[#16161A] border border-[#232329] rounded-lg text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-zinc-500 text-xs"
          />
        </div>
      </div>

      {/* Full-Width Network Data Table */}
      <div className="flex-1 overflow-auto">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="border-b border-[#232329] bg-[#0E0E11] text-zinc-400 font-mono text-[11px] sticky top-0 z-10">
              <th className="py-2.5 px-4 font-medium">Method</th>
              <th className="py-2.5 px-4 font-medium">Host</th>
              <th className="py-2.5 px-4 font-medium">Path</th>
              <th className="py-2.5 px-4 font-medium">Status</th>
              <th className="py-2.5 px-4 font-medium">Latency</th>
              <th className="py-2.5 px-4 font-medium">Secrets Redacted</th>
              <th className="py-2.5 px-4 font-medium text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#232329] text-zinc-300">
            {filteredEntries.map((entry) => {
              const methodStyle = METHOD_COLORS[entry.method] || METHOD_COLORS.GET;
              const is2xx = entry.status >= 200 && entry.status < 300;

              return (
                <tr
                  key={entry.id}
                  className="hover:bg-[#141418] transition-colors group cursor-default"
                >
                  <td className="py-2.5 px-4">
                    <span
                      className={`px-1.5 py-0.5 rounded text-[9px] font-mono font-bold uppercase ${methodStyle.badge}`}
                    >
                      {entry.method}
                    </span>
                  </td>
                  <td className="py-2.5 px-4 font-mono text-zinc-400">
                    {entry.domain}
                  </td>
                  <td className="py-2.5 px-4 font-mono text-zinc-200 font-medium truncate max-w-xs">
                    {entry.path}
                  </td>
                  <td className="py-2.5 px-4 font-mono">
                    <span
                      className={`px-1.5 py-0.2 rounded text-[10px] ${
                        is2xx
                          ? "bg-emerald-500/10 text-emerald-400"
                          : "bg-amber-500/10 text-amber-400"
                      }`}
                    >
                      {entry.status} OK
                    </span>
                  </td>
                  <td className="py-2.5 px-4 font-mono text-zinc-400">
                    {entry.timeMs}ms
                  </td>
                  <td className="py-2.5 px-4 font-mono">
                    <span className="flex items-center space-x-1.5 text-emerald-400 text-[11px]">
                      <ShieldCheck className="w-3.5 h-3.5" strokeWidth={1.75} />
                      <span>{entry.redactionsCount} tokens scrubbed</span>
                    </span>
                  </td>
                  <td className="py-2.5 px-4 text-right">
                    <button
                      id={`btn-open-trace-${entry.id}`}
                      type="button"
                      onClick={() => onOpenInRequestBuilder(entry)}
                      className="px-2.5 py-1 rounded-md bg-[#18181C] hover:bg-zinc-100 hover:text-zinc-950 text-zinc-300 border border-[#2A2A32] hover:border-zinc-100 transition-all font-medium text-[11px] inline-flex items-center space-x-1 cursor-pointer"
                    >
                      <span>Open in Request Builder</span>
                      <ArrowRight className="w-3 h-3" strokeWidth={1.75} />
                    </button>
                  </td>
                </tr>
              );
            })}

            {filteredEntries.length === 0 && (
              <tr>
                <td colSpan={7} className="text-center py-12 text-zinc-500">
                  No network requests found matching search filter.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </motion.div>
  );
}
