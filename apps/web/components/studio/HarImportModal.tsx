"use client";

import React, { useState, useRef } from "react";
import { UploadCloud, FileCode, Sparkles, X, ShieldCheck, AlertCircle, Layers } from "lucide-react";
import { DEMO_HAR_PAYLOAD, DEMO_HAR_FILENAME } from "@/lib/demoHar";

interface HarImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportHar: (rawHar: string, fileName: string) => Promise<void>;
  isProcessing?: boolean;
}

export default function HarImportModal({
  isOpen,
  onClose,
  onImportHar,
  isProcessing = false,
}: HarImportModalProps) {
  const [activeTab, setActiveTab] = useState<"drop" | "paste">("drop");
  const [pastedJson, setPastedJson] = useState("");
  const [dragActive, setDragActive] = useState(false);
  const [selectedFileName, setSelectedFileName] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  if (!isOpen) return null;

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
    setError(null);

    const file = e.dataTransfer.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setError(null);
    const file = e.target.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const processFile = async (file: File) => {
    setSelectedFileName(file.name);
    if (file.size > 50 * 1024 * 1024) {
      setError(
        `File size (${(file.size / (1024 * 1024)).toFixed(1)}MB) exceeds the 50MB safe ingestion limit. Please record a focused network trace or trim media assets.`,
      );
      return;
    }
    try {
      const text = await file.text();
      await onImportHar(text, file.name);
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to import .har file");
    }
  };

  const handlePasteSubmit = async () => {
    if (!pastedJson.trim()) return;
    setError(null);
    try {
      await onImportHar(pastedJson, "pasted-network-trace.har");
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to parse pasted HAR JSON");
    }
  };

  const handleLoadDemo = async () => {
    setError(null);
    try {
      await onImportHar(DEMO_HAR_PAYLOAD, DEMO_HAR_FILENAME);
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load demo trace");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/60">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-xl bg-gradient-to-tr from-indigo-600 to-cyan-500 text-white shadow-glow">
              <UploadCloud className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-base font-semibold text-slate-100">Import Network Trace (.har)</h2>
                <span className="px-2 py-0.5 text-[10px] uppercase font-bold tracking-wider bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-full">
                  Zero-Leak Scrubbing
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Transform Chrome / DevTools network recordings into organized API collections in 12s
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab switch */}
        <div className="flex items-center px-6 pt-4 border-b border-slate-800/80 bg-slate-950/30">
          <button
            onClick={() => setActiveTab("drop")}
            className={`pb-3 text-xs font-semibold px-4 border-b-2 transition-colors ${
              activeTab === "drop"
                ? "border-indigo-500 text-indigo-400"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            File Upload / Dropzone
          </button>
          <button
            onClick={() => setActiveTab("paste")}
            className={`pb-3 text-xs font-semibold px-4 border-b-2 transition-colors ${
              activeTab === "paste"
                ? "border-indigo-500 text-indigo-400"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            Paste Raw HAR JSON
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {error && (
            <div className="mb-4 p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {activeTab === "drop" ? (
            <div
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`relative border-2 border-dashed rounded-xl p-8 flex flex-col items-center justify-center text-center cursor-pointer transition-all ${
                dragActive
                  ? "border-indigo-400 bg-indigo-950/20 scale-[0.99]"
                  : "border-slate-700/80 hover:border-indigo-500/50 bg-slate-950/40 hover:bg-slate-950/70"
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".har,.json"
                onChange={handleFileChange}
                className="hidden"
              />

              <div className="w-14 h-14 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 mb-4 shadow-glow">
                <FileCode className="w-7 h-7" />
              </div>

              <h3 className="text-sm font-semibold text-slate-200 mb-1">
                {isProcessing ? "Processing & Sanitizing Trace..." : "Drag and drop your .har file here"}
              </h3>
              <p className="text-xs text-slate-400 max-w-sm mb-4">
                Exported from Chrome, Firefox, Safari, or Proxyman Network tab. Credentials and cookies are stripped automatically.
              </p>

              <button
                type="button"
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold shadow-lg shadow-indigo-600/20 transition-colors"
              >
                Browse .har File
              </button>

              {selectedFileName && (
                <div className="mt-4 text-xs text-indigo-300 font-mono">
                  Selected: {selectedFileName}
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              <textarea
                value={pastedJson}
                onChange={(e) => setPastedJson(e.target.value)}
                placeholder='Paste raw JSON starting with {"log": {"version": "1.2", "entries": [...]}}'
                rows={10}
                className="w-full p-3 bg-slate-950 border border-slate-800 rounded-xl font-mono text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-indigo-500 resize-none"
              />
              <button
                type="button"
                onClick={handlePasteSubmit}
                disabled={!pastedJson.trim() || isProcessing}
                className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-lg text-xs font-semibold transition-colors"
              >
                {isProcessing ? "Parsing and Scrubbing..." : "Parse & Cluster Collection"}
              </button>
            </div>
          )}

          {/* Quick Demo CTA */}
          <div className="mt-5 pt-4 border-t border-slate-800/80 flex items-center justify-between">
            <div className="flex items-center space-x-2 text-xs text-slate-400">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>HarSanitizer active: Tokens become <code className="text-indigo-300">{"{{SPECFORGE_AUTH_...}}"}</code></span>
            </div>
            <button
              type="button"
              onClick={handleLoadDemo}
              disabled={isProcessing}
              className="flex items-center space-x-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-indigo-300 hover:text-indigo-200 rounded-lg text-xs font-medium border border-slate-700 transition-colors"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>Load Demo .har Trace</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
