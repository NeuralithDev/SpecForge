"use client";

import React, { useState } from "react";
import {
  Plus,
  Trash2,
  Check,
  AlertCircle,
  Link as LinkIcon,
  HelpCircle,
  Sparkles,
} from "lucide-react";
import type {
  ApiRequest,
  KeyValueParam,
  AuthType,
  BodyType,
  VariableChainRule,
} from "@/lib/localStore";

interface RequestConfigPaneProps {
  request: ApiRequest;
  onUpdateRequest: (updated: ApiRequest) => void;
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

export default function RequestConfigPane({
  request,
  onUpdateRequest,
}: RequestConfigPaneProps) {
  const [configTab, setConfigTab] = useState<"params" | "auth" | "headers" | "body" | "chaining">("params");
  const [jsonError, setJsonError] = useState<string | null>(null);

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

  // Handlers for Variable Chaining
  const chainRules = request.chainRules || [];

  const handleAddChainRule = () => {
    const newRule: VariableChainRule = {
      id: `cr_${Date.now()}`,
      jsonPath: "id",
      envVarName: "EXTRACTED_ID",
      enabled: true,
    };
    onUpdateRequest({
      ...request,
      chainRules: [...chainRules, newRule],
      updatedAt: new Date().toISOString(),
    });
  };

  const handleUpdateChainRule = (id: string, patch: Partial<VariableChainRule>) => {
    const updated = chainRules.map((r) => (r.id === id ? { ...r, ...patch } : r));
    onUpdateRequest({
      ...request,
      chainRules: updated,
      updatedAt: new Date().toISOString(),
    });
  };

  const handleDeleteChainRule = (id: string) => {
    const updated = chainRules.filter((r) => r.id !== id);
    onUpdateRequest({
      ...request,
      chainRules: updated,
      updatedAt: new Date().toISOString(),
    });
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-[#09090b] text-xs font-sans overflow-hidden">
      {/* Sub-Tabs: Params, Auth, Headers, Body, Chain */}
      <div className="flex items-center border-b border-white/10 px-4 bg-[#0f0f12]">
        <button
          onClick={() => setConfigTab("params")}
          className={`py-2.5 px-3 font-semibold text-xs border-b-2 transition-colors flex items-center space-x-1.5 ${
            configTab === "params"
              ? "border-zinc-200 text-zinc-100"
              : "border-transparent text-zinc-400 hover:text-zinc-200"
          }`}
        >
          <span>Params</span>
          {request.params.filter((p) => p.enabled && p.key).length > 0 && (
            <span className="w-1.5 h-1.5 rounded-full bg-violet-400" />
          )}
        </button>

        <button
          onClick={() => setConfigTab("auth")}
          className={`py-2.5 px-3 font-semibold text-xs border-b-2 transition-colors flex items-center space-x-1.5 ${
            configTab === "auth"
              ? "border-zinc-200 text-zinc-100"
              : "border-transparent text-zinc-400 hover:text-zinc-200"
          }`}
        >
          <span>Auth</span>
          {request.auth.type !== "none" && (
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
          )}
        </button>

        <button
          onClick={() => setConfigTab("headers")}
          className={`py-2.5 px-3 font-semibold text-xs border-b-2 transition-colors flex items-center space-x-1.5 ${
            configTab === "headers"
              ? "border-zinc-200 text-zinc-100"
              : "border-transparent text-zinc-400 hover:text-zinc-200"
          }`}
        >
          <span>Headers</span>
          <span className="text-[10px] text-slate-500 font-mono">
            ({request.headers.filter((h) => h.enabled && h.key).length})
          </span>
        </button>

        <button
          onClick={() => setConfigTab("body")}
          className={`py-2.5 px-3 font-semibold text-xs border-b-2 transition-colors flex items-center space-x-1.5 ${
            configTab === "body"
              ? "border-zinc-200 text-zinc-100"
              : "border-transparent text-zinc-400 hover:text-zinc-200"
          }`}
        >
          <span>Body</span>
          {request.body.type !== "none" && (
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
          )}
        </button>

        <button
          onClick={() => setConfigTab("chaining")}
          className={`py-2.5 px-3 font-semibold text-xs border-b-2 transition-colors flex items-center space-x-1.5 ${
            configTab === "chaining"
              ? "border-zinc-200 text-zinc-100"
              : "border-transparent text-zinc-400 hover:text-zinc-200"
          }`}
        >
          <LinkIcon className="w-3.5 h-3.5 text-cyan-400" />
          <span>Chain Vars</span>
          {chainRules.filter((r) => r.enabled).length > 0 && (
            <span className="px-1 rounded-full bg-cyan-500/20 text-cyan-300 text-[10px] font-mono">
              {chainRules.filter((r) => r.enabled).length}
            </span>
          )}
        </button>
      </div>

      {/* Configuration Body Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {/* PARAMS TAB */}
        {configTab === "params" && (
          <div className="space-y-3">
            <div className="flex items-center justify-between text-slate-400 text-[11px] font-mono">
              <span>QUERY PARAMETERS</span>
              <button
                onClick={handleAddParam}
                className="flex items-center space-x-1 text-violet-400 hover:text-violet-300 font-medium"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Param</span>
              </button>
            </div>

            <div className="space-y-1.5 font-mono">
              {request.params.map((param) => (
                <div
                  key={param.id}
                  className="flex items-center space-x-2 p-1.5 rounded-lg bg-[#141418] border border-white/10"
                >
                  <input
                    type="checkbox"
                    checked={param.enabled}
                    onChange={(e) => handleUpdateParam(param.id, { enabled: e.target.checked })}
                    className="rounded border-slate-700 text-violet-500 focus:ring-0 w-4 h-4 bg-[#09090b]"
                  />
                  <input
                    type="text"
                    placeholder="Key"
                    value={param.key}
                    onChange={(e) => handleUpdateParam(param.id, { key: e.target.value })}
                    className="w-1/3 px-2 py-1 bg-[#09090b] border border-white/10 rounded font-mono text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-violet-500"
                  />
                  <input
                    type="text"
                    placeholder="Value (supports {{VAR}})"
                    value={param.value}
                    onChange={(e) => handleUpdateParam(param.id, { value: e.target.value })}
                    className="flex-1 px-2 py-1 bg-[#09090b] border border-white/10 rounded font-mono text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-violet-500"
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
                <div className="text-center py-6 text-slate-500 font-sans">
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
                className="w-full px-3 py-2 bg-[#141418] border border-white/10 rounded-xl text-slate-200 font-medium focus:outline-none focus:border-violet-500"
              >
                <option value="none">No Auth</option>
                <option value="bearer">Bearer Token</option>
                <option value="apiKey">API Key (Header / Query)</option>
                <option value="basic">Basic Auth</option>
                <option value="cookie">Cookie Passthrough</option>
              </select>
            </div>

            {request.auth.type === "bearer" && (
              <div className="space-y-2 font-mono">
                <label className="block text-slate-400 text-xs font-medium font-sans">
                  Bearer Token
                </label>
                <input
                  type="text"
                  placeholder="{{SPECFORGE_AUTH_BEARER}} or sk_live_..."
                  value={request.auth.bearerToken || ""}
                  onChange={(e) =>
                    onUpdateRequest({
                      ...request,
                      auth: { ...request.auth, bearerToken: e.target.value },
                    })
                  }
                  className="w-full px-3 py-2 bg-[#141418] border border-white/10 rounded-xl font-mono text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-violet-500"
                />
              </div>
            )}

            {request.auth.type === "apiKey" && (
              <div className="space-y-3 font-mono">
                <div>
                  <label className="block text-slate-400 text-xs font-medium mb-1 font-sans">
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
                    className="w-full px-3 py-2 bg-[#141418] border border-white/10 rounded-xl text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-violet-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 text-xs font-medium mb-1 font-sans">
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
                    className="w-full px-3 py-2 bg-[#141418] border border-white/10 rounded-xl text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-violet-500"
                  />
                </div>
              </div>
            )}

            {request.auth.type === "none" && (
              <p className="text-slate-500 text-xs font-sans">
                This request does not use any authentication credentials.
              </p>
            )}
          </div>
        )}

        {/* HEADERS TAB */}
        {configTab === "headers" && (
          <div className="space-y-3">
            <div className="flex items-center justify-between text-slate-400 text-[11px] font-mono">
              <span>REQUEST HEADERS</span>
              <button
                onClick={handleAddHeader}
                className="flex items-center space-x-1 text-violet-400 hover:text-violet-300 font-medium"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Header</span>
              </button>
            </div>

            <div className="space-y-1.5 font-mono">
              {request.headers.map((header) => (
                <div
                  key={header.id}
                  className="flex items-center space-x-2 p-1.5 rounded-lg bg-[#141418] border border-white/10"
                >
                  <input
                    type="checkbox"
                    checked={header.enabled}
                    onChange={(e) => handleUpdateHeader(header.id, { enabled: e.target.checked })}
                    className="rounded border-slate-700 text-violet-500 focus:ring-0 w-4 h-4 bg-[#09090b]"
                  />
                  <input
                    type="text"
                    placeholder="Header Name"
                    value={header.key}
                    onChange={(e) => handleUpdateHeader(header.id, { key: e.target.value })}
                    className="w-1/3 px-2 py-1 bg-[#09090b] border border-white/10 rounded text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-violet-500"
                  />
                  <input
                    type="text"
                    placeholder="Header Value"
                    value={header.value}
                    onChange={(e) => handleUpdateHeader(header.id, { value: e.target.value })}
                    className="flex-1 px-2 py-1 bg-[#09090b] border border-white/10 rounded text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-violet-500"
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
            <div className="pt-3 border-t border-white/10">
              <span className="text-[10px] text-slate-500 uppercase tracking-wider block mb-2 font-mono">
                Standard Suggestions:
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
                    className="px-2 py-0.5 rounded bg-[#141418] hover:bg-[#1c1c24] border border-white/10 text-[10px] text-slate-400 hover:text-slate-200 font-mono transition-colors"
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
                <div className="flex items-center space-x-1 bg-[#141418] p-0.5 rounded-lg border border-white/10">
                  <button
                    onClick={() => handleBodyTypeChange("none")}
                    className={`px-2 py-1 rounded text-[11px] font-medium transition-colors ${
                      request.body.type === "none"
                        ? "bg-white/10 text-violet-400 font-semibold"
                        : "text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    None
                  </button>
                  <button
                    onClick={() => handleBodyTypeChange("json")}
                    className={`px-2 py-1 rounded text-[11px] font-medium transition-colors ${
                      request.body.type === "json"
                        ? "bg-white/10 text-violet-400 font-semibold"
                        : "text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    Raw JSON
                  </button>
                  <button
                    onClick={() => handleBodyTypeChange("x-www-form-urlencoded")}
                    className={`px-2 py-1 rounded text-[11px] font-medium transition-colors ${
                      request.body.type === "x-www-form-urlencoded"
                        ? "bg-white/10 text-violet-400 font-semibold"
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
                    <span className="text-rose-400 text-[11px] font-medium flex items-center space-x-1 font-mono">
                      <AlertCircle className="w-3 h-3" />
                      <span>Invalid JSON</span>
                    </span>
                  ) : (
                    <span className="text-emerald-400 text-[11px] font-medium flex items-center space-x-1 font-mono">
                      <Check className="w-3 h-3" />
                      <span>Valid JSON</span>
                    </span>
                  )}
                  <button
                    onClick={handlePrettifyJson}
                    className="px-2.5 py-1 bg-[#141418] hover:bg-[#1c1c24] text-slate-200 rounded text-[11px] font-medium transition-colors border border-white/10"
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
                rows={11}
                className="w-full p-3 bg-[#09090b] border border-white/10 rounded-xl font-mono text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-violet-500 resize-none leading-relaxed"
              />
            )}

            {request.body.type === "none" && (
              <div className="text-center py-8 text-slate-500 font-sans">
                This request does not have a request body.
              </div>
            )}
          </div>
        )}

        {/* 🔗 VARIABLE CHAINING TAB (Feature 3) */}
        {configTab === "chaining" && (
          <div className="space-y-4">
            <div className="p-3 bg-cyan-950/20 border border-cyan-500/20 rounded-xl text-xs space-y-1">
              <div className="flex items-center space-x-1.5 font-semibold text-cyan-300">
                <LinkIcon className="w-4 h-4" />
                <span>Response-to-Environment Variable Chaining</span>
              </div>
              <p className="text-slate-400 text-[11px]">
                Extract dynamic values (like customer IDs, transaction tokens, or API keys) from the live JSON response directly into your active Environment variables.
              </p>
            </div>

            <div className="flex items-center justify-between text-slate-400 text-[11px] font-mono">
              <span>EXTRACTION RULES ({chainRules.length})</span>
              <button
                onClick={handleAddChainRule}
                className="flex items-center space-x-1 text-cyan-400 hover:text-cyan-300 font-medium"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Extraction Rule</span>
              </button>
            </div>

            <div className="space-y-2 font-mono">
              {chainRules.map((rule) => (
                <div
                  key={rule.id}
                  className="flex items-center space-x-2 p-2 rounded-xl bg-[#141418] border border-white/10"
                >
                  <input
                    type="checkbox"
                    checked={rule.enabled}
                    onChange={(e) => handleUpdateChainRule(rule.id, { enabled: e.target.checked })}
                    className="rounded border-slate-700 text-cyan-500 focus:ring-0 w-4 h-4 bg-[#09090b]"
                  />
                  <div className="flex-1 flex items-center space-x-1.5">
                    <span className="text-[10px] text-slate-500 uppercase">Extract:</span>
                    <input
                      type="text"
                      placeholder="JSON Path (e.g. id, data[0].token)"
                      value={rule.jsonPath}
                      onChange={(e) => handleUpdateChainRule(rule.id, { jsonPath: e.target.value })}
                      className="flex-1 px-2 py-1 bg-[#09090b] border border-white/10 rounded text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
                    />
                  </div>
                  <div className="flex-1 flex items-center space-x-1.5">
                    <span className="text-[10px] text-slate-500 uppercase">Save As:</span>
                    <input
                      type="text"
                      placeholder="VAR_NAME (e.g. LAST_ID)"
                      value={rule.envVarName}
                      onChange={(e) => handleUpdateChainRule(rule.id, { envVarName: e.target.value })}
                      className="flex-1 px-2 py-1 bg-[#09090b] border border-white/10 rounded text-xs text-cyan-300 focus:outline-none focus:border-cyan-500 uppercase"
                    />
                  </div>
                  <button
                    onClick={() => handleDeleteChainRule(rule.id)}
                    className="p-1 text-slate-500 hover:text-rose-400 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}

              {chainRules.length === 0 && (
                <div className="text-center py-6 text-slate-500 font-sans">
                  No variable extraction rules configured. Click &quot;Add Extraction Rule&quot; or click on any field in the JSON Response viewer!
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
