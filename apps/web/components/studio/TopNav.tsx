"use client";

import React, { useState } from "react";
import { motion } from "framer-motion";
import {
  UploadCloud,
  Globe,
  ChevronDown,
  Settings,
  Zap,
  Search,
  Terminal,
  Cpu,
  Layers,
} from "lucide-react";
import type { Environment } from "@/lib/localStore";

export type WorkspaceMode = "builder" | "mcp" | "trace";

interface TopNavProps {
  currentMode: WorkspaceMode;
  onSelectMode: (mode: WorkspaceMode) => void;
  activeCollectionName?: string;
  environments: Environment[];
  activeEnvironmentId: string | null;
  onSelectEnvironment: (id: string) => void;
  onOpenEnvModal: () => void;
  onOpenHarModal: () => void;
  onOpenCommandPalette: () => void;
  onSwitchToHero?: () => void;
  isProcessingHar?: boolean;
}

export default function TopNav({
  currentMode,
  onSelectMode,
  activeCollectionName,
  environments,
  activeEnvironmentId,
  onSelectEnvironment,
  onOpenEnvModal,
  onOpenHarModal,
  onOpenCommandPalette,
  onSwitchToHero,
  isProcessingHar = false,
}: TopNavProps) {
  const [envDropdownOpen, setEnvDropdownOpen] = useState(false);

  const activeEnv = environments.find((e) => e.id === activeEnvironmentId) || environments[0];

  const modes: { id: WorkspaceMode; label: string; icon: React.ComponentType<{ className?: string; strokeWidth?: number | string }> }[] = [
    { id: "builder", label: "Request Builder", icon: Terminal },
    { id: "mcp", label: "Code & MCP Studio", icon: Cpu },
    { id: "trace", label: "Trace Inspector (.har)", icon: Layers },
  ];

  return (
    <header className="h-14 border-b border-[#222328] bg-[#0B0C0E] px-4 flex items-center justify-between z-30 select-none">
      {/* ZONE 1: LEFT - SpecForge Wordmark + Active Collection Breadcrumb */}
      <div className="flex items-center space-x-3 shrink-0">
        <button
          type="button"
          onClick={onSwitchToHero}
          className="flex items-center space-x-2 text-left hover:opacity-85 transition-opacity cursor-pointer group"
          title="Return to Landing Overview"
        >
          <div className="w-7 h-7 bg-white text-black font-mono font-bold text-xs flex items-center justify-center tracking-tighter">
            S
          </div>
          <span className="text-xs font-mono font-bold tracking-[0.16em] text-zinc-100 uppercase">
            SpecForge
          </span>
        </button>

        {activeCollectionName && (
          <div className="hidden sm:flex items-center space-x-2 text-xs">
            <span className="text-zinc-600 font-mono">/</span>
            <span className="text-zinc-400 font-mono text-[11px] truncate max-w-[180px]">
              {activeCollectionName}
            </span>
          </div>
        )}
      </div>

      {/* ZONE 2: CENTER - Framer Motion Segmented Workspace Switcher */}
      <nav className="flex items-center bg-[#0E0F13] p-1 border border-[#222328] space-x-1">
        {modes.map((mode) => {
          const isActive = currentMode === mode.id;
          const Icon = mode.icon;

          return (
            <button
              key={mode.id}
              id={`btn-mode-${mode.id}`}
              type="button"
              onClick={() => onSelectMode(mode.id)}
              className={`relative px-3 py-1.5 text-[11px] font-mono tracking-[0.14em] uppercase transition-colors flex items-center space-x-2 cursor-pointer ${
                isActive ? "text-white font-semibold" : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              {isActive && (
                <motion.div
                  layoutId="activeWorkspaceTab"
                  className="absolute inset-0 bg-[#16171D] border border-[#2A2B33] shadow-sm"
                  transition={{ type: "spring", stiffness: 450, damping: 35 }}
                />
              )}
              <span className="relative z-10 flex items-center space-x-1.5">
                <Icon className="w-3.5 h-3.5" strokeWidth={1.75} />
                <span className="hidden md:inline">{mode.label}</span>
              </span>
            </button>
          );
        })}
      </nav>

      {/* ZONE 3: RIGHT - Command Search Trigger + Environment Selector + Import .har */}
      <div className="flex items-center space-x-2 shrink-0">
        {/* Command Search Trigger (Cmd + K) */}
        <button
          type="button"
          onClick={onOpenCommandPalette}
          className="flex items-center space-x-2 px-2.5 py-1.5 rounded-lg bg-[#16161A] hover:bg-[#1C1C21] border border-[#232329] text-xs text-zinc-400 hover:text-zinc-200 transition-colors shadow-sm cursor-pointer"
        >
          <Search className="w-3.5 h-3.5 text-zinc-500" strokeWidth={1.75} />
          <span className="hidden lg:inline text-[11px]">Search or paste cURL...</span>
          <kbd className="text-[10px] font-mono text-zinc-400 bg-zinc-800/60 px-1.5 py-0.5 rounded border border-[#232329]">
            ⌘K
          </kbd>
        </button>

        {/* Environment Dropdown */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setEnvDropdownOpen(!envDropdownOpen)}
            className="flex items-center space-x-1.5 px-2.5 py-1.5 text-xs font-medium bg-[#16161A] hover:bg-[#1C1C21] border border-[#232329] rounded-lg text-zinc-300 transition-colors cursor-pointer"
          >
            <Globe className="w-3.5 h-3.5 text-zinc-400" strokeWidth={1.75} />
            <span className="font-mono text-zinc-300 max-w-[130px] truncate text-[11px]">
              {activeEnv?.name ?? "Production"}
            </span>
            <ChevronDown className="w-3 h-3 text-zinc-500" strokeWidth={1.75} />
          </button>

          {envDropdownOpen && (
            <div className="absolute right-0 mt-1.5 w-56 bg-[#16161A] border border-[#232329] rounded-lg shadow-xl py-1 z-50 animate-in fade-in duration-100">
              <div className="px-3 py-1 text-[10px] font-semibold text-zinc-500 uppercase tracking-wider font-mono">
                Environment
              </div>
              {environments.map((env) => (
                <button
                  key={env.id}
                  onClick={() => {
                    onSelectEnvironment(env.id);
                    setEnvDropdownOpen(false);
                  }}
                  className={`w-full text-left px-3 py-1.5 text-xs flex items-center justify-between hover:bg-[#1C1C21] transition-colors cursor-pointer ${
                    env.id === activeEnvironmentId ? "text-zinc-100 font-semibold" : "text-zinc-400"
                  }`}
                >
                  <span className="truncate">{env.name}</span>
                  <span className="text-[10px] text-zinc-500 font-mono">
                    {env.variables.length} vars
                  </span>
                </button>
              ))}
              <div className="border-t border-[#232329] my-1" />
              <button
                onClick={() => {
                  setEnvDropdownOpen(false);
                  onOpenEnvModal();
                }}
                className="w-full text-left px-3 py-1.5 text-xs text-zinc-300 hover:bg-[#1C1C21] flex items-center space-x-2 cursor-pointer"
              >
                <Settings className="w-3.5 h-3.5" strokeWidth={1.75} />
                <span>Manage Environments...</span>
              </button>
            </div>
          )}
        </div>

        {/* Clean Secondary Import .har Button */}
        <button
          type="button"
          onClick={onOpenHarModal}
          disabled={isProcessingHar}
          className="flex items-center space-x-1.5 px-3 py-1.5 text-xs font-medium bg-[#18181C] hover:bg-[#222228] text-zinc-200 border border-[#2A2A32] rounded-lg transition-colors cursor-pointer"
        >
          <UploadCloud className="w-3.5 h-3.5 text-zinc-400" strokeWidth={1.75} />
          <span className="hidden sm:inline">Import .har</span>
        </button>
      </div>
    </header>
  );
}
