"use client";

import React, { useState, useEffect } from "react";
import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";
import { ArrowRight, Play, ShieldCheck, Bot, FileCode, CheckCircle2, Cpu } from "lucide-react";

interface OrbitalHeroProps {
  onLaunchStudio: () => void;
  onRunLiveDemo: () => void;
}

export default function OrbitalHero({
  onLaunchStudio,
  onRunLiveDemo,
}: OrbitalHeroProps) {
  // Mouse parallax motion values
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  const springConfig = { damping: 25, stiffness: 120 };
  const smoothX = useSpring(mouseX, springConfig);
  const smoothY = useSpring(mouseY, springConfig);

  // Parallax offsets for different orbital layers
  const cardOffset1X = useTransform(smoothX, [-500, 500], [-18, 18]);
  const cardOffset1Y = useTransform(smoothY, [-500, 500], [-14, 14]);

  const cardOffset2X = useTransform(smoothX, [-500, 500], [22, -22]);
  const cardOffset2Y = useTransform(smoothY, [-500, 500], [18, -18]);

  const cardOffset3X = useTransform(smoothX, [-500, 500], [-12, 12]);
  const cardOffset3Y = useTransform(smoothY, [-500, 500], [15, -15]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      const centerX = window.innerWidth / 2;
      const centerY = window.innerHeight / 2;
      mouseX.set(e.clientX - centerX);
      mouseY.set(e.clientY - centerY);
    };

    window.addEventListener("mousemove", handleMouseMove, { passive: true });
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, [mouseX, mouseY]);

  return (
    <section
      id="hero"
      className="relative min-h-[92vh] flex flex-col items-center justify-center text-center overflow-hidden bg-[#0B0C0E] px-6 py-20 border-b border-[#222328]"
    >
      {/* ------------------------------------------------------------------- */}
      {/* 1. CONCENTRIC ORBITAL RINGS & ROTATING LASER SPECTRUM ARCS */}
      {/* ------------------------------------------------------------------- */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none overflow-hidden z-0">
        {/* Ring 1 (Smallest Inner Orbit: 460px) */}
        <div className="absolute w-[460px] h-[460px] rounded-full border border-[#1A1B20]/80">
          <svg className="absolute inset-0 w-full h-full animate-[spin_40s_linear_infinite]" viewBox="0 0 460 460">
            <circle
              cx="230"
              cy="230"
              r="229"
              fill="none"
              stroke="url(#emeraldGradient)"
              strokeWidth="1.5"
              strokeDasharray="90 800"
              strokeLinecap="round"
            />
            <defs>
              <linearGradient id="emeraldGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#10b981" stopOpacity="0.85" />
                <stop offset="100%" stopColor="#10b981" stopOpacity="0" />
              </linearGradient>
            </defs>
          </svg>
        </div>

        {/* Ring 2 (Middle Orbit: 720px) */}
        <div className="absolute w-[720px] h-[720px] rounded-full border border-[#1A1B20]/70">
          <svg className="absolute inset-0 w-full h-full animate-[spin_55s_linear_infinite_reverse]" viewBox="0 0 720 720">
            <circle
              cx="360"
              cy="360"
              r="359"
              fill="none"
              stroke="url(#amberGradient)"
              strokeWidth="1.5"
              strokeDasharray="140 1200"
              strokeLinecap="round"
            />
            <defs>
              <linearGradient id="amberGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.8" />
                <stop offset="100%" stopColor="#f59e0b" stopOpacity="0" />
              </linearGradient>
            </defs>
          </svg>
        </div>

        {/* Ring 3 (Outer Orbit: 980px) */}
        <div className="absolute w-[980px] h-[980px] rounded-full border border-[#1A1B20]/60">
          <svg className="absolute inset-0 w-full h-full animate-[spin_70s_linear_infinite]" viewBox="0 0 980 980">
            <circle
              cx="490"
              cy="490"
              r="489"
              fill="none"
              stroke="url(#violetGradient)"
              strokeWidth="1.5"
              strokeDasharray="180 1800"
              strokeLinecap="round"
            />
            <defs>
              <linearGradient id="violetGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#8b5cf6" stopOpacity="0.75" />
                <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0" />
              </linearGradient>
            </defs>
          </svg>
        </div>

        {/* Ring 4 (Deep Field Orbit: 1240px) */}
        <div className="absolute w-[1240px] h-[1240px] rounded-full border border-[#1A1B20]/40">
          <svg className="absolute inset-0 w-full h-full animate-[spin_90s_linear_infinite_reverse]" viewBox="0 0 1240 1240">
            <circle
              cx="620"
              cy="620"
              r="619"
              fill="none"
              stroke="url(#blueGradient)"
              strokeWidth="1.5"
              strokeDasharray="220 2200"
              strokeLinecap="round"
            />
            <defs>
              <linearGradient id="blueGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.75" />
                <stop offset="100%" stopColor="#3b82f6" stopOpacity="0" />
              </linearGradient>
            </defs>
          </svg>
        </div>

        {/* Radial vignette mask for crisp text contrast */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_#0B0C0E_28%,_transparent_75%)] pointer-events-none" />
      </div>

      {/* ------------------------------------------------------------------- */}
      {/* 2. 6 FLOATING DARK ARTIFACT WINDOWS ALONG THE ORBITS */}
      {/* ------------------------------------------------------------------- */}
      <div className="absolute inset-0 max-w-7xl mx-auto pointer-events-none z-10 hidden md:block">
        {/* Top Card: Live .har Packet Capture */}
        <motion.div
          style={{ x: cardOffset1X, y: cardOffset1Y }}
          className="absolute top-8 left-1/2 -translate-x-1/2 w-64 rounded-2xl border border-white/10 bg-[#121318]/90 backdrop-blur-md p-3.5 shadow-2xl text-left"
        >
          <div className="flex items-center justify-between pb-2 border-b border-white/[0.08] mb-2 font-mono text-[10px] text-zinc-400">
            <span className="flex items-center gap-1.5 text-emerald-400">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              RECORDED .HAR TRACE
            </span>
            <span className="text-zinc-500">38ms</span>
          </div>
          <div className="font-mono text-xs text-zinc-200 truncate">
            <span className="text-amber-400 font-bold mr-1.5">POST</span>
            /v1/payment_intents
          </div>
          <div className="mt-1 flex items-center justify-between font-mono text-[10px] text-zinc-500">
            <span>Status: 200 OK</span>
            <span className="text-zinc-400">application/json</span>
          </div>
        </motion.div>

        {/* Mid-Left Card: HarSanitizer Shield */}
        <motion.div
          style={{ x: cardOffset2X, y: cardOffset2Y }}
          className="absolute top-1/3 left-4 lg:left-8 w-60 rounded-2xl border border-white/10 bg-[#121318]/90 backdrop-blur-md p-3.5 shadow-2xl text-left"
        >
          <div className="flex items-center justify-between pb-2 border-b border-white/[0.08] mb-2 font-mono text-[10px] text-zinc-400">
            <span className="flex items-center gap-1.5 text-zinc-300">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" strokeWidth={1.75} />
              HARSANITIZER SHIELD
            </span>
            <span className="text-emerald-400 font-semibold">0.4ms</span>
          </div>
          <div className="font-mono text-[11px] text-zinc-400 truncate">
            Auth: Bearer sk_live_...
          </div>
          <div className="mt-1 font-mono text-[11px] text-emerald-400 font-medium truncate">
            &rarr; &#123;&#123;STRIPE_KEY&#125;&#125;
          </div>
        </motion.div>

        {/* Mid-Right Card: Claude MCP Tool */}
        <motion.div
          style={{ x: cardOffset3X, y: cardOffset3Y }}
          className="absolute top-1/3 right-4 lg:right-8 w-64 rounded-2xl border border-white/10 bg-[#121318]/90 backdrop-blur-md p-3.5 shadow-2xl text-left"
        >
          <div className="flex items-center justify-between pb-2 border-b border-white/[0.08] mb-2 font-mono text-[10px] text-zinc-400">
            <span className="flex items-center gap-1.5 text-violet-400">
              <Bot className="w-3.5 h-3.5 text-violet-400" strokeWidth={1.75} />
              CLAUDE MCP TOOL
            </span>
            <span className="text-zinc-500">JSON-RPC</span>
          </div>
          <div className="font-mono text-[11px] text-zinc-300 truncate">
            server.tool(&quot;create_charge&quot;)
          </div>
          <div className="mt-1 font-mono text-[10px] text-zinc-500">
            Schema: Zod.object(&#123; amount &#125;)
          </div>
        </motion.div>

        {/* Bottom-Left Card: Epistemic Anchor */}
        <motion.div
          style={{ x: cardOffset1X, y: cardOffset3Y }}
          className="absolute bottom-12 left-8 lg:left-16 w-60 rounded-2xl border border-white/10 bg-[#121318]/90 backdrop-blur-md p-3.5 shadow-2xl text-left"
        >
          <div className="flex items-center justify-between pb-2 border-b border-white/[0.08] mb-2 font-mono text-[10px] text-zinc-400">
            <span className="flex items-center gap-1.5 text-zinc-300">
              <Cpu className="w-3.5 h-3.5 text-blue-400" strokeWidth={1.75} />
              EPISTEMIC ANCHOR
            </span>
            <span className="text-blue-400 font-semibold">0 Halluc.</span>
          </div>
          <div className="font-mono text-[10px] text-zinc-400 truncate">
            SHA-256: 8f4a1c...91e3
          </div>
          <div className="mt-1 font-mono text-[10px] text-emerald-400">
            ✓ Anchored to network trace
          </div>
        </motion.div>

        {/* Bottom-Right Card: TypeScript SDK */}
        <motion.div
          style={{ x: cardOffset2X, y: cardOffset1Y }}
          className="absolute bottom-12 right-8 lg:right-16 w-64 rounded-2xl border border-white/10 bg-[#121318]/90 backdrop-blur-md p-3.5 shadow-2xl text-left"
        >
          <div className="flex items-center justify-between pb-2 border-b border-white/[0.08] mb-2 font-mono text-[10px] text-zinc-400">
            <span className="flex items-center gap-1.5 text-amber-400">
              <FileCode className="w-3.5 h-3.5 text-amber-400" strokeWidth={1.75} />
              TYPESCRIPT SDK
            </span>
            <span className="text-zinc-500">Strict</span>
          </div>
          <div className="font-mono text-[11px] text-zinc-200 truncate">
            await stripe.createCharge()
          </div>
          <div className="mt-1 font-mono text-[10px] text-zinc-500">
            amount: 4999 · currency: &quot;usd&quot;
          </div>
        </motion.div>

        {/* Far-Right Outline Ghost Slot for Depth */}
        <div className="absolute top-1/4 right-0 w-44 h-28 rounded-2xl border border-white/[0.05] bg-transparent pointer-events-none hidden xl:block" />
      </div>

      {/* ------------------------------------------------------------------- */}
      {/* 3. CENTER HERO TYPOGRAPHY LOCKUP */}
      {/* ------------------------------------------------------------------- */}
      <div className="relative z-20 max-w-4xl mx-auto flex flex-col items-center">
        {/* Massive Wide-Tracked Display Wordmark */}
        <h1 className="text-6xl sm:text-7xl md:text-[84px] font-black tracking-[0.18em] text-white leading-none select-none uppercase font-sans">
          SPECFORGE
        </h1>

        {/* Editorial Mixed-Font Subtitle (Directly Below) */}
        <div className="mt-4 flex flex-wrap items-center justify-center gap-x-3 text-3xl sm:text-4xl md:text-5xl">
          <span className="font-bold text-white tracking-tight font-sans">
            Deterministic tools
          </span>
          <span className="font-editorial text-zinc-300 font-normal">
            for engineers.
          </span>
        </div>

        {/* Centered Description Paragraph */}
        <p className="max-w-xl text-zinc-400 text-base md:text-lg leading-relaxed mt-5 font-normal">
          SpecForge builds local-first API &amp; MCP compilers for engineers. We pride ourselves on cryptographic accuracy, zero cloud lock-in, and instant synthesis.
        </p>

        {/* Dual Sharp Rectangular CTA Buttons */}
        <div className="mt-8 flex flex-col sm:flex-row items-center gap-4 w-full sm:w-auto">
          {/* Button 1: Solid White Sharp Block */}
          <button
            id="btn-launch-studio-hero"
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

          {/* Button 2: Dark Bordered Sharp Block */}
          <button
            id="btn-run-demo-hero"
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

        {/* Bottom Micro-Metadata Bar */}
        <div className="mt-8 font-mono text-[10px] tracking-[0.22em] text-zinc-500 uppercase select-none">
          LOCAL-FIRST ENGINE &nbsp; · &nbsp; CLAUDE MCP · TYPESCRIPT · OPENAPI 3.1 &nbsp; · &nbsp; NO LOGIN REQUIRED
        </div>
      </div>
    </section>
  );
}
