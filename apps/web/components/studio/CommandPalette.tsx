"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  Search,
  Folder,
  UploadCloud,
  FileCode,
  Zap,
  Globe,
  Download,
  Terminal,
  Trash2,
  Cpu,
  Layers,
  ArrowRight,
  Sparkles,
} from "lucide-react";
import type { ApiRequest, ApiCollection, Environment } from "@/lib/localStore";
import { METHOD_COLORS } from "./Sidebar";

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  collections: ApiCollection[];
  requests: ApiRequest[];
  environments: Environment[];
  onSelectRequest: (requestId: string) => void;
  onOpenHarModal: () => void;
  onOpenCurlModal: () => void;
  onOpenEnvModal: () => void;
  onSelectEnvironment: (envId: string) => void;
  onOpenPricingModal: () => void;
  onExportZip: () => void;
  onResetWorkspace: () => void;
}

export default function CommandPalette({
  isOpen,
  onClose,
  collections,
  requests,
  environments,
  onSelectRequest,
  onOpenHarModal,
  onOpenCurlModal,
  onOpenEnvModal,
  onSelectEnvironment,
  onOpenPricingModal,
  onExportZip,
  onResetWorkspace,
}: CommandPaletteProps) {
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (isOpen) {
      setQuery("");
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  // Global shortcut: Escape to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  // Filter endpoints
  const matchingEndpoints = requests.filter((r) => {
    if (!query.trim()) return true;
    const q = query.toLowerCase();
    return (
      r.name.toLowerCase().includes(q) ||
      r.url.toLowerCase().includes(q) ||
      r.method.toLowerCase().includes(q)
    );
  }).slice(0, 8);

  // Quick actions
  const quickActions = [
    {
      id: "act_import_har",
      title: "Import .har Trace",
      subtitle: "Drag-and-drop Chrome network recordings with zero-leak secret scrubbing",
      icon: <UploadCloud className="w-4 h-4 text-indigo-400" />,
      action: () => {
        onClose();
        onOpenHarModal();
      },
    },
    {
      id: "act_import_curl",
      title: "Import cURL Command",
      subtitle: "Paste raw cURL or fetch snippet to populate active request",
      icon: <Terminal className="w-4 h-4 text-cyan-400" />,
      action: () => {
        onClose();
        onOpenCurlModal();
      },
    },
    {
      id: "act_export_mcp",
      title: "Export Full Workspace as Claude MCP Bundle",
      subtitle: "Download standalone zip containing TypeScript SDK, MCP server, and tests",
      icon: <Cpu className="w-4 h-4 text-purple-400" />,
      action: () => {
        onClose();
        onExportZip();
      },
    },
    {
      id: "act_manage_env",
      title: "Manage Environments & Variables",
      subtitle: "Edit {{BASE_URL}}, bearer tokens, and client secrets",
      icon: <Globe className="w-4 h-4 text-emerald-400" />,
      action: () => {
        onClose();
        onOpenEnvModal();
      },
    },
    {
      id: "act_upgrade",
      title: "Upgrade to Pro Builder (Quota Gate)",
      subtitle: "Unlock unlimited MCP compilations, Vitest suite exports, and cloud sync",
      icon: <Sparkles className="w-4 h-4 text-amber-400" />,
      action: () => {
        onClose();
        onOpenPricingModal();
      },
    },
    {
      id: "act_reset",
      title: "Reset Workspace to Fresh Demo State",
      subtitle: "Restore default Stripe and GitHub collections",
      icon: <Trash2 className="w-4 h-4 text-rose-400" />,
      action: () => {
        onClose();
        onResetWorkspace();
      },
    },
  ].filter((act) => {
    if (!query.trim()) return true;
    const q = query.toLowerCase();
    return act.title.toLowerCase().includes(q) || act.subtitle.toLowerCase().includes(q);
  });

  const totalItems = matchingEndpoints.length + quickActions.length;

  const handleKeyNav = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % Math.max(1, totalItems));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + totalItems) % Math.max(1, totalItems));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (selectedIndex < matchingEndpoints.length) {
        const req = matchingEndpoints[selectedIndex];
        if (req) {
          onSelectRequest(req.id);
          onClose();
        }
      } else {
        const actionIndex = selectedIndex - matchingEndpoints.length;
        const act = quickActions[actionIndex];
        if (act) act.action();
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-24 bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-150">
      <div
        className="w-full max-w-2xl bg-[#0f0f12] border border-white/10 rounded-2xl shadow-2xl overflow-hidden flex flex-col font-sans"
        onKeyDown={handleKeyNav}
      >
        {/* Search Input Bar */}
        <div className="flex items-center px-4 py-3.5 border-b border-white/10 bg-[#141418]">
          <Search className="w-4 h-4 text-slate-400 mr-3 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            placeholder="Type a command or search endpoints (e.g. 'charges', 'import', 'curl')..."
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            className="w-full bg-transparent text-sm text-slate-100 placeholder-slate-500 focus:outline-none"
          />
          <div className="flex items-center space-x-1 text-[10px] font-mono text-slate-500 px-1.5 py-0.5 rounded border border-white/10 bg-white/5">
            <span>ESC</span>
          </div>
        </div>

        {/* Results List */}
        <div className="max-h-[60vh] overflow-y-auto p-2 space-y-4">
          {/* Section 1: Endpoints */}
          {matchingEndpoints.length > 0 && (
            <div>
              <div className="px-3 py-1.5 text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
                API Endpoints ({matchingEndpoints.length})
              </div>
              <div className="space-y-0.5">
                {matchingEndpoints.map((req, idx) => {
                  const isSelected = selectedIndex === idx;
                  const methodStyle = METHOD_COLORS[req.method] || METHOD_COLORS.GET;
                  const col = collections.find((c) => c.id === req.collectionId);

                  return (
                    <div
                      key={req.id}
                      onClick={() => {
                        onSelectRequest(req.id);
                        onClose();
                      }}
                      onMouseEnter={() => setSelectedIndex(idx)}
                      className={`flex items-center justify-between px-3 py-2 rounded-xl cursor-pointer transition-colors ${
                        isSelected
                          ? "bg-violet-600/20 border border-violet-500/40 text-white"
                          : "text-slate-300 hover:bg-white/5 border border-transparent"
                      }`}
                    >
                      <div className="flex items-center space-x-2.5 truncate">
                        <span
                          className={`px-1.5 py-0.5 rounded text-[9px] font-mono font-bold uppercase border shrink-0 ${methodStyle.badge}`}
                        >
                          {req.method}
                        </span>
                        <span className="text-xs font-medium truncate">{req.name}</span>
                        <span className="text-[11px] font-mono text-slate-500 truncate max-w-[200px]">
                          {req.url}
                        </span>
                      </div>
                      <div className="flex items-center space-x-2 text-[10px] text-slate-500 font-mono shrink-0">
                        <span>{col?.name || "Collection"}</span>
                        <ArrowRight className="w-3 h-3 text-slate-600" />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Section 2: Quick Actions */}
          {quickActions.length > 0 && (
            <div>
              <div className="px-3 py-1.5 text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
                Studio Actions & Shortcuts
              </div>
              <div className="space-y-0.5">
                {quickActions.map((act, idx) => {
                  const globalIdx = matchingEndpoints.length + idx;
                  const isSelected = selectedIndex === globalIdx;

                  return (
                    <div
                      key={act.id}
                      onClick={act.action}
                      onMouseEnter={() => setSelectedIndex(globalIdx)}
                      className={`flex items-center justify-between px-3 py-2 rounded-xl cursor-pointer transition-colors ${
                        isSelected
                          ? "bg-violet-600/20 border border-violet-500/40 text-white"
                          : "text-slate-300 hover:bg-white/5 border border-transparent"
                      }`}
                    >
                      <div className="flex items-center space-x-3 truncate">
                        <div className="p-1.5 rounded-lg bg-white/5 border border-white/10 shrink-0">
                          {act.icon}
                        </div>
                        <div>
                          <div className="text-xs font-medium text-slate-200">{act.title}</div>
                          <div className="text-[11px] text-slate-500 truncate">{act.subtitle}</div>
                        </div>
                      </div>
                      <div className="text-[10px] text-slate-500 font-mono shrink-0 flex items-center space-x-1">
                        <span>Execute</span>
                        <ArrowRight className="w-3 h-3 text-slate-600" />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {matchingEndpoints.length === 0 && quickActions.length === 0 && (
            <div className="text-center py-10 text-slate-500 text-xs">
              No matching endpoints or commands found for &quot;{query}&quot;.
            </div>
          )}
        </div>

        {/* Footer Navigation Hints */}
        <div className="flex items-center justify-between px-4 py-2 border-t border-white/10 bg-[#141418] text-[11px] text-slate-500 font-mono">
          <div className="flex items-center space-x-3">
            <span>↑↓ Navigate</span>
            <span>↵ Select</span>
            <span>ESC Close</span>
          </div>
          <span className="text-violet-400">SpecForge Studio Universal Command</span>
        </div>
      </div>
    </div>
  );
}
