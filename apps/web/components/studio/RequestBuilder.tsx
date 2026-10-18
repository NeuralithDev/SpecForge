"use client";

import React, { useState, useEffect } from "react";
import {
  Send,
  Plus,
  X,
  Sparkles,
  Trash2,
  Code2,
  Lock,
  Layers,
  Check,
  AlertCircle,
  Cpu,
  RefreshCw,
} from "lucide-react";
import type {
  ApiRequest,
  HttpMethod,
  Environment,
  KeyValueParam,
  AuthType,
  BodyType,
} from "@/lib/localStore";
import { interpolateVariables } from "@/lib/localStore";
import { METHOD_COLORS } from "./Sidebar";

interface RequestBuilderProps {
  request: ApiRequest | null;
  activeTabIds: string[];
  requests: ApiRequest[];
  activeEnvironment: Environment | null;
  isSending: boolean;
  isCompiling: boolean;
  onSelectTab: (id: string) => void;
  onCloseTab: (id: string) => void;
  onNewTab: () => void;
  onUpdateRequest: (updated: ApiRequest) => void;
  onSendRequest: () => void;
  onCompileRequest: () => void;
}

const COMMON_HEADERS = [
  "Accept",
  "Content-Type",
  "Authorization",
  "User-Agent",
  "X-Api-Key",
  "Cache-Control",
  "X-Requested-With",
];

