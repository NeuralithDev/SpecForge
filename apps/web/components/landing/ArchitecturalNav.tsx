"use client";

import React from "react";
import { ArrowRight, Activity } from "lucide-react";

interface ArchitecturalNavProps {
  activeSection?: string;
  onLaunchStudio: () => void;
  onOpenPricing?: () => void;
}

export default function ArchitecturalNav({
  activeSection = "home",
  onLaunchStudio,
  onOpenPricing,
}: ArchitecturalNavProps) {
  return (
    <nav className="h-14 border-b border-[#222328] bg-[#0B0C0E]/90 backdrop-blur-md sticky top-0 z-50 flex items-stretch">
      {/* Cell 1: Logo Box */}
      <div className="w-14 h-14 flex items-center justify-center border-r border-[#222328] flex-shrink-0 group cursor-pointer" onClick={onLaunchStudio}>
        <div className="w-7 h-7 bg-white text-black font-mono font-bold text-sm flex items-center justify-center tracking-tighter group-hover:bg-zinc-200 transition-colors">
          S
        </div>
      </div>

      {/* Cell 2: Primary Nav Links */}
      <div className="px-6 hidden md:flex items-center gap-6 border-r border-[#222328] font-mono text-[11px] tracking-[0.18em] uppercase flex-shrink-0">
        <a
          id="nav-link-home"
          href="#hero"
          className="bg-white text-black px-2.5 py-1 font-semibold transition-colors"
        >
          HOME
        </a>
        <a
          id="nav-link-compiler"
          href="#features"
          className="text-zinc-400 hover:text-white transition-colors"
        >
          COMPILER
        </a>
        <a
          id="nav-link-mcp"
          href="#features"
          className="text-zinc-400 hover:text-white transition-colors"
        >
          MCP SERVER
        </a>
        <a
          id="nav-link-why"
          href="#provenance"
          className="text-zinc-400 hover:text-white transition-colors"
        >
          Why SpecForge
        </a>
        <a
          id="nav-link-docs"
          href="https://github.com/NeuralithDev/SpecForge.git"
          target="_blank"
          rel="noreferrer"
          className="text-zinc-400 hover:text-white transition-colors"
        >
          DOCS
        </a>
      </div>

      {/* Cell 3: Context Label */}
      <div className="px-6 flex-1 hidden lg:flex items-center text-zinc-400 text-[11px] font-mono tracking-[0.2em] uppercase select-none">
        LOCAL-FIRST API &amp; MCP STUDIO
      </div>

      {/* Cell 4: Right Utility Cells */}
      <div className="flex items-stretch ml-auto">
        {/* Pricing link */}
        <button
          id="nav-btn-pricing"
          type="button"
          onClick={onOpenPricing}
          className="px-6 border-l border-[#222328] hidden sm:flex items-center font-mono text-[11px] tracking-[0.18em] uppercase text-zinc-400 hover:text-white transition-colors cursor-pointer"
        >
          PRICING
        </button>

        {/* GitHub link */}
        <a
          id="nav-link-github"
          href="https://github.com/NeuralithDev/SpecForge.git"
          target="_blank"
          rel="noreferrer"
          title="GitHub Repository"
          className="w-14 h-14 border-l border-[#222328] flex items-center justify-center text-zinc-400 hover:text-white transition-colors"
        >
          <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
            <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
          </svg>
        </a>

        {/* Offline Indicator */}
        <div
          title="100% Offline Engine: Ready"
          className="w-14 h-14 border-l border-[#222328] flex items-center justify-center text-zinc-400 relative"
        >
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
        </div>

        {/* Full-Height Solid White CTA Block */}
        <button
          id="nav-btn-launch-studio"
          type="button"
          onClick={() => {
            if (typeof window !== "undefined") window.location.hash = "studio";
            onLaunchStudio();
          }}
          className="h-14 px-7 bg-white text-black font-mono text-[11px] font-bold tracking-[0.18em] uppercase hover:bg-zinc-200 transition flex items-center gap-2 cursor-pointer border-l border-[#222328]"
        >
          <span>LAUNCH STUDIO</span>
          <ArrowRight className="w-3.5 h-3.5" strokeWidth={2} />
        </button>
      </div>
    </nav>
  );
}
