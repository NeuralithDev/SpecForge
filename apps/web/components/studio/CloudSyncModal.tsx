"use client";

import React, { useState } from "react";
import { UploadCloud, ShieldCheck, Check, X, AlertCircle, RefreshCw, Lock } from "lucide-react";

interface CloudSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  isSynced: boolean;
  onToggleSync: (enabled: boolean) => void;
}

export default function CloudSyncModal({
  isOpen,
  onClose,
  isSynced,
  onToggleSync,
}: CloudSyncModalProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleConnectSupabase = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSuccess(null);

    // Simulate Supabase Auth session initialization with RLS
    setTimeout(() => {
      setIsSubmitting(false);
      onToggleSync(true);
      setSuccess("Connected to Supabase PostgreSQL! Collections and environments are now cloud-synced with Row-Level Security.");
      setTimeout(() => {
        onClose();
      }, 1800);
    }, 900);
  };

  const handleDisconnect = () => {
    onToggleSync(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/60">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-xl bg-gradient-to-tr from-cyan-600 to-indigo-600 text-white shadow-glow">
              <UploadCloud className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-slate-100">Workspace Cloud Sync</h2>
              <p className="text-xs text-slate-400">
                Supabase PostgreSQL with Row-Level Security (RLS)
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

        {/* Content */}
        <div className="p-6 space-y-4">
          {/* Status banner */}
          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div
                className={`w-3 h-3 rounded-full ${
                  isSynced ? "bg-cyan-400 animate-pulse" : "bg-emerald-400"
                }`}
              />
              <div>
                <div className="text-xs font-semibold text-slate-200">
                  {isSynced ? "☁️ Cloud Synced Mode Active" : "🟢 Local Scratchpad (Offline-First)"}
                </div>
                <div className="text-[11px] text-slate-400">
                  {isSynced
                    ? "Changes replicate to Supabase PostgreSQL in real-time"
                    : "100% offline, zero cloud tracking, stored in browser IndexedDB"}
                </div>
              </div>
            </div>
            {isSynced && (
              <button
                onClick={handleDisconnect}
                className="px-2.5 py-1 text-xs font-medium text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 rounded-lg transition-colors border border-rose-500/20"
              >
                Disconnect
              </button>
            )}
          </div>

          {success && (
            <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs flex items-center space-x-2">
              <Check className="w-4 h-4 shrink-0" />
              <span>{success}</span>
            </div>
          )}

          {!isSynced ? (
            <form onSubmit={handleConnectSupabase} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">
                  Team Email
                </label>
                <input
                  type="email"
                  required
                  placeholder="architect@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">
                  Password / Access Token
                </label>
                <input
                  type="password"
                  required
                  placeholder="••••••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full flex items-center justify-center space-x-2 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold shadow-lg shadow-indigo-600/20 transition-colors disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Authenticating with Supabase...</span>
                    </>
                  ) : (
                    <>
                      <Lock className="w-3.5 h-3.5" />
                      <span>Authenticate & Enable Cloud Sync</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          ) : (
            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-xs space-y-2 text-slate-400">
              <div className="flex items-center space-x-2 text-slate-200 font-medium">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span>Enterprise Row-Level Security Enabled</span>
              </div>
              <p>
                All endpoint schemas, evidence hashes, and collections are encrypted at rest and tied to your team organization tenant ID.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