export default function RequestBuilder({
  request,
  activeTabIds,
  requests,
  activeEnvironment,
  isSending,
  isCompiling,
  onSelectTab,
  onCloseTab,
  onNewTab,
  onUpdateRequest,
  onSendRequest,
  onCompileRequest,
}: RequestBuilderProps) {
  const [configTab, setConfigTab] = useState<"params" | "auth" | "headers" | "body">("params");
  const [jsonError, setJsonError] = useState<string | null>(null);

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
      <div className="flex-1 flex flex-col items-center justify-center p-8 bg-slate-950/40 text-slate-500">
        <Code2 className="w-12 h-12 opacity-30 mb-3 text-indigo-400" />
        <h3 className="text-sm font-semibold text-slate-300">No Request Selected</h3>
        <p className="text-xs text-slate-500 mt-1 mb-4">
          Select an endpoint from the left sidebar or create a new request.
        </p>
        <button
          onClick={onNewTab}
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold shadow-glow transition-colors"
        >
          + Create New Request
        </button>
      </div>
    );
  }

  const interpolatedUrl = interpolateVariables(request.url, activeEnvironment);

  // Handlers for Request URL & Method
  const handleMethodChange = (method: HttpMethod) => {
    onUpdateRequest({ ...request, method, updatedAt: new Date().toISOString() });
  };

  const handleUrlChange = (url: string) => {
    onUpdateRequest({ ...request, url, updatedAt: new Date().toISOString() });
  };

  const handleNameChange = (name: string) => {
    onUpdateRequest({ ...request, name, updatedAt: new Date().toISOString() });
  };

  // Handlers for Params
  const handleAddParam = () => {
    const newParam: KeyValueParam = {
      id: `p_${Date.now()}`,
      key: "",
      value: "",
      enabled: true,
    };
    onUpdateRequest({
      ...request,
      params: [...request.params, newParam],
      updatedAt: new Date().toISOString(),
    });
  };

  const handleUpdateParam = (id: string, patch: Partial<KeyValueParam>) => {
    const updatedParams = request.params.map((p) => (p.id === id ? { ...p, ...patch } : p));
    onUpdateRequest({
      ...request,
      params: updatedParams,
      updatedAt: new Date().toISOString(),
    });
  };

  const handleDeleteParam = (id: string) => {
    const updatedParams = request.params.filter((p) => p.id !== id);
    onUpdateRequest({
      ...request,
      params: updatedParams,
      updatedAt: new Date().toISOString(),
    });
  };

  // Handlers for Headers
  const handleAddHeader = () => {
    const newHeader: KeyValueParam = {
      id: `h_${Date.now()}`,
      key: "",
      value: "",
      enabled: true,
    };
    onUpdateRequest({
      ...request,
      headers: [...request.headers, newHeader],
      updatedAt: new Date().toISOString(),
    });
  };

  const handleUpdateHeader = (id: string, patch: Partial<KeyValueParam>) => {
    const updatedHeaders = request.headers.map((h) => (h.id === id ? { ...h, ...patch } : h));
    onUpdateRequest({
      ...request,
      headers: updatedHeaders,
      updatedAt: new Date().toISOString(),
    });
  };

  const handleDeleteHeader = (id: string) => {
    const updatedHeaders = request.headers.filter((h) => h.id !== id);
    onUpdateRequest({
      ...request,
      headers: updatedHeaders,
      updatedAt: new Date().toISOString(),
    });
  };

  // Handlers for Auth
  const handleAuthTypeChange = (type: AuthType) => {
    onUpdateRequest({
      ...request,
      auth: { ...request.auth, type },
      updatedAt: new Date().toISOString(),
    });
  };

  // Handlers for Body
  const handleBodyTypeChange = (type: BodyType) => {
    onUpdateRequest({
      ...request,
      body: { ...request.body, type },
      updatedAt: new Date().toISOString(),
    });
  };

  const handleRawJsonChange = (rawJson: string) => {
    try {
      if (rawJson.trim().length > 0) {
        JSON.parse(rawJson);
      }
      setJsonError(null);
    } catch (err: unknown) {
      setJsonError(err instanceof Error ? err.message : "Invalid JSON syntax");
    }

    onUpdateRequest({
      ...request,
      body: { ...request.body, rawJson },
      updatedAt: new Date().toISOString(),
    });
  };

  const handlePrettifyJson = () => {
    if (!request.body.rawJson) return;
    try {
      const parsed = JSON.parse(request.body.rawJson);
      const pretty = JSON.stringify(parsed, null, 2);
      setJsonError(null);
      onUpdateRequest({
        ...request,
        body: { ...request.body, rawJson: pretty },
        updatedAt: new Date().toISOString(),
      });
    } catch {
      // Keep existing if invalid
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-950/40 text-xs overflow-hidden">
      {/* 1. Multi-Tab Header Bar */}
      <div className="flex items-center bg-slate-950/90 border-b border-slate-800/80 px-2 overflow-x-auto select-none">
        <div className="flex items-center space-x-1">
          {activeTabIds.map((tabId) => {
            const tabReq = requests.find((r) => r.id === tabId);
            if (!tabReq) return null;
            const isActive = tabReq.id === request.id;
            const methodStyle = METHOD_COLORS[tabReq.method] || METHOD_COLORS.GET;

            return (
              <div
                key={tabReq.id}
                onClick={() => onSelectTab(tabReq.id)}
                className={`group flex items-center space-x-2 px-3 py-2 border-r border-slate-800/60 cursor-pointer text-xs transition-colors ${
                  isActive
                    ? "bg-slate-900 text-slate-100 border-t-2 border-t-indigo-500 font-medium"
                    : "text-slate-400 hover:bg-slate-900/40 hover:text-slate-300"
                }`}
              >
                <span className={`font-mono text-[10px] font-bold ${methodStyle.text}`}>
                  {tabReq.method}
                </span>
                <span className="max-w-[130px] truncate">{tabReq.name}</span>
                {activeTabIds.length > 1 && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onCloseTab(tabReq.id);
                    }}
                    className="p-0.5 rounded text-slate-500 hover:text-slate-200 hover:bg-slate-800 transition-colors"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>
            );
          })}
        </div>

        <button
          onClick={onNewTab}
          className="p-1.5 ml-1 text-slate-500 hover:text-slate-300 hover:bg-slate-800/60 rounded transition-colors"
          title="New Request Tab"
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>

      {/* 2. URL Bar & Main Actions */}
      <div className="p-4 border-b border-slate-800/80 space-y-2">
        {/* Endpoint Name Inline Editor */}
        <div className="flex items-center space-x-2">
          <input
            type="text"
            value={request.name}
            onChange={(e) => handleNameChange(e.target.value)}
            className="text-sm font-semibold bg-transparent text-slate-200 focus:outline-none focus:bg-slate-900/60 px-2 py-0.5 rounded transition-colors max-w-md"
            placeholder="Request Name"
          />
          {request.folder && (
            <span className="text-[11px] text-slate-500 font-mono">
              in {request.folder}
            </span>
          )}
        </div>

        {/* URL Input Row */}
        <div className="flex items-center space-x-2">
          {/* Method Selector */}
          <div className="relative">
            <select
              value={request.method}
              onChange={(e) => handleMethodChange(e.target.value as HttpMethod)}
              className="appearance-none font-mono font-bold text-xs px-3 py-2.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-200 cursor-pointer focus:outline-none focus:border-indigo-500 pr-8"
            >
              <option value="GET">GET</option>
              <option value="POST">POST</option>
              <option value="PUT">PUT</option>
              <option value="DELETE">DELETE</option>
              <option value="PATCH">PATCH</option>
              <option value="HEAD">HEAD</option>
              <option value="OPTIONS">OPTIONS</option>
            </select>
          </div>

          {/* URL Input */}
          <div className="flex-1 relative">
            <input
              type="text"
              value={request.url}
              onChange={(e) => handleUrlChange(e.target.value)}
              placeholder="https://api.example.com/v1/endpoint or {{BASE_URL}}/endpoint"
              className="w-full px-3 py-2.5 bg-slate-900 border border-slate-800 rounded-lg font-mono text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
            />
          </div>

          {/* Primary Send Button */}
          <button
            onClick={onSendRequest}
            disabled={isSending}
            className="flex items-center space-x-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-semibold rounded-lg shadow-lg shadow-indigo-600/30 transition-all cursor-pointer"
          >
            {isSending ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span>Sending...</span>
              </>
            ) : (
              <>
                <Send className="w-3.5 h-3.5" />
                <span>Send</span>
              </>
            )}
          </button>

          {/* Compile to MCP Button */}
          <button
            onClick={onCompileRequest}
            disabled={isCompiling}
            className="flex items-center space-x-1.5 px-3 py-2.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-indigo-300 hover:text-indigo-200 font-semibold rounded-lg border border-slate-700 transition-all cursor-pointer"
            title="Compile this endpoint into Claude MCP server & TypeScript SDK"
          >
            {isCompiling ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin text-amber-400" />
            ) : (
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            )}
            <span>Compile to MCP</span>
          </button>
        </div>

        {/* Real-time Interpolation Preview */}
        {interpolatedUrl !== request.url && (
          <div className="text-[11px] font-mono text-slate-400 flex items-center space-x-1 pl-1">
            <span className="text-slate-500">Resolved:</span>
            <span className="text-indigo-300 truncate">{interpolatedUrl}</span>
          </div>
        )}
      </div>

      {/* 3. Request Configuration Tabs (Params, Auth, Headers, Body) */}
      <div className="flex items-center border-b border-slate-800 px-4 bg-slate-950/60">
        <button
          onClick={() => setConfigTab("params")}
          className={`py-2.5 px-4 font-semibold text-xs border-b-2 transition-colors flex items-center space-x-1.5 ${
            configTab === "params"
              ? "border-indigo-500 text-indigo-400"
              : "border-transparent text-slate-400 hover:text-slate-200"
          }`}
        >
          <span>Params</span>
          {request.params.filter((p) => p.enabled && p.key).length > 0 && (
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-400" />
          )}
        </button>

        <button
          onClick={() => setConfigTab("auth")}
          className={`py-2.5 px-4 font-semibold text-xs border-b-2 transition-colors flex items-center space-x-1.5 ${
            configTab === "auth"
              ? "border-indigo-500 text-indigo-400"
              : "border-transparent text-slate-400 hover:text-slate-200"
          }`}
        >
          <span>Auth</span>
          {request.auth.type !== "none" && (
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
          )}
        </button>

        <button
          onClick={() => setConfigTab("headers")}
          className={`py-2.5 px-4 font-semibold text-xs border-b-2 transition-colors flex items-center space-x-1.5 ${
            configTab === "headers"
              ? "border-indigo-500 text-indigo-400"
              : "border-transparent text-slate-400 hover:text-slate-200"
          }`}
        >
          <span>Headers</span>
          <span className="text-[10px] text-slate-500">
            ({request.headers.filter((h) => h.enabled && h.key).length})
          </span>
        </button>

        <button
          onClick={() => setConfigTab("body")}
          className={`py-2.5 px-4 font-semibold text-xs border-b-2 transition-colors flex items-center space-x-1.5 ${
            configTab === "body"
              ? "border-indigo-500 text-indigo-400"
              : "border-transparent text-slate-400 hover:text-slate-200"
          }`}
        >
          <span>Body</span>
          {request.body.type !== "none" && (
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
          )}
        </button>
      </div>

      {/* 4. Configuration Content Body */}
      <div className="flex-1 overflow-y-auto p-4">
        {/* PARAMS TAB */}
        {configTab === "params" && (
          <div className="space-y-3">
            <div className="flex items-center justify-between text-slate-400 text-[11px]">
              <span>Query Parameters</span>
              <button
                onClick={handleAddParam}
                className="flex items-center space-x-1 text-indigo-400 hover:text-indigo-300 font-medium"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Parameter</span>
              </button>
            </div>

            <div className="space-y-1.5">
              {request.params.map((param) => (
                <div
                  key={param.id}
                  className="flex items-center space-x-2 p-1.5 rounded-lg bg-slate-900/70 border border-slate-800"
                >
                  <input
                    type="checkbox"
                    checked={param.enabled}
                    onChange={(e) => handleUpdateParam(param.id, { enabled: e.target.checked })}
                    className="rounded border-slate-700 text-indigo-500 focus:ring-0 w-4 h-4 bg-slate-900"
                  />
                  <input
                    type="text"
                    placeholder="Key"
                    value={param.key}
                    onChange={(e) => handleUpdateParam(param.id, { key: e.target.value })}
                    className="w-1/3 px-2 py-1 bg-slate-950 border border-slate-800 rounded font-mono text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-indigo-500"
                  />
                  <input
                    type="text"
                    placeholder="Value (supports {{VAR}})"
                    value={param.value}
                    onChange={(e) => handleUpdateParam(param.id, { value: e.target.value })}
                    className="flex-1 px-2 py-1 bg-slate-950 border border-slate-800 rounded font-mono text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-indigo-500"
                  />
                  <button
                    onClick={() => handleDeleteParam(param.id)}
                    className="p-1 text-slate-500 hover:text-rose-400 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
              {request.params.length === 0 && (
                <div className="text-center py-6 text-slate-500">
                  No query parameters configured.
                </div>
              )}
            </div>
          </div>
        )}

        {/* AUTH TAB */}
        {configTab === "auth" && (
          <div className="max-w-md space-y-4">
            <div>
              <label className="block text-slate-400 text-xs mb-1 font-medium">
                Authentication Type
              </label>
              <select
                value={request.auth.type}
                onChange={(e) => handleAuthTypeChange(e.target.value as AuthType)}
                className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-slate-200 font-medium focus:outline-none focus:border-indigo-500"
              >
                <option value="none">No Auth</option>
                <option value="bearer">Bearer Token</option>
                <option value="apiKey">API Key (Header / Query)</option>
                <option value="basic">Basic Auth</option>
                <option value="cookie">Cookie Passthrough</option>
              </select>
            </div>

            {request.auth.type === "bearer" && (
              <div className="space-y-2">
                <label className="block text-slate-400 text-xs font-medium">
                  Bearer Token
                </label>
                <input
                  type="text"
                  placeholder="{{SPECFORGE_AUTH_BEARER}} or token string"
                  value={request.auth.bearerToken || ""}
                  onChange={(e) =>
                    onUpdateRequest({
                      ...request,
                      auth: { ...request.auth, bearerToken: e.target.value },
                    })
                  }
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg font-mono text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-indigo-500"
                />
              </div>
            )}

            {request.auth.type === "apiKey" && (
              <div className="space-y-3">
                <div>
                  <label className="block text-slate-400 text-xs font-medium mb-1">
                    Key Header Name
                  </label>
                  <input
                    type="text"
                    placeholder="X-Api-Key"
                    value={request.auth.apiKeyKey || ""}
                    onChange={(e) =>
                      onUpdateRequest({
                        ...request,
                        auth: { ...request.auth, apiKeyKey: e.target.value },
                      })
                    }
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg font-mono text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 text-xs font-medium mb-1">
                    Key Value
                  </label>
                  <input
                    type="text"
                    placeholder="{{SPECFORGE_AUTH_API_KEY}}"
                    value={request.auth.apiKeyValue || ""}
                    onChange={(e) =>
                      onUpdateRequest({
                        ...request,
                        auth: { ...request.auth, apiKeyValue: e.target.value },
                      })
                    }
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg font-mono text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>
            )}

            {request.auth.type === "none" && (
              <p className="text-slate-500 text-xs">
                This request does not use any authentication credentials.
              </p>
            )}
          </div>
        )}

        {/* HEADERS TAB */}
        {configTab === "headers" && (
          <div className="space-y-3">
            <div className="flex items-center justify-between text-slate-400 text-[11px]">
              <span>Request Headers</span>
              <button
                onClick={handleAddHeader}
                className="flex items-center space-x-1 text-indigo-400 hover:text-indigo-300 font-medium"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Header</span>
              </button>
            </div>

            <div className="space-y-1.5">
              {request.headers.map((header) => (
                <div
                  key={header.id}
                  className="flex items-center space-x-2 p-1.5 rounded-lg bg-slate-900/70 border border-slate-800"
                >
                  <input
                    type="checkbox"
                    checked={header.enabled}
                    onChange={(e) => handleUpdateHeader(header.id, { enabled: e.target.checked })}
                    className="rounded border-slate-700 text-indigo-500 focus:ring-0 w-4 h-4 bg-slate-900"
                  />
                  <input
                    type="text"
                    placeholder="Header Name"
                    value={header.key}
                    onChange={(e) => handleUpdateHeader(header.id, { key: e.target.value })}
                    className="w-1/3 px-2 py-1 bg-slate-950 border border-slate-800 rounded font-mono text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-indigo-500"
                  />
                  <input
                    type="text"
                    placeholder="Header Value"
                    value={header.value}
                    onChange={(e) => handleUpdateHeader(header.id, { value: e.target.value })}
                    className="flex-1 px-2 py-1 bg-slate-950 border border-slate-800 rounded font-mono text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-indigo-500"
                  />
                  <button
                    onClick={() => handleDeleteHeader(header.id)}
                    className="p-1 text-slate-500 hover:text-rose-400 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>

            {/* Quick Header Presets */}
            <div className="pt-3 border-t border-slate-800/60">
              <span className="text-[10px] text-slate-500 uppercase tracking-wider block mb-2">
                Quick Header Suggestions:
              </span>
              <div className="flex flex-wrap gap-1.5">
                {COMMON_HEADERS.map((hName) => (
                  <button
                    key={hName}
                    onClick={() => {
                      const exists = request.headers.some((h) => h.key.toLowerCase() === hName.toLowerCase());
                      if (!exists) {
                        const newH: KeyValueParam = {
                          id: `h_${Date.now()}`,
                          key: hName,
                          value: hName === "Content-Type" || hName === "Accept" ? "application/json" : "",
                          enabled: true,
                        };
                        onUpdateRequest({
                          ...request,
                          headers: [...request.headers, newH],
                          updatedAt: new Date().toISOString(),
                        });
                      }
                    }}
                    className="px-2 py-0.5 rounded bg-slate-900 hover:bg-slate-800 border border-slate-800 text-[10px] text-slate-400 hover:text-slate-200 font-mono transition-colors"
                  >
                    + {hName}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* BODY TAB */}
        {configTab === "body" && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <span className="text-slate-400 text-xs">Body Format:</span>
                <div className="flex items-center space-x-1 bg-slate-900 p-0.5 rounded-lg border border-slate-800">
                  <button
                    onClick={() => handleBodyTypeChange("none")}
                    className={`px-2 py-1 rounded text-[11px] font-medium transition-colors ${
                      request.body.type === "none"
                        ? "bg-slate-800 text-indigo-400"
                        : "text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    None
                  </button>
                  <button
                    onClick={() => handleBodyTypeChange("json")}
                    className={`px-2 py-1 rounded text-[11px] font-medium transition-colors ${
                      request.body.type === "json"
                        ? "bg-slate-800 text-indigo-400"
                        : "text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    Raw JSON
                  </button>
                  <button
                    onClick={() => handleBodyTypeChange("x-www-form-urlencoded")}
                    className={`px-2 py-1 rounded text-[11px] font-medium transition-colors ${
                      request.body.type === "x-www-form-urlencoded"
                        ? "bg-slate-800 text-indigo-400"
                        : "text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    x-www-form-urlencoded
                  </button>
                </div>
              </div>

              {request.body.type === "json" && (
                <div className="flex items-center space-x-2">
                  {jsonError ? (
                    <span className="text-rose-400 text-[11px] font-medium flex items-center space-x-1">
                      <AlertCircle className="w-3 h-3" />
                      <span>Invalid JSON</span>
                    </span>
                  ) : (
                    <span className="text-emerald-400 text-[11px] font-medium flex items-center space-x-1">
                      <Check className="w-3 h-3" />
                      <span>Valid JSON</span>
                    </span>
                  )}
                  <button
                    onClick={handlePrettifyJson}
                    className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded text-[11px] font-medium transition-colors border border-slate-700"
                  >
                    Prettify
                  </button>
                </div>
              )}
            </div>

            {request.body.type === "json" && (
              <textarea
                value={request.body.rawJson || ""}
                onChange={(e) => handleRawJsonChange(e.target.value)}
                placeholder='{\n  "key": "value"\n}'
                rows={12}
                className="w-full p-3 bg-slate-950 border border-slate-800 rounded-xl font-mono text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-indigo-500 resize-none"
              />
            )}

            {request.body.type === "none" && (
              <div className="text-center py-8 text-slate-500">
                This request does not have a request body.
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
