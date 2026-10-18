"use client";

import React, { useState, useRef } from "react";
import type { AnalysisState } from "../lib/types";

interface UploadStudioProps {
  readonly isAnalyzing: boolean;
  readonly onAnalyze: (input: {
    harPayload?: string;
    bundlePath?: string;
    targetUrl?: string;
    targetName: string;
    targetType: "har" | "bundle" | "url";
  }) => Promise<void>;
  readonly onLoadSample?: () => void;
}

export default function UploadStudio({
  isAnalyzing,
  onAnalyze,
  onLoadSample,
}: UploadStudioProps) {
  const [activeTab, setActiveTab] = useState<"har" | "bundle" | "url">("har");
  const [urlInput, setUrlInput] = useState("https://staging.acme.cloud");
  const [usePlaywrightCdp, setUsePlaywrightCdp] = useState(true);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      await processUploadedFile(file);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      await processUploadedFile(file);
    }
  };

  const processUploadedFile = async (file: File) => {
    const text = await file.text();
    const isHar = file.name.endsWith(".har") || text.includes('"log"');

    if (isHar) {
      await onAnalyze({
        harPayload: text,
        targetName: file.name,
        targetType: "har",
      });
    } else {
      await onAnalyze({
        bundlePath: file.name,
        harPayload: undefined,
        targetName: file.name,
        targetType: "bundle",
      });
    }
  };

  const handleUrlSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!urlInput.trim()) return;
    await onAnalyze({
      targetUrl: urlInput.trim(),
      targetName: new URL(urlInput).hostname,
      targetType: "url",
    });
  };

  return (
    <div className="glass-panel rounded-2xl p-6 shadow-glow border border-slate-800 relative overflow-hidden">
      {/* Glow highlight in corner */}
      <div className="absolute top-0 right-0 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="flex flex-col md:flex-row md:items-center justify-between pb-5 border-b border-slate-800/80 gap-4">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center space-x-2">
            <span>Upload & Capture Studio</span>
            <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
              Evidence Ingestion
            </span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Ingest network traffic, client JavaScript bundles, or trigger headless browser scenario captures.
          </p>
        </div>

        {/* Tab Selection */}
        <div className="flex bg-slate-900/80 p-1 rounded-xl border border-slate-800 self-start md:self-auto">
          <button
            type="button"
            onClick={() => setActiveTab("har")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === "har"
                ? "bg-indigo-600 text-white shadow"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            HAR Traffic (.har)
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("bundle")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === "bundle"
                ? "bg-indigo-600 text-white shadow"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            JS Bundle (.js)
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("url")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === "url"
                ? "bg-indigo-600 text-white shadow"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            Staging URL (CDP)
          </button>
        </div>
      </div>

      <div className="mt-6">
        {activeTab === "har" || activeTab === "bundle" ? (
          <div
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-xl p-8 flex flex-col items-center justify-center cursor-pointer transition-all ${
              dragActive
                ? "border-indigo-400 bg-indigo-950/20 scale-[0.99]"
                : "border-slate-700/80 hover:border-indigo-500/50 bg-slate-900/30 hover:bg-slate-900/50"
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept={activeTab === "har" ? ".har,application/json" : ".js,.cjs,.mjs"}
              onChange={handleFileChange}
              className="hidden"
            />
            <div className="w-12 h-12 rounded-full bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center mb-3 text-indigo-400">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                />
              </svg>
            </div>
            <p className="text-sm font-medium text-slate-200 text-center">
              Drag & Drop your <span className="text-indigo-400 font-semibold">{activeTab.toUpperCase()}</span> artifact here
            </p>
            <p className="text-xs text-slate-400 mt-1">or click to browse local filesystem</p>
          </div>
        ) : (
          <form onSubmit={handleUrlSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Staging Target URL (Playwright / CDP Capture)
              </label>
              <div className="flex gap-2">
                <input
                  type="url"
                  value={urlInput}
                  onChange={(e) => setUrlInput(e.target.value)}
                  placeholder="https://api.example.com"
                  required
                  className="flex-1 bg-slate-900/90 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 font-mono"
                />
                <button
                  type="submit"
                  disabled={isAnalyzing}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 font-medium text-sm text-white shadow-glow disabled:opacity-50 transition-all flex items-center space-x-2"
                >
                  <span>Launch Capture</span>
                </button>
              </div>
            </div>

            <div className="flex items-center space-x-2 text-xs text-slate-400">
              <input
                type="checkbox"
                id="cdp-toggle"
                checked={usePlaywrightCdp}
                onChange={(e) => setUsePlaywrightCdp(e.target.checked)}
                className="rounded border-slate-700 text-indigo-600 focus:ring-0 bg-slate-900"
              />
              <label htmlFor="cdp-toggle" className="cursor-pointer">
                Capture automated network events via Chrome DevTools Protocol (CDP) session
              </label>
            </div>
          </form>
        )}

        {/* Action bar with Quick Demo button */}
        <div className="mt-4 flex items-center justify-between pt-3 border-t border-slate-800/60 text-xs">
          <div className="flex items-center space-x-2 text-slate-400">
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400"></span>
            <span>Zero-Hallucination Policy: Output bound strictly to SHA-256 evidence.</span>
          </div>

          <button
            type="button"
            onClick={onLoadSample}
            disabled={isAnalyzing}
            className="text-xs font-semibold text-indigo-400 hover:text-indigo-300 underline underline-offset-4 flex items-center space-x-1"
          >
            <span>Load Sample Production Target</span>
            <span>→</span>
          </button>
        </div>
      </div>

      {/* Analyzing Progress Overlay */}
      {isAnalyzing && (
        <div className="absolute inset-0 bg-slate-950/85 backdrop-blur-md flex flex-col items-center justify-center z-20">
          <div className="w-12 h-12 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin mb-4" />
          <h3 className="text-sm font-bold text-white tracking-wide">
            DISSECTING WORKFLOW TARGET
          </h3>
          <p className="text-xs text-slate-400 mt-1 font-mono">
            Extracting HTTP transactions · Hashing SHA-256 · Auditing Unknowns...
          </p>
        </div>
      )}
    </div>
  );
}
