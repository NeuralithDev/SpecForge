"use client";

import React from "react";
import ArchitecturalNav from "./landing/ArchitecturalNav";
import TelemetryRuler from "./landing/TelemetryRuler";
import OrbitalHero from "./landing/OrbitalHero";
import ArchitecturalFeatureGrid from "./landing/ArchitecturalFeatureGrid";
import ArchitecturalComparison from "./landing/ArchitecturalComparison";

interface HeroExperienceProps {
  onLaunchStudio: () => void;
  onRunLiveDemo: () => void;
  onOpenPricing?: () => void;
}

export default function HeroExperience({
  onLaunchStudio,
  onRunLiveDemo,
  onOpenPricing,
}: HeroExperienceProps) {
  return (
    <div className="min-h-screen bg-[#0B0C0E] text-zinc-100 selection:bg-zinc-800 selection:text-white font-sans antialiased relative overflow-x-hidden">
      {/* 1. Structural Grid Navbar (Full-Bleed h-14 with vertical borders) */}
      <ArchitecturalNav
        onLaunchStudio={onLaunchStudio}
        onOpenPricing={onOpenPricing}
      />

      {/* 2. Fixed Right-Edge Telemetry Ruler & Section Index */}
      <TelemetryRuler onLaunchStudio={onLaunchStudio} />

      {/* 3. Orbital Hero Section (Concentric Rings, Floating Cards, Editorial Type) */}
      <OrbitalHero
        onLaunchStudio={onLaunchStudio}
        onRunLiveDemo={onRunLiveDemo}
      />

      {/* 4. Exposed-Border Architectural Feature Grid (01 to 06) */}
      <ArchitecturalFeatureGrid
        onLaunchStudio={onLaunchStudio}
        onRunLiveDemo={onRunLiveDemo}
      />

      {/* 5. Architectural Comparison Matrix & Provenance */}
      <ArchitecturalComparison
        onLaunchStudio={onLaunchStudio}
        onRunLiveDemo={onRunLiveDemo}
      />

      {/* 6. Architectural Footer */}
      <footer className="border-t border-[#222328] py-10 px-8 bg-[#0B0C0E] font-mono text-[11px] tracking-[0.18em] text-zinc-400 uppercase flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-5 h-5 bg-white text-black font-bold flex items-center justify-center text-[10px]">
            S
          </div>
          <span>SPECFORGE STUDIO · VERSION 5.0 · ARCHITECTURAL SYSTEM</span>
        </div>
        <div className="flex items-center gap-6">
          <a
            id="footer-link-github"
            href="https://github.com/NeuralithDev/SpecForge.git"
            target="_blank"
            rel="noreferrer"
            className="hover:text-white transition-colors"
          >
            GITHUB
          </a>
          <span>·</span>
          <span>LOCAL-FIRST ENGINE</span>
          <span>·</span>
          <span>MIT LICENSE</span>
        </div>
      </footer>
    </div>
  );
}
