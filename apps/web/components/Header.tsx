"use client";

import React, { useState } from "react";

interface HeaderProps {
  readonly targetSha256: string;
  readonly targetName: string;
  readonly quotaUsage?: {
    readonly currentUsage: number;
    readonly limit: number;
    readonly tier: string;
    readonly planId?: string;
  };
  readonly onOpenPricingModal?: () => void;
}

export default function Header({
  targetSha256,
  targetName,
  quotaUsage = { currentUsage: 0, limit: 1000000, tier: "enterprise", planId: "enterprise_annual" },
  onOpenPricingModal,
}: HeaderProps) {
  const [copied, setCopied] = useState(false);
  const [selectedOrg, setSelectedOrg] = useState("Acme Labs (org_9918)");

  const handleCopySha = () => {
    navigator.clipboard.writeText(targetSha256);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const isUnlimited = quotaUsage.limit >= 100000 || quotaUsage.tier === "enterprise";
  const usagePct = isUnlimited
    ? 10
    : Math.min(100, Math.round((quotaUsage.currentUsage / quotaUsage.limit) * 100));

  return (
    <header className="border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-xl sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand Logo & Name */}
        <div className="flex items-center space-x-3">
          <div className="relative flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-cyan-400 p-[1px] shadow-glow">
            <div className="w-full h-full bg-slate-950 rounded-[11px] flex items-center justify-center">
              <svg
                className="w-5 h-5 text-indigo-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 10V3L4 14h7v7l9-11h-7z"
                />
              </svg>
            </div>
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-xl font-extrabold tracking-tight bg-gradient-to-r from-white via-slate-200 to-indigo-300 bg-clip-text text-transparent">
                SpecForge
              </span>
              <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                Epistemic Engine
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Autonomous Reverse Engineering & Agent Integration
            </p>
          </div>
        </div>

        {/* Center Target Badge */}
        <div className="hidden lg:flex items-center space-x-2 px-3 py-1.5 rounded-lg bg-slate-900/90 border border-slate-800 text-xs">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
          <span className="text-slate-400 font-medium">Target:</span>
          <span className="text-slate-200 font-mono font-medium truncate max-w-[180px]">
            {targetName}
          </span>
          <button
            onClick={handleCopySha}
            title="Copy SHA-256 Digest"
            className="text-slate-400 hover:text-indigo-400 transition-colors ml-1"
          >
            {copied ? (
              <span className="text-emerald-400 font-bold">✓ Copied</span>
            ) : (
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                />
              </svg>
            )}
          </button>
        </div>

        {/* Right Section: Quota Meter + Tenant + Upgrade */}
        <div className="flex items-center space-x-3">
          {/* Live Quota Usage Meter */}
          <div
            onClick={onOpenPricingModal}
            className="cursor-pointer group flex items-center space-x-2.5 px-3 py-1.5 rounded-xl bg-slate-900/90 hover:bg-slate-800/90 border border-slate-800 hover:border-indigo-500/40 transition-all text-xs"
          >
            <div className="flex flex-col">
              <div className="flex items-center space-x-1.5 text-[11px]">
                <span className="font-semibold text-slate-300 font-mono">
                  {isUnlimited
                    ? "∞ Unlimited"
                    : `${quotaUsage.currentUsage} / ${quotaUsage.limit} Endpoints`}
                </span>
                <span className="text-[10px] uppercase font-bold text-indigo-400 bg-indigo-500/10 px-1.5 rounded border border-indigo-500/20">
                  {quotaUsage.tier}
                </span>
              </div>
              {!isUnlimited && (
                <div className="w-28 h-1 bg-slate-800 rounded-full mt-1 overflow-hidden">
                  <div
                    className={`h-full transition-all ${
                      usagePct > 80
                        ? "bg-rose-500"
                        : usagePct > 50
                        ? "bg-amber-400"
                        : "bg-indigo-400"
                    }`}
                    style={{ width: `${usagePct}%` }}
                  />
                </div>
              )}
            </div>

            <button
              onClick={(e) => {
                e.stopPropagation();
                if (onOpenPricingModal) onOpenPricingModal();
              }}
              className="text-[11px] font-bold px-2 py-1 rounded-lg bg-gradient-to-r from-indigo-600 to-cyan-500 hover:from-indigo-500 hover:to-cyan-400 text-white shadow-glow transition-all"
            >
              {isUnlimited ? "Free Test Mode" : "Upgrade"}
            </button>
          </div>

          {/* Multi-Tenant Org Switcher */}
          <div className="hidden sm:flex items-center space-x-2 bg-slate-900/60 border border-slate-800 rounded-lg px-2.5 py-1 text-xs">
            <span className="text-slate-400">Tenant:</span>
            <select
              value={selectedOrg}
              onChange={(e) => setSelectedOrg(e.target.value)}
              className="bg-transparent text-slate-200 font-medium focus:outline-none cursor-pointer"
            >
              <option value="Acme Labs (org_9918)" className="bg-slate-900">
                Acme Labs
              </option>
              <option value="DefenseSec Cloud (org_4421)" className="bg-slate-900">
                DefenseSec
              </option>
              <option value="InterOp Health (org_1109)" className="bg-slate-900">
                InterOp Health
              </option>
            </select>
          </div>
        </div>
      </div>
    </header>
  );
}
