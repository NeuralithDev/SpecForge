"use client";

import React, { useState } from "react";
import {
  Folder,
  Plus,
  Search,
  ChevronRight,
  ChevronDown,
  Trash2,
  FileCode,
  Layers,
  History,
  Terminal,
} from "lucide-react";
import type {
  ApiCollection,
  ApiRequest,
  HarTraceMeta,
  RequestHistoryItem,
  HttpMethod,
  LocalQuotaState,
} from "@/lib/localStore";

interface SidebarProps {
  collections: ApiCollection[];
  requests: ApiRequest[];
  traces: HarTraceMeta[];
  history: RequestHistoryItem[];
  activeRequestId: string | null;
  quota?: LocalQuotaState;
  onSelectRequest: (requestId: string) => void;
  onNewRequest: (collectionId?: string, folder?: string) => void;
  onNewCollection: () => void;
  onDeleteRequest: (requestId: string) => void;
  onDeleteCollection: (collectionId: string) => void;
  onOpenHarModal: () => void;
  onOpenPricingModal?: () => void;
  onInspectTrace?: (trace: HarTraceMeta) => void;
}

export const METHOD_COLORS: Record<HttpMethod, { badge: string; text: string }> = {
  GET: { badge: "bg-emerald-500/10 text-emerald-400 border-transparent", text: "text-emerald-400" },
  POST: { badge: "bg-amber-500/10 text-amber-400 border-transparent", text: "text-amber-400" },
  PUT: { badge: "bg-blue-500/10 text-blue-400 border-transparent", text: "text-blue-400" },
  DELETE: { badge: "bg-rose-500/10 text-rose-400 border-transparent", text: "text-rose-400" },
  PATCH: { badge: "bg-purple-500/10 text-purple-400 border-transparent", text: "text-purple-400" },
  HEAD: { badge: "bg-zinc-500/10 text-zinc-400 border-transparent", text: "text-zinc-400" },
  OPTIONS: { badge: "bg-cyan-500/10 text-cyan-400 border-transparent", text: "text-cyan-400" },
};

function formatEndpointPath(urlOrName: string): string {
  try {
    if (urlOrName.startsWith("http://") || urlOrName.startsWith("https://")) {
      const u = new URL(urlOrName);
      return u.pathname || urlOrName;
    }
  } catch {
    // fall through
  }
  // Strip domain prefix if like api.stripe.com/v1/xyz
  const match = urlOrName.match(/^(?:[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})(\/.*)$/);
  if (match && match[1]) {
    return match[1];
  }
  return urlOrName;
}

