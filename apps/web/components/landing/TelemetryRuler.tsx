"use client";

import React, { useEffect, useState } from "react";

interface TelemetryRulerProps {
  onLaunchStudio?: () => void;
}

export default function TelemetryRuler({ onLaunchStudio }: TelemetryRulerProps) {
  const [scrollPercent, setScrollPercent] = useState(0);
  const [activeSection, setActiveSection] = useState("FEATURES");

  useEffect(() => {
    const handleScroll = () => {
      const totalScroll = document.documentElement.scrollHeight - window.innerHeight;
      if (totalScroll <= 0) return;
      const currentScroll = window.scrollY;
      const pct = Math.min(Math.max(Math.round((currentScroll / totalScroll) * 100), 0), 100);
      setScrollPercent(pct);

      if (currentScroll < 600) {
        setActiveSection("HERO");
      } else if (currentScroll < 1800) {
        setActiveSection("FEATURES");
      } else if (currentScroll < 2800) {
        setActiveSection("PROVENANCE");
      } else {
        setActiveSection("GET STARTED");
      }
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const scaleMarks = [0, 5, 10, 15, 20, 25, 30, 35, 40];

  return (
    <>
      {/* Right-Edge Scroll Ruler */}
      <div className="fixed right-0 top-14 bottom-0 w-10 border-l border-[#1E1F24] z-40 hidden lg:flex flex-col justify-between py-6 pointer-events-none select-none bg-[#0B0C0E]/40 backdrop-blur-[2px]">
        {/* Scale Numbers & Ticks */}
        <div className="flex flex-col justify-between h-full w-full relative">
          {scaleMarks.map((mark) => (
            <div key={mark} className="flex items-center justify-between px-1.5 w-full">
              <span className="font-mono text-[9px] text-zinc-600">
                {mark < 10 ? `0${mark}` : mark}
              </span>
              <div className="w-2.5 h-[1px] bg-[#222328]" />
            </div>
          ))}

          {/* Dynamic Laser Indicator Line */}
          <div
            className="absolute right-0 w-full flex items-center justify-end transition-all duration-75"
            style={{ top: `${scrollPercent}%` }}
          >
            <div className="w-4 h-[1.5px] bg-[#3b82f6] shadow-[0_0_8px_#3b82f6]" />
          </div>
        </div>

        {/* Live Scroll Percentage Output */}
        <div className="px-1 pt-3 text-center border-t border-[#1E1F24]">
          <span className="font-mono text-[9px] font-semibold tracking-wider text-blue-400">
            {scrollPercent < 10 ? `00${scrollPercent}` : scrollPercent < 100 ? `0${scrollPercent}` : "100"}%
          </span>
        </div>
      </div>

      {/* Bottom-Right Floating Section Index */}
      <div className="fixed right-12 bottom-6 z-40 hidden lg:flex flex-col items-end gap-1.5 font-mono text-[11px] tracking-[0.15em] uppercase select-none">
        <a
          href="#features"
          className={`transition-colors ${
            activeSection === "FEATURES"
              ? "text-zinc-100 font-semibold"
              : "text-zinc-600 hover:text-zinc-400"
          }`}
        >
          01 / FEATURES
        </a>
        <a
          href="#provenance"
          className={`transition-colors ${
            activeSection === "PROVENANCE"
              ? "text-zinc-100 font-semibold"
              : "text-zinc-600 hover:text-zinc-400"
          }`}
        >
          02 / PROVENANCE
        </a>
        <button
          type="button"
          onClick={onLaunchStudio}
          className="text-zinc-600 hover:text-white transition-colors cursor-pointer text-right"
        >
          03 / STUDIO IDE &rarr;
        </button>
        <a
          href="#get-started"
          className={`transition-colors ${
            activeSection === "GET STARTED"
              ? "text-zinc-100 font-semibold"
              : "text-zinc-600 hover:text-zinc-400"
          }`}
        >
          04 / GET STARTED
        </a>
      </div>
    </>
  );
}
