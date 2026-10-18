"use client";

import React, { useState } from "react";
import { Terminal, Check, X, AlertCircle, Sparkles, Layers } from "lucide-react";
import { parseCurlCommand, type ParsedCurlResult } from "@/lib/curlParser";
import { METHOD_COLORS } from "./Sidebar";
import type { ApiRequest } from "@/lib/localStore";

interface CurlImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportParsed: (parsed: ParsedCurlResult, openInNewTab: boolean) => void;
}

const SAMPLE_CURLS = [
  {
    name: "Stripe Create Charge",
    curl: `curl -X POST "https://api.stripe.com/v1/charges" \\
  -H "Authorization: Bearer sk_test_51...SAMPLE" \\
  -H "Content-Type: application/json" \\
  -d '{"amount": 4900, "currency": "usd", "description": "Agent Seat"}'`,
  },
  {
    name: "GitHub Octocat API",
    curl: `curl -X GET "https://api.github.com/repos/octocat/Hello-World" \\
  -H "User-Agent: SpecForge-Studio/3.0" \\
  -H "Accept: application/vnd.github.v3+json"`,
  },
];

export default function CurlImportModal({
  isOpen,
  onClose,
  onImportParsed,
}: CurlImportModalProps) {
  const [rawText, setRawText] = useState("");
  const [parsedPreview, setParsedPreview] = useState<ParsedCurlResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleTextChange = (text: string) => {
    setRawText(text);
    setError(null);
    if (!text.trim()) {
      setParsedPreview(null);
      return;
    }
    try {
      const result = parseCurlCommand(text);
      setParsedPreview(result);
    } catch (err) {
      setError("Unable to parse cURL syntax. Check flags and quotes.");
    }
  };

  const handleApply = (openInNewTab: boolean) => {
    if (!parsedPreview) return;
    onImportParsed(parsedPreview, openInNewTab);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-150">
      <div className="w-full max-w-2xl bg-[#0f0f12] border border-white/10 rounded-2xl shadow-2xl overflow-hidden flex flex-col font-sans">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-[#141418]">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-xl bg-gradient-to-tr from-cyan-600 to-indigo-600 text-white shadow-glow">
              <Terminal className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-slate-100">Smart cURL & Raw HTTP Importer</h2>
              <p className="text-xs text-slate-400">
                Paste any standard cURL command to automatically extract method, headers, auth, and body
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

        {/* Content */}
        <div className="p-6 space-y-4">
          {/* Quick Preset Buttons */}
          <div className="flex items-center space-x-2">
            <span className="text-[11px] text-slate-500 font-mono">Sample cURLs:</span>
            {SAMPLE_CURLS.map((sample) => (
              <button
                key={sample.name}
                type="button"
                onClick={() => handleTextChange(sample.curl)}
                className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-[11px] text-indigo-300 transition-colors"
              >
                {sample.name}
              </button>
            ))}
          </div>

          <textarea
            value={rawText}
            onChange={(e) => handleTextChange(e.target.value)}
            placeholder='curl -X POST "https://api.example.com/v1/resource" -H "Authorization: Bearer ..." -d "{\"key\":\"val\"}"'
            rows={7}
            className="w-full p-3 bg-[#09090b] border border-white/10 rounded-xl font-mono text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-violet-500 resize-none leading-relaxed"
          />

          {error && (
            <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Parsed Live Preview Card */}
          {parsedPreview && (
            <div className="p-4 rounded-xl bg-[#141418] border border-white/10 space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase border ${
                      METHOD_COLORS[parsedPreview.method]?.badge || ""
                    }`}
                  >
                    {parsedPreview.method}
                  </span>
                  <span className="font-mono text-slate-200 truncate max-w-md">
                    {parsedPreview.url}
                  </span>
                </div>
                <span className="text-emerald-400 font-mono text-[11px] flex items-center space-x-1">
                  <Check className="w-3.5 h-3.5" />
                  <span>Valid cURL</span>
                </span>
              </div>

              <div className="grid grid-cols-3 gap-2 text-[11px] text-slate-400 font-mono pt-1">
                <div>Headers: <span className="text-slate-200">{parsedPreview.headers.length}</span></div>
                <div>Auth: <span className="text-indigo-400 uppercase">{parsedPreview.auth.type}</span></div>
                <div>Body: <span className="text-amber-400 uppercase">{parsedPreview.body.type}</span></div>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-end space-x-3 px-6 py-4 border-t border-white/10 bg-[#141418]">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-slate-400 hover:text-slate-200 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => handleApply(false)}
            disabled={!parsedPreview}
            className="px-4 py-2 text-xs font-semibold bg-white/10 hover:bg-white/15 disabled:opacity-40 text-slate-200 rounded-lg transition-colors border border-white/10"
          >
            Apply to Active Tab
          </button>
          <button
            onClick={() => handleApply(true)}
            disabled={!parsedPreview}
            className="px-4 py-2 text-xs font-semibold bg-violet-600 hover:bg-violet-500 disabled:opacity-40 text-white rounded-lg shadow-lg shadow-violet-600/20 transition-all"
          >
            Import as New Tab
          </button>
        </div>
      </div>
    </div>
  );
}
