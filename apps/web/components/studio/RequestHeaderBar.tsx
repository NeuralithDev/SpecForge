"use client";

import React, { useState, useEffect } from "react";
import {
  Send,
  Plus,
  X,
  Terminal,
  Check,
  ShieldCheck,
  Columns,
  Rows,
  RefreshCw,
  Globe,
  Layers,
} from "lucide-react";
import type {
  ApiRequest,
  ApiCollection,
  HttpMethod,
  Environment,
} from "@/lib/localStore";
import { interpolateVariables } from "@/lib/localStore";
import { serializeToCurl, parseCurlCommand } from "@/lib/curlParser";
import { METHOD_COLORS } from "./Sidebar";

interface RequestHeaderBarProps {
  request: ApiRequest | null;
  activeTabIds: string[];
  requests: ApiRequest[];
  collections: ApiCollection[];
  activeEnvironment: Environment | null;
  isSending: boolean;
  isCompiling: boolean;
  isSplitVertical: boolean;
  sendMode?: "live" | "mock";
  onToggleSendMode?: () => void;
  onToggleSplitLayout: () => void;
  onSelectTab: (id: string) => void;
  onCloseTab: (id: string) => void;
  onNewTab: () => void;
  onUpdateRequest: (updated: ApiRequest) => void;
  onSendRequest: () => void;
  onCompileRequest: () => void;
  onCopyCurlToast?: () => void;
}

