"use client";

import React from "react";
import { ArrowRight, Play, ShieldCheck, Check, X } from "lucide-react";

interface ArchitecturalComparisonProps {
  onLaunchStudio: () => void;
  onRunLiveDemo: () => void;
}

export default function ArchitecturalComparison({
  onLaunchStudio,
  onRunLiveDemo,
}: ArchitecturalComparisonProps) {
  return (
    <section id="provenance" className="bg-[#0B0C0E] text-zinc-100 border-b border-[#222328]">
      {/* Top Metadata Strip */}
      <div className="border-b border-[#222328] px-8 py-3 flex justify-between font-mono text-[11px] tracking-[0.2em] text-zinc-400 uppercase select-none">
        <span>02 / PROVENANCE &amp; CAPABILITIES</span>
        <span>ZERO COMPETITOR VENDOR LOCK-IN</span>
      </div>

      {/* Section Header */}
      <div className="px-8 py-16 flex flex-col lg:flex-row justify-between items-start border-b border-[#222328] gap-6">
        <div className="max-w-2xl">
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-white font-sans leading-[1.12]">
            Built for Deterministic API Engineering
          </h2>
          <p className="text-zinc-400 text-base md:text-lg mt-4 leading-relaxed font-normal">
            Compare SpecForge Studio against cloud-locked API clients and brittle manual browser scrapers.
          </p>
        </div>

        <div className="text-left lg:text-right font-mono uppercase self-start">
          <div className="text-[11px] text-zinc-400 tracking-[0.22em] mb-1">SPECFORGE</div>
          <div className="text-2xl font-black tracking-[0.18em] text-zinc-200">VERIFICATION</div>
        </div>
      </div>

      {/* Comparison Table */}
      <div className="px-6 lg:px-8 py-16 max-w-6xl mx-auto">
        <div className="border border-[#222328] bg-[#0E0F13] overflow-x-auto shadow-2xl">
          <table className="w-full text-left border-collapse font-mono text-xs">
            <thead>
              <tr className="border-b border-[#222328] bg-[#111216] text-zinc-400 uppercase tracking-wider text-[11px]">
                <th className="p-4.5 border-r border-[#222328] font-semibold">Capability</th>
                <th className="p-4.5 border-r border-[#222328] text-white bg-white/5 font-bold">
                  SpecForge Studio
                </th>
                <th className="p-4.5 border-r border-[#222328]">Cloud-Locked API Clients</th>
                <th className="p-4.5">Manual Browser Scrapers</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#222328] text-zinc-300 text-[11px]">
              <tr>
                <td className="p-4.5 border-r border-[#222328] font-medium text-white">
                  Offline-First Scratchpad
                </td>
                <td className="p-4.5 border-r border-[#222328] bg-white/5 text-emerald-400 font-semibold flex items-center gap-1.5">
                  <Check className="w-3.5 h-3.5" strokeWidth={2.5} />
                  100% Local (Zero Login)
                </td>
                <td className="p-4.5 border-r border-[#222328] text-rose-400 flex items-center gap-1.5">
                  <X className="w-3.5 h-3.5" strokeWidth={2.5} />
                  Deprecated / Cloud Forced
                </td>
                <td className="p-4.5 text-zinc-400">N/A (Code only)</td>
              </tr>
              <tr>
                <td className="p-4.5 border-r border-[#222328] font-medium text-white">
                  Instant .har &rarr; Claude MCP Server
                </td>
                <td className="p-4.5 border-r border-[#222328] bg-white/5 text-emerald-400 font-semibold">
                  ✓ 12-Second Compiler
                </td>
                <td className="p-4.5 border-r border-[#222328] text-zinc-400">✗ Not Supported</td>
                <td className="p-4.5 text-zinc-400">Manual (Hours of work)</td>
              </tr>
              <tr>
                <td className="p-4.5 border-r border-[#222328] font-medium text-white">
                  Edge Secret Scrubbing (HarSanitizer)
                </td>
                <td className="p-4.5 border-r border-[#222328] bg-white/5 text-emerald-400 font-semibold">
                  ✓ Real-time Local (0.4ms)
                </td>
                <td className="p-4.5 border-r border-[#222328] text-rose-400">✗ Uploads raw to cloud</td>
                <td className="p-4.5 text-rose-400">✗ Raw trace dumped</td>
              </tr>
              <tr>
                <td className="p-4.5 border-r border-[#222328] font-medium text-white">
                  Deterministic SHA-256 Provenance
                </td>
                <td className="p-4.5 border-r border-[#222328] bg-white/5 text-emerald-400 font-semibold">
                  ✓ Cryptographically Anchored
                </td>
                <td className="p-4.5 border-r border-[#222328] text-zinc-400">✗ None</td>
                <td className="p-4.5 text-zinc-400">✗ None</td>
              </tr>
              <tr>
                <td className="p-4.5 border-r border-[#222328] font-medium text-white">
                  TypeScript SDK + Vitest Suite
                </td>
                <td className="p-4.5 border-r border-[#222328] bg-white/5 text-emerald-400 font-semibold">
                  ✓ Automated 1-Click ZIP
                </td>
                <td className="p-4.5 border-r border-[#222328] text-zinc-400">Paid Add-on</td>
                <td className="p-4.5 text-zinc-400">Manual</td>
              </tr>
              <tr>
                <td className="p-4.5 border-r border-[#222328] font-medium text-white">
                  Free Tier Limits
                </td>
                <td className="p-4.5 border-r border-[#222328] bg-white/5 text-zinc-200 font-semibold">
                  25 Endpoints Free Forever
                </td>
                <td className="p-4.5 border-r border-[#222328] text-zinc-400">Aggressive workspace limits</td>
                <td className="p-4.5 text-zinc-400">Free / Open source</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Bottom CTA Section */}
      <div id="get-started" className="border-t border-[#222328] py-20 px-6 text-center bg-[#0B0C0E]">
        <div className="max-w-2xl mx-auto">
          <div className="text-[11px] font-mono tracking-[0.22em] text-zinc-400 uppercase mb-3">
            04 / GET STARTED
          </div>
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4 font-sans">
            Ready to build MCP servers in 12 seconds?
          </h2>
          <p className="text-base text-zinc-400 mb-8 leading-relaxed font-normal">
            No credit card. No login required. Work offline or import your first <code className="text-zinc-200 font-mono bg-[#111216] px-1.5 py-0.5 border border-[#222328]">.har</code> trace right now.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <button
              id="btn-launch-bottom-cta"
              type="button"
              onClick={() => {
                if (typeof window !== "undefined") window.location.hash = "studio";
                onLaunchStudio();
              }}
              className="w-full sm:w-auto px-7 py-3.5 bg-white text-black hover:bg-zinc-200 font-mono text-xs uppercase tracking-[0.16em] font-semibold transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-lg"
            >
              <span>LAUNCH STUDIO FREE</span>
              <ArrowRight className="w-3.5 h-3.5" strokeWidth={2.5} />
            </button>

            <button
              id="btn-demo-bottom-cta"
              type="button"
              onClick={() => {
                if (typeof window !== "undefined") window.location.hash = "studio";
                onRunLiveDemo();
              }}
              className="w-full sm:w-auto px-7 py-3.5 bg-[#111216] text-zinc-200 border border-[#2C2D35] hover:border-zinc-500 font-mono text-xs uppercase tracking-[0.16em] transition-colors flex items-center justify-center gap-2 cursor-pointer"
            >
              <Play className="w-3.5 h-3.5 text-zinc-400" strokeWidth={2} />
              <span>RUN 12S LIVE DEMO</span>
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