export default function Sidebar({
  collections,
  requests,
  traces,
  history,
  activeRequestId,
  quota,
  onSelectRequest,
  onNewRequest,
  onNewCollection,
  onDeleteRequest,
  onDeleteCollection,
  onOpenHarModal,
  onOpenPricingModal,
  onInspectTrace,
}: SidebarProps) {
  const [activeTab, setActiveTab] = useState<"endpoints" | "history">("endpoints");
  const [searchQuery, setSearchQuery] = useState("");
  const [collapsedCollections, setCollapsedCollections] = useState<Record<string, boolean>>({});

  const toggleCollection = (colId: string) => {
    setCollapsedCollections((prev) => ({ ...prev, [colId]: !prev[colId] }));
  };

  // Filter requests by search query
  const filteredRequests = requests.filter((r) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      r.name.toLowerCase().includes(q) ||
      r.url.toLowerCase().includes(q) ||
      r.method.toLowerCase().includes(q)
    );
  });

  const quotaLimit = quota?.limit || 25;
  const quotaUsed = quota?.compiledEndpointsCount || 0;
  const isUnlimited = quota?.tier === "enterprise" || quotaLimit > 1000;

  return (
    <aside className="w-64 bg-[#0B0C0E] border-r border-[#222328] flex flex-col h-full select-none text-xs font-sans">
      {/* SECTION HEADER: 01 / ENDPOINTS */}
      <div className="px-3.5 py-2.5 border-b border-[#222328] bg-[#0E0F13] flex items-center justify-between font-mono text-[11px] tracking-[0.2em] text-zinc-400 uppercase">
        <span>01 / ENDPOINTS</span>
        <span className="text-zinc-500">{requests.length}</span>
      </div>

      {/* Top Controls: Search + New Request Button */}
      <div className="p-3 border-b border-[#222328] space-y-2 bg-[#0B0C0E]">
        <div className="flex items-center space-x-1.5">
          <div className="relative flex-1">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-500" strokeWidth={1.75} />
            <input
              type="text"
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-2.5 py-1.5 bg-[#111216] border border-[#222328] text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-zinc-500 text-xs transition-colors font-mono"
            />
          </div>
          <button
            type="button"
            onClick={() => onNewRequest()}
            className="p-1.5 bg-white text-black hover:bg-zinc-200 transition-colors shadow-sm shrink-0 cursor-pointer"
            title="New Request"
          >
            <Plus className="w-3.5 h-3.5" strokeWidth={2.5} />
          </button>
        </div>

        {/* View Switcher: Endpoints vs History */}
        <div className="flex items-center bg-[#111216] p-0.5 border border-[#222328]">
          <button
            type="button"
            onClick={() => setActiveTab("endpoints")}
            className={`flex-1 py-1 text-[11px] font-medium rounded-md transition-colors ${
              activeTab === "endpoints"
                ? "bg-[#1C1C21] text-zinc-100 shadow-sm"
                : "text-zinc-400 hover:text-zinc-200"
            }`}
          >
            Endpoints ({requests.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("history")}
            className={`flex-1 py-1 text-[11px] font-medium rounded-md transition-colors ${
              activeTab === "history"
                ? "bg-[#1C1C21] text-zinc-100 shadow-sm"
                : "text-zinc-400 hover:text-zinc-200"
            }`}
          >
            Logs ({history.length})
          </button>
        </div>
      </div>

      {/* Main Body */}
      <div className="flex-1 overflow-y-auto p-2 space-y-2">
        {activeTab === "endpoints" && (
          <div>
            {collections.map((col) => {
              const colRequests = filteredRequests.filter((r) => r.collectionId === col.id);
              const isCollapsed = collapsedCollections[col.id];

              return (
                <div key={col.id} className="mb-2">
                  {/* Collection Header */}
                  <div
                    onClick={() => toggleCollection(col.id)}
                    className="group flex items-center justify-between px-2 py-1.5 rounded-md hover:bg-[#16161A] cursor-pointer text-zinc-300 font-medium"
                  >
                    <div className="flex items-center space-x-1.5 truncate">
                      {isCollapsed ? (
                        <ChevronRight className="w-3 h-3 text-zinc-500 shrink-0" strokeWidth={1.75} />
                      ) : (
                        <ChevronDown className="w-3 h-3 text-zinc-500 shrink-0" strokeWidth={1.75} />
                      )}
                      <Folder className="w-3.5 h-3.5 text-zinc-400 shrink-0" strokeWidth={1.75} />
                      <span className="truncate text-xs">{col.name}</span>
                    </div>

                    <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onNewRequest(col.id);
                        }}
                        title="Add Request"
                        className="p-1 text-zinc-500 hover:text-zinc-200"
                      >
                        <Plus className="w-3 h-3" strokeWidth={1.75} />
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeleteCollection(col.id);
                        }}
                        title="Delete Collection"
                        className="p-1 text-zinc-500 hover:text-rose-400"
                      >
                        <Trash2 className="w-3 h-3" strokeWidth={1.75} />
                      </button>
                    </div>
                  </div>

                  {/* Clean Request List without 3-level nesting */}
                  {!isCollapsed && (
                    <div className="pl-3 mt-1 space-y-0.5 border-l border-[#232329] ml-3">
                      {colRequests.map((req) => {
                        const isActive = req.id === activeRequestId;
                        const methodStyle = METHOD_COLORS[req.method] || METHOD_COLORS.GET;
                        const cleanPath = formatEndpointPath(req.name);

                        return (
                          <div
                            key={req.id}
                            onClick={() => onSelectRequest(req.id)}
                            title={req.url || req.name}
                            className={`group flex items-center justify-between px-2 py-1.5 rounded-md cursor-pointer transition-colors ${
                              isActive
                                ? "bg-[#1C1C21] text-zinc-100 font-medium border border-[#2A2A32]"
                                : "text-zinc-400 hover:bg-[#16161A] hover:text-zinc-200"
                            }`}
                          >
                            <div className="flex items-center space-x-2 truncate">
                              <span
                                className={`px-1.5 py-0.2 rounded text-[9px] font-mono font-semibold uppercase shrink-0 ${methodStyle.badge}`}
                              >
                                {req.method}
                              </span>
                              <span className="truncate text-[11px] font-mono">
                                {cleanPath}
                              </span>
                            </div>

                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                onDeleteRequest(req.id);
                              }}
                              className="opacity-0 group-hover:opacity-100 p-0.5 text-zinc-500 hover:text-rose-400 transition-opacity"
                            >
                              <Trash2 className="w-3 h-3" strokeWidth={1.75} />
                            </button>
                          </div>
                        );
                      })}

                      {colRequests.length === 0 && (
                        <div className="py-2 px-2 text-[11px] text-zinc-500 italic">
                          No endpoints
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}

            {collections.length === 0 && (
              <div className="text-center py-8 text-zinc-500">
                <p className="text-xs mb-3">No collections</p>
                <button
                  type="button"
                  onClick={onNewCollection}
                  className="px-3 py-1.5 bg-[#18181C] hover:bg-[#222228] text-zinc-200 border border-[#2A2A32] rounded-lg text-xs"
                >
                  Create Collection
                </button>
              </div>
            )}
          </div>
        )}

        {/* History Tab */}
        {activeTab === "history" && (
          <div className="space-y-1">
            {history.map((item) => {
              const is2xx = item.status >= 200 && item.status < 300;
              const is4xx = item.status >= 400 && item.status < 500;
              const is5xx = item.status >= 500;
              const cleanPath = formatEndpointPath(item.name || item.url);

              return (
                <div
                  key={item.id}
                  onClick={() => {
                    if (item.requestId) onSelectRequest(item.requestId);
                  }}
                  title={item.url}
                  className="p-2 rounded-lg bg-[#141418] hover:bg-[#1C1C21] border border-[#232329] cursor-pointer space-y-1 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-1.5 truncate">
                      <span className="font-mono text-[9px] font-semibold text-zinc-400">
                        {item.method}
                      </span>
                      <span className="truncate text-zinc-200 text-[11px] font-mono">
                        {cleanPath}
                      </span>
                    </div>
                    <span
                      className={`px-1.5 py-0.2 rounded text-[9px] font-mono font-medium ${
                        is2xx
                          ? "bg-emerald-500/10 text-emerald-400"
                          : is4xx
                          ? "bg-amber-500/10 text-amber-400"
                          : is5xx
                          ? "bg-rose-500/10 text-rose-400"
                          : "bg-zinc-800 text-zinc-400"
                      }`}
                    >
                      {item.status || "ERR"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[10px] text-zinc-500 font-mono">
                    <span className="truncate max-w-[120px]">{item.timingMs}ms</span>
                    <span>{new Date(item.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}</span>
                  </div>
                </div>
              );
            })}

            {history.length === 0 && (
              <div className="text-center py-8 text-zinc-500">
                <History className="w-6 h-6 mx-auto mb-2 text-zinc-600" strokeWidth={1.75} />
                <p className="text-xs">No request history</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Bottom of Sidebar: Subtle Usage Meter + Upgrade Link */}
      <div className="p-3 border-t border-[#232329] bg-[#0E0E11] flex items-center justify-between text-xs font-sans">
        <div className="text-zinc-400 text-[11px]">
          <span className="font-mono text-zinc-200 font-medium">{quotaUsed}</span> of{" "}
          <span className="font-mono text-zinc-200 font-medium">{isUnlimited ? "∞" : quotaLimit}</span> free endpoints
        </div>
        {onOpenPricingModal && (
          <button
            type="button"
            onClick={onOpenPricingModal}
            className="text-[11px] font-medium text-zinc-300 hover:text-white transition-colors cursor-pointer"
          >
            Upgrade →
          </button>
        )}
      </div>
    </aside>
  );
}
