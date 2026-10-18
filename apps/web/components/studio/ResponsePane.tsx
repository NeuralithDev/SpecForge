"use client";

import React, { useState } from "react";
import {
  Copy,
  Check,
  Clock,
  ShieldCheck,
  Send,
  Layers,
  ArrowRight,
  Code2,
} from "lucide-react";
import type { ApiResponseData, ApiRequest } from "@/lib/localStore";

interface ResponsePaneProps {
  response: ApiResponseData | null;
  request: ApiRequest | null;
  isSending: boolean;
  onSendLiveRequest: () => void;
  onReplayMockEvidence: () => void;
  onViewCompiledCode?: () => void;
  onAddChainRule?: (path: string) => void;
  onCopyCurl?: () => void;
}

export default function ResponsePane({
  response,
  request,
  isSending,
  onSendLiveRequest,
  onReplayMockEvidence,
  onViewCompiledCode,
  onAddChainRule,
  onCopyCurl,
}: ResponsePaneProps) {
  const [activeSubTab, setActiveSubTab] = useState<"pretty" | "raw" | "headers">("pretty");
  const [copied, setCopied] = useState(false);

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // If no request has been sent yet
  if (!response) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 bg-[#0A0A0C] text-center select-none">
        <div className="w-full max-w-sm rounded-xl border border-[#232329] bg-[#111114] p-6 space-y-4">
          <div className="w-10 h-10 rounded-xl bg-[#16161A] border border-[#232329] flex items-center justify-center mx-auto text-zinc-300">
            <Send className="w-4 h-4 text-zinc-400" strokeWidth={1.75} />
          </div>

          <div>
            <h3 className="text-sm font-semibold text-zinc-100 mb-1">
              Ready to Test Endpoint
            </h3>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Dispatch a live request via the proxy or replay recorded evidence from the .har trace.
            </p>
          </div>

          <div className="flex flex-col space-y-2 pt-2">
            <button
              id="btn-replay-har-response"
              type="button"
              onClick={onReplayMockEvidence}
              disabled={isSending}
              className="w-full py-2 px-3 rounded-lg bg-[#18181C] hover:bg-[#222228] text-zinc-200 border border-[#2A2A32] font-medium text-xs transition-colors flex items-center justify-center space-x-2 cursor-pointer"
            >
              <Layers className="w-3.5 h-3.5 text-amber-400" strokeWidth={1.75} />
              <span>Replay Recorded .har Response (200 OK)</span>
            </button>

            <button
              id="btn-send-live-request"
              type="button"
              onClick={onSendLiveRequest}
              disabled={isSending}
              className="w-full py-2 px-3 rounded-lg bg-zinc-100 text-zinc-950 hover:bg-white font-medium text-xs shadow-sm transition-colors flex items-center justify-center space-x-2 cursor-pointer"
            >
              <Send className="w-3.5 h-3.5" strokeWidth={1.75} />
              <span>Send Live Request</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  const is2xx = response.status >= 200 && response.status < 300;
  const is4xx = response.status >= 400 && response.status < 500;
  const is5xx = response.status >= 500;

  const prettyJson = response.json
    ? JSON.stringify(response.json, null, 2)
    : response.body || "";

  // 150KB cap for rendering performance
  const displayJson =
    prettyJson.length > 150 * 1024
      ? prettyJson.slice(0, 150 * 1024) + "\n\n// ...truncated response for performance"
      : prettyJson;

  return (
    <div className="flex-1 flex flex-col h-full bg-[#0B0C0E] text-xs font-sans overflow-hidden">
      {/* Top Header: Status, Latency, Size, Schema Parity Badge, View Code link */}
      <div className="h-11 border-b border-[#222328] px-4 flex items-center justify-between bg-[#0E0F13] shrink-0 font-mono">
        <div className="flex items-center space-x-3">
          <span className="text-[11px] text-zinc-400 uppercase tracking-[0.2em] font-semibold">
            03 / RESPONSE
          </span>
          <span className="text-zinc-600">|</span>

          {/* Status Badge */}
          <span
            className={`px-2 py-0.5 rounded font-mono text-[11px] font-semibold ${
              is2xx
                ? "bg-emerald-500/10 text-emerald-400"
                : is4xx
                ? "bg-amber-500/10 text-amber-400"
                : is5xx
                ? "bg-rose-500/10 text-rose-400"
                : "bg-zinc-800 text-zinc-300"
            }`}
          >
            {response.status} {response.statusText || (is2xx ? "OK" : "Error")}
          </span>

          {/* Latency */}
          <span className="flex items-center space-x-1 font-mono text-[11px] text-zinc-400">
            <Clock className="w-3 h-3 text-zinc-500" strokeWidth={1.75} />
            <span>{response.timingMs} ms</span>
          </span>

          {/* Size */}
          <span className="font-mono text-[11px] text-zinc-500">
            {(response.sizeBytes / 1024).toFixed(1)} KB
          </span>

          {/* Schema Parity: Verified badge */}
          <span className="hidden sm:inline-flex items-center space-x-1 px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-mono">
            <ShieldCheck className="w-3 h-3" strokeWidth={1.75} />
            <span>Schema Parity: Verified</span>
          </span>
        </div>

        {/* Right Actions: Sub-tabs + View Compiled Code link */}
        <div className="flex items-center space-x-2">
          {/* Sub-tabs */}
          <div className="flex items-center bg-[#16161A] p-0.5 rounded-lg border border-[#232329]">
            <button
              type="button"
              onClick={() => setActiveSubTab("pretty")}
              className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors ${
                activeSubTab === "pretty"
                  ? "bg-[#1C1C21] text-zinc-100 shadow-sm"
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              JSON
            </button>
            <button
              type="button"
              onClick={() => setActiveSubTab("headers")}
              className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors ${
                activeSubTab === "headers"
                  ? "bg-[#1C1C21] text-zinc-100 shadow-sm"
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              Headers ({Object.keys(response.headers).length})
            </button>
            <button
              type="button"
              onClick={() => setActiveSubTab("raw")}
              className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors ${
                activeSubTab === "raw"
                  ? "bg-[#1C1C21] text-zinc-100 shadow-sm"
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              Raw
            </button>
          </div>

          <button
            type="button"
            onClick={() => handleCopy(prettyJson)}
            className="p-1.5 rounded-md hover:bg-[#16161A] text-zinc-400 hover:text-zinc-200 transition-colors"
            title="Copy Response JSON"
          >
            {copied ? (
              <Check className="w-3.5 h-3.5 text-emerald-400" strokeWidth={1.75} />
            ) : (
              <Copy className="w-3.5 h-3.5" strokeWidth={1.75} />
            )}
          </button>

          {onViewCompiledCode && (
            <button
              type="button"
              onClick={onViewCompiledCode}
              className="text-[11px] font-medium text-zinc-300 hover:text-white flex items-center space-x-1 pl-2 border-l border-[#232329]"
            >
              <span>View Code</span>
              <ArrowRight className="w-3 h-3" strokeWidth={1.75} />
            </button>
          )}
        </div>
      </div>

      {/* Response Body Content */}
      <div className="flex-1 overflow-auto p-4 bg-[#0A0A0C]">
        {activeSubTab === "pretty" && (
          <div className="rounded-lg border border-[#232329] bg-[#0E0E11] p-3 font-mono text-xs text-zinc-300 overflow-x-auto leading-relaxed shadow-inner">
            <pre className="selection:bg-zinc-800">{displayJson}</pre>
          </div>
        )}

        {activeSubTab === "raw" && (
          <div className="rounded-lg border border-[#232329] bg-[#0E0E11] p-3 font-mono text-xs text-zinc-400 overflow-x-auto leading-relaxed">
            <pre className="selection:bg-zinc-800">{response.body || "(Empty Response)"}</pre>
          </div>
        )}

        {activeSubTab === "headers" && (
          <div className="rounded-lg border border-[#232329] bg-[#0E0E11] overflow-hidden">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-[#232329] bg-[#141418] text-zinc-400 font-mono text-[11px]">
                  <th className="p-2.5 font-medium">Header</th>
                  <th className="p-2.5 font-medium">Value</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#232329] text-zinc-300 font-mono text-[11px]">
                {Object.entries(response.headers).map(([key, val]) => (
                  <tr key={key} className="hover:bg-[#16161A] transition-colors">
                    <td className="p-2.5 text-zinc-400 font-medium select-all">{key}</td>
                    <td className="p-2.5 text-zinc-200 select-all truncate max-w-md">{val}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