export default function RequestHeaderBar({
  request,
  activeTabIds,
  requests,
  collections,
  activeEnvironment,
  isSending,
  isCompiling,
  isSplitVertical,
  sendMode = "live",
  onToggleSendMode,
  onToggleSplitLayout,
  onSelectTab,
  onCloseTab,
  onNewTab,
  onUpdateRequest,
  onSendRequest,
  onCompileRequest,
  onCopyCurlToast,
}: RequestHeaderBarProps) {
  const [copiedCurl, setCopiedCurl] = useState(false);

  // Keyboard shortcut: Cmd/Ctrl + Enter to send
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
        e.preventDefault();
        onSendRequest();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onSendRequest]);

  if (!request) {
    return (
      <div className="border-b border-[#232329] bg-[#0A0A0C] px-4 py-3 flex items-center justify-between text-xs text-zinc-500 font-mono">
        <span>No request open. Select an endpoint or create a new request.</span>
        <button
          onClick={onNewTab}
          className="px-3 py-1 bg-zinc-100 text-zinc-950 hover:bg-white rounded-lg font-sans font-medium text-xs shadow-sm"
        >
          New Request
        </button>
      </div>
    );
  }

  const collection = collections.find((c) => c.id === request.collectionId);
  const interpolatedUrl = interpolateVariables(request.url, activeEnvironment);

  const handleCopyCurl = () => {
    const curl = serializeToCurl(request, activeEnvironment);
    navigator.clipboard.writeText(curl);
    setCopiedCurl(true);
    if (onCopyCurlToast) onCopyCurlToast();
    setTimeout(() => setCopiedCurl(false), 2000);
  };

  // Smart cURL Paste detection in URL bar
  const handleUrlPasteOrChange = (rawText: string) => {
    if (rawText.trim().startsWith("curl ")) {
      try {
        const parsed = parseCurlCommand(rawText);
        onUpdateRequest({
          ...request,
          method: parsed.method,
          url: parsed.url,
          params: parsed.params.length > 0 ? parsed.params : request.params,
          headers: parsed.headers.length > 0 ? parsed.headers : request.headers,
          auth: parsed.auth.type !== "none" ? parsed.auth : request.auth,
          body: parsed.body.type !== "none" ? parsed.body : request.body,
          updatedAt: new Date().toISOString(),
        });
        return;
      } catch {
        // Fallback to plain URL text
      }
    }

    onUpdateRequest({
      ...request,
      url: rawText,
      updatedAt: new Date().toISOString(),
    });
  };

  return (
    <div className="border-b border-[#232329] bg-[#0A0A0C] flex flex-col select-none">
      {/* ROW 1: FULL-WIDTH MULTI-TAB BAR */}
      <div className="flex items-center bg-[#0E0E11] border-b border-[#232329] px-2 overflow-x-auto text-xs no-scrollbar">
        <div className="flex items-center">
          {activeTabIds.map((tabId) => {
            const tabReq = requests.find((r) => r.id === tabId);
            if (!tabReq) return null;
            const isActive = tabReq.id === request.id;
            const methodStyle = METHOD_COLORS[tabReq.method] || METHOD_COLORS.GET;

            return (
              <div
                key={tabReq.id}
                onClick={() => onSelectTab(tabReq.id)}
                className={`group flex items-center space-x-2 px-3 py-2 border-r border-[#232329] cursor-pointer text-xs transition-colors ${
                  isActive
                    ? "bg-[#16161A] text-zinc-100 font-medium"
                    : "text-zinc-400 hover:bg-[#141418] hover:text-zinc-200"
                }`}
              >
                <span className={`font-mono text-[9px] font-bold ${methodStyle.text}`}>
                  {tabReq.method}
                </span>
                <span className="max-w-[150px] truncate text-[11px] font-mono">
                  {tabReq.name}
                </span>
                {activeTabIds.length > 1 && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onCloseTab(tabReq.id);
                    }}
                    className="p-0.5 rounded text-zinc-500 hover:text-zinc-200 hover:bg-[#232329] transition-colors"
                  >
                    <X className="w-3 h-3" strokeWidth={1.75} />
                  </button>
                )}
              </div>
            );
          })}
        </div>

        <button
          type="button"
          onClick={onNewTab}
          className="p-1.5 ml-1 text-zinc-500 hover:text-zinc-200 hover:bg-[#16161A] rounded transition-colors"
          title="New Request Tab"
        >
          <Plus className="w-3.5 h-3.5" strokeWidth={1.75} />
        </button>
      </div>

      {/* ROW 2: BREADCRUMB + PROVENANCE */}
      <div className="px-4 pt-2.5 pb-1 flex items-center justify-between text-xs font-mono">
        <div className="flex items-center space-x-2 truncate">
          <span className="text-zinc-500 uppercase tracking-wider font-semibold text-[11px]">
            02 / REQUEST BUILDER
          </span>
          <span className="text-zinc-700">/</span>
          <span className="text-zinc-400 truncate max-w-[150px] text-[11px]">
            {collection?.name || "Workspace"}
          </span>
          <span className="text-zinc-700">/</span>
          <input
            type="text"
            value={request.name}
            onChange={(e) =>
              onUpdateRequest({
                ...request,
                name: e.target.value,
                updatedAt: new Date().toISOString(),
              })
            }
            className="text-zinc-200 font-mono text-[11px] bg-transparent hover:bg-[#111216] focus:bg-[#111216] px-1.5 py-0.5 focus:outline-none focus:border focus:border-[#222328] transition-colors max-w-sm truncate"
          />
        </div>

        {/* Provenance Badge */}
        <div className="hidden sm:flex items-center space-x-2 shrink-0">
          <div className="flex items-center space-x-1.5 px-2.5 py-0.5 bg-[#111216] border border-[#222328] text-[11px] font-mono text-zinc-400">
            <span className="text-zinc-500">SHA-256:</span>
            <span className="text-zinc-300">{request.sha256Prefix || "8f4a1c91"}</span>
            <span className="text-zinc-600">·</span>
            <span className="text-emerald-400 flex items-center space-x-1">
              <ShieldCheck className="w-3 h-3" strokeWidth={1.75} />
              <span>Scrubbed</span>
            </span>
          </div>
        </div>
      </div>

      {/* ROW 3: FULL-WIDTH COMMAND BAR */}
      <div className="px-4 pb-3 pt-1 flex items-center space-x-2">
        {/* Method Selector */}
        <div className="relative shrink-0">
          <select
            value={request.method}
            onChange={(e) =>
              onUpdateRequest({
                ...request,
                method: e.target.value as HttpMethod,
                updatedAt: new Date().toISOString(),
              })
            }
            className="font-mono font-medium text-xs px-3 py-2 rounded-lg bg-[#16161A] border border-[#232329] text-zinc-200 cursor-pointer focus:outline-none focus:border-zinc-500 shadow-sm"
          >
            <option value="GET">GET</option>
            <option value="POST">POST</option>
            <option value="PUT">PUT</option>
            <option value="PATCH">PATCH</option>
            <option value="DELETE">DELETE</option>
            <option value="HEAD">HEAD</option>
            <option value="OPTIONS">OPTIONS</option>
          </select>
        </div>

        {/* Wide Full-Width URL Input */}
        <div className="flex-1 relative flex items-center">
          <input
            type="text"
            value={request.url}
            onChange={(e) => handleUrlPasteOrChange(e.target.value)}
            placeholder="https://api.example.com/v1/endpoint or {{BASE_URL}}/endpoint or paste cURL"
            className="w-full px-3.5 py-2 bg-[#16161A] border border-[#232329] rounded-lg font-mono text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-zinc-500 shadow-inner"
          />
        </div>

        {/* Copy cURL Button */}
        <button
          type="button"
          onClick={handleCopyCurl}
          className="p-2 rounded-lg bg-[#16161A] hover:bg-[#1C1C21] border border-[#232329] text-zinc-400 hover:text-zinc-200 transition-colors shrink-0 shadow-sm"
          title="Copy as cURL"
        >
          {copiedCurl ? (
            <Check className="w-3.5 h-3.5 text-emerald-400" strokeWidth={1.75} />
          ) : (
            <Terminal className="w-3.5 h-3.5" strokeWidth={1.75} />
          )}
        </button>

        {/* Layout Split Toggle */}
        <button
          type="button"
          onClick={onToggleSplitLayout}
          className="p-2 rounded-lg bg-[#16161A] hover:bg-[#1C1C21] border border-[#232329] text-zinc-400 hover:text-zinc-200 transition-colors shrink-0 shadow-sm"
          title={isSplitVertical ? "Switch to Side-by-Side Split" : "Switch to Stacked Vertical Split"}
        >
          {isSplitVertical ? <Columns className="w-3.5 h-3.5" strokeWidth={1.75} /> : <Rows className="w-3.5 h-3.5" strokeWidth={1.75} />}
        </button>

        {/* Send Mode Toggle: Live Proxy vs Mock .har Replay */}
        {onToggleSendMode && (
          <button
            id="btn-toggle-send-mode"
            type="button"
            onClick={onToggleSendMode}
            className={`flex items-center space-x-1.5 px-2.5 py-2 rounded-lg text-xs font-mono font-medium border transition-colors shrink-0 ${
              sendMode === "mock"
                ? "bg-amber-500/10 text-amber-300 border-amber-500/30 hover:bg-amber-500/20"
                : "bg-[#18181C] text-zinc-300 border-[#2A2A32] hover:bg-[#222228]"
            }`}
            title={
              sendMode === "mock"
                ? "Replaying recorded 200 OK .har evidence locally (Click to switch to Live Proxy)"
                : "Dispatching via live SSRF-guarded proxy (Click to switch to Mock .har Evidence)"
            }
          >
            {sendMode === "mock" ? (
              <>
                <Layers className="w-3.5 h-3.5 text-amber-400" strokeWidth={1.75} />
                <span className="hidden sm:inline">Mock .har</span>
              </>
            ) : (
              <>
                <Globe className="w-3.5 h-3.5 text-zinc-400" strokeWidth={1.75} />
                <span className="hidden sm:inline">Live Proxy</span>
              </>
            )}
          </button>
        )}

        {/* Primary Action Button: Crisp Solid White (Architectural style) */}
        <button
          id="btn-send-request"
          type="button"
          onClick={onSendRequest}
          disabled={isSending}
          className="flex items-center space-x-2 px-5 py-2 font-mono font-bold text-xs uppercase tracking-[0.14em] bg-white text-black hover:bg-zinc-200 transition-colors shrink-0 cursor-pointer shadow-sm"
        >
          {isSending ? (
            <>
              <RefreshCw className="w-3.5 h-3.5 animate-spin" strokeWidth={2} />
              <span>{sendMode === "mock" ? "REPLAYING..." : "SENDING..."}</span>
            </>
          ) : (
            <>
              <Send className="w-3.5 h-3.5" strokeWidth={2.5} />
              <span>{sendMode === "mock" ? "REPLAY .HAR" : "SEND REQUEST"}</span>
            </>
          )}
        </button>
      </div>

      {/* Target URL Sub-bar */}
      {interpolatedUrl !== request.url && (
        <div className="px-4 pb-2 pt-0 flex items-center space-x-1.5 text-[11px] font-mono text-zinc-400">
          <span className="text-zinc-500 font-medium shrink-0">Resolved target:</span>
          <span className="text-zinc-300 truncate select-all">{interpolatedUrl}</span>
        </div>
      )}
    </div>
  );
}
