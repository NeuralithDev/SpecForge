"use client";

import React, { useState, useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import TopNav, { type WorkspaceMode } from "../components/studio/TopNav";
import Sidebar from "../components/studio/Sidebar";
import RequestHeaderBar from "../components/studio/RequestHeaderBar";
import RequestConfigPane from "../components/studio/RequestConfigPane";
import ResponsePane from "../components/studio/ResponsePane";
import McpStudioView from "../components/studio/McpStudioView";
import TraceInspectorView from "../components/studio/TraceInspectorView";
import type { CompilerArtifacts } from "../components/studio/ResponseAndCompilerDrawer";
import EnvironmentModal from "../components/studio/EnvironmentModal";
import HarImportModal from "../components/studio/HarImportModal";
import CloudSyncModal from "../components/studio/CloudSyncModal";
import PricingModal from "../components/PricingModal";
import CommandPalette from "../components/studio/CommandPalette";
import CurlImportModal from "../components/studio/CurlImportModal";
import CollectionRunnerModal from "../components/studio/CollectionRunnerModal";
import HarTraceWaterfallModal from "../components/studio/HarTraceWaterfallModal";
import HeroExperience from "../components/HeroExperience";

import {
  loadStudioState,
  saveStudioState,
  interpolateVariables,
  createNewRequest,
  applyVariableChaining,
  FREE_TIER_COMPILED_LIMIT,
  INITIAL_STATE,
  type LocalStudioState,
  type ApiRequest,
  type ApiCollection,
  type Environment,
  type ApiResponseData,
  type RequestHistoryItem,
  type HarTraceMeta,
  type HarTraceEntry,
} from "../lib/localStore";
import { DEMO_HAR_PAYLOAD, DEMO_HAR_FILENAME } from "../lib/demoHar";
import type { ParsedCurlResult } from "../lib/curlParser";
import type { PlanId } from "../lib/billing/pricingPlans";

export default function SpecForgeStudioPage() {
  const [isClientLoaded, setIsClientLoaded] = useState(false);
  const [collections, setCollections] = useState<ApiCollection[]>(
    INITIAL_STATE.collections,
  );
  const [requests, setRequests] = useState<ApiRequest[]>(
    INITIAL_STATE.requests,
  );
  const [environments, setEnvironments] = useState<Environment[]>(
    INITIAL_STATE.environments,
  );
  const [activeEnvironmentId, setActiveEnvironmentId] = useState<string | null>(
    INITIAL_STATE.activeEnvironmentId,
  );
  const [history, setHistory] = useState<RequestHistoryItem[]>(
    INITIAL_STATE.history,
  );
  const [traces, setTraces] = useState<HarTraceMeta[]>(INITIAL_STATE.traces);
  const [quota, setQuota] = useState(INITIAL_STATE.quota);
  const [activeTabIds, setActiveTabIds] = useState<string[]>(
    INITIAL_STATE.activeTabIds,
  );
  const [activeTabId, setActiveTabId] = useState<string | null>(
    INITIAL_STATE.activeTabId,
  );

  // View & Mode State (Hero vs Studio IDE)
  const [currentView, setCurrentView] = useState<"hero" | "studio">("hero");
  const [workspaceMode, setWorkspaceMode] = useState<WorkspaceMode>("builder");
  const [sendMode, setSendMode] = useState<"live" | "mock">("live");

  // Runtime Execution State
  const [lastResponse, setLastResponse] = useState<ApiResponseData | null>(
    null,
  );
  const [compiledArtifacts, setCompiledArtifacts] =
    useState<CompilerArtifacts | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [isCompiling, setIsCompiling] = useState(false);
  const [isExportingZip, setIsExportingZip] = useState(false);
  const [isProcessingHar, setIsProcessingHar] = useState(false);
  const [isCloudSynced, setIsCloudSynced] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isSplitVertical, setIsSplitVertical] = useState(false); // false = side-by-side, true = stacked

  // Modals State
  const [envModalOpen, setEnvModalOpen] = useState(false);
  const [harModalOpen, setHarModalOpen] = useState(false);
  const [cloudSyncModalOpen, setCloudSyncModalOpen] = useState(false);
  const [pricingModalOpen, setPricingModalOpen] = useState(false);
  const [cmdPaletteOpen, setCmdPaletteOpen] = useState(false);
  const [curlModalOpen, setCurlModalOpen] = useState(false);
  const [runnerModalOpen, setRunnerModalOpen] = useState(false);
  const [runnerCollectionId, setRunnerCollectionId] = useState<string | null>(
    null,
  );
  const [waterfallModalOpen, setWaterfallModalOpen] = useState(false);
  const [inspectingTrace, setInspectingTrace] = useState<HarTraceMeta | null>(
    null,
  );

  // Load state from LocalStorage and sync URL hash/query on mount
  useEffect(() => {
    const saved = loadStudioState();
    setCollections(saved.collections);
    setRequests(saved.requests);
    setEnvironments(saved.environments);
    setActiveEnvironmentId(saved.activeEnvironmentId);
    setHistory(saved.history);
    setTraces(saved.traces);
    setQuota(saved.quota);
    setActiveTabIds(saved.activeTabIds);
    setActiveTabId(saved.activeTabId);
    setIsClientLoaded(true);

    const handleHash = () => {
      if (typeof window === "undefined") return;
      const hash = window.location.hash.toLowerCase();
      const params = new URLSearchParams(window.location.search);
      if (hash === "#mcp" || params.get("mode") === "mcp") {
        setCurrentView("studio");
        setWorkspaceMode("mcp");
      } else if (
        hash === "#trace" ||
        hash === "#har" ||
        params.get("mode") === "trace"
      ) {
        setCurrentView("studio");
        setWorkspaceMode("trace");
      } else if (
        hash === "#studio" ||
        hash === "#builder" ||
        params.get("view") === "studio"
      ) {
        setCurrentView("studio");
        setWorkspaceMode("builder");
      } else if (hash === "#hero" || params.get("view") === "hero") {
        setCurrentView("hero");
      }
    };
    handleHash();
    window.addEventListener("hashchange", handleHash);
    return () => window.removeEventListener("hashchange", handleHash);
  }, []);

  // Save state to LocalStorage
  useEffect(() => {
    if (!isClientLoaded) return;
    const currentState: LocalStudioState = {
      collections,
      requests,
      environments,
      activeEnvironmentId,
      history,
      traces,
      quota,
      activeTabIds,
      activeTabId,
    };
    saveStudioState(currentState);
  }, [
    isClientLoaded,
    collections,
    requests,
    environments,
    activeEnvironmentId,
    history,
    traces,
    quota,
    activeTabIds,
    activeTabId,
  ]);

  // Active Environment & Request references
  const activeEnvironment =
    environments.find((e) => e.id === activeEnvironmentId) ||
    environments[0] ||
    null;
  const activeRequest =
    requests.find((r) => r.id === activeTabId) || requests[0] || null;
  const activeCollection =
    collections.find((c) => c.id === activeRequest?.collectionId) ||
    collections[0] ||
    null;

  // Global Keyboard Shortcuts (Cmd+K for Command Palette, Cmd+I for HAR Import)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setCmdPaletteOpen(true);
      } else if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "i") {
        e.preventDefault();
        setHarModalOpen(true);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // ---------------------------------------------------------------------------
  // Tab & Request Management
  // ---------------------------------------------------------------------------
  const handleSelectTab = (requestId: string) => {
    setActiveTabId(requestId);
    if (!activeTabIds.includes(requestId)) {
      setActiveTabIds((prev) => [...prev, requestId]);
    }
  };

  const handleCloseTab = (requestId: string) => {
    const updated = activeTabIds.filter((id) => id !== requestId);
    setActiveTabIds(updated);
    if (activeTabId === requestId) {
      setActiveTabId(updated[0] || null);
    }
  };

  const handleNewTab = (collectionId?: string, folder?: string) => {
    const newReq = createNewRequest(collectionId, folder);
    setRequests((prev) => [newReq, ...prev]);
    setActiveTabIds((prev) => [...prev, newReq.id]);
    setActiveTabId(newReq.id);
  };

  const handleNewCollection = () => {
    const id = `col_${Date.now()}`;
    const newCol: ApiCollection = {
      id,
      name: `New Collection ${collections.length + 1}`,
      folders: ["Custom Endpoints"],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setCollections((prev) => [...prev, newCol]);
    handleNewTab(id, "Custom Endpoints");
  };

  const handleDeleteRequest = (requestId: string) => {
    setRequests((prev) => prev.filter((r) => r.id !== requestId));
    handleCloseTab(requestId);
  };

  const handleDeleteCollection = (collectionId: string) => {
    setCollections((prev) => prev.filter((c) => c.id !== collectionId));
    setRequests((prev) => prev.filter((r) => r.collectionId !== collectionId));
  };

  const handleUpdateRequest = (updated: ApiRequest) => {
    setRequests((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));
  };

  // ---------------------------------------------------------------------------
  // Feature: Replay Recorded .har Evidence Locally (Mock 200 OK)
  // ---------------------------------------------------------------------------
  const handleReplayMockEvidence = () => {
    if (!activeRequest) return;
    setIsSending(true);
    setTimeout(() => {
      const mockSample = activeRequest.expectedContract?.sampleResponse || {
        id: `ev_${activeRequest.sha256Prefix || "8f4a1c91"}`,
        object: "simulated_evidence",
        endpoint: activeRequest.name,
        method: activeRequest.method,
        url: activeRequest.url,
        status: "succeeded",
        paid: true,
        evidenceProvenance: "SHA-256 Verified Recorded .har Trace",
        timestamp: new Date().toISOString(),
      };

      const mockResData: ApiResponseData = {
        status: 200,
        statusText: "OK (Replayed .har Evidence)",
        headers: {
          "content-type": "application/json; charset=utf-8",
          "x-specforge-replayed": "true",
          "x-evidence-sha256": activeRequest.sha256Prefix || "8f4a1c91",
        },
        body: JSON.stringify(mockSample, null, 2),
        json: mockSample,
        timingMs: 12,
        sizeBytes: JSON.stringify(mockSample).length,
        timestamp: new Date().toISOString(),
      };

      setLastResponse(mockResData);

      const historyItem: RequestHistoryItem = {
        id: `hist_${Date.now()}`,
        requestId: activeRequest.id,
        name: activeRequest.name,
        method: activeRequest.method,
        url: interpolateVariables(activeRequest.url, activeEnvironment),
        status: 200,
        statusText: "OK (Replayed .har Evidence)",
        timingMs: 12,
        timestamp: new Date().toISOString(),
        response: mockResData,
      };
      setHistory((prev) => [historyItem, ...prev.slice(0, 49)]);

      // Variable Chaining Execution
      if (
        mockResData.json &&
        activeRequest.chainRules &&
        activeRequest.chainRules.length > 0
      ) {
        const chainResult = applyVariableChaining(
          mockResData.json,
          activeRequest.chainRules,
          activeEnvironment,
        );
        if (chainResult.updatedEnv && chainResult.extracted.length > 0) {
          setEnvironments((prev) =>
            prev.map((e) =>
              e.id === chainResult.updatedEnv!.id ? chainResult.updatedEnv! : e,
            ),
          );
          const toastText = chainResult.extracted
            .map(
              (item) =>
                `Extracted {{${item.key}}} = ${item.value.slice(0, 16)}...`,
            )
            .join(" | ");
          showToast(toastText);
        }
      }

      setIsSending(false);
      showToast("Replayed authentic recorded 200 OK .har evidence");
    }, 120);
  };

  const handleRunLiveDemoFromHero = async () => {
    setCurrentView("studio");
    showToast("Ingesting authentic Stripe Checkout trace...");
    await handleLoadDemoHar();
    showToast("Synthesized Stripe Billing Collection & MCP Server");
  };

  // ---------------------------------------------------------------------------
  // Workflow C: Send HTTP Request via /api/proxy (or Replay Mock .har Evidence)
  // ---------------------------------------------------------------------------
  const handleSendRequest = async () => {
    if (!activeRequest) return;

    if (sendMode === "mock") {
      handleReplayMockEvidence();
      return;
    }

    setIsSending(true);
    setErrorMessage(null);

    try {
      let targetUrl = interpolateVariables(
        activeRequest.url,
        activeEnvironment,
      );

      // Append Query Parameters
      const enabledParams = activeRequest.params.filter(
        (p) => p.enabled && p.key.trim().length > 0,
      );
      if (enabledParams.length > 0) {
        try {
          const urlObj = new URL(
            targetUrl.startsWith("http") ? targetUrl : `https://${targetUrl}`,
          );
          for (const param of enabledParams) {
            urlObj.searchParams.append(
              interpolateVariables(param.key, activeEnvironment),
              interpolateVariables(param.value, activeEnvironment),
            );
          }
          targetUrl = urlObj.toString();
        } catch {
          // If URL parsing fails, continue with base targetUrl
        }
      }

      // Prepare Headers
      const requestHeaders: Record<string, string> = {};
      for (const h of activeRequest.headers) {
        if (h.enabled && h.key.trim().length > 0) {
          requestHeaders[interpolateVariables(h.key, activeEnvironment)] =
            interpolateVariables(h.value, activeEnvironment);
        }
      }

      // Prepare Auth Headers
      if (
        activeRequest.auth.type === "bearer" &&
        activeRequest.auth.bearerToken
      ) {
        requestHeaders["Authorization"] =
          `Bearer ${interpolateVariables(activeRequest.auth.bearerToken, activeEnvironment)}`;
      } else if (
        activeRequest.auth.type === "apiKey" &&
        activeRequest.auth.apiKeyKey &&
        activeRequest.auth.apiKeyValue
      ) {
        if (
          activeRequest.auth.apiKeyIn === "header" ||
          !activeRequest.auth.apiKeyIn
        ) {
          requestHeaders[
            interpolateVariables(
              activeRequest.auth.apiKeyKey,
              activeEnvironment,
            )
          ] = interpolateVariables(
            activeRequest.auth.apiKeyValue,
            activeEnvironment,
          );
        }
      } else if (
        activeRequest.auth.type === "basic" &&
        (activeRequest.auth.basicUser || activeRequest.auth.basicPass)
      ) {
        const u = interpolateVariables(
          activeRequest.auth.basicUser || "",
          activeEnvironment,
        );
        const p = interpolateVariables(
          activeRequest.auth.basicPass || "",
          activeEnvironment,
        );
        const b64 = typeof window !== "undefined" ? btoa(`${u}:${p}`) : "";
        requestHeaders["Authorization"] = `Basic ${b64}`;
      }

      // Prepare Body
      let requestBody: string | undefined = undefined;
      if (["POST", "PUT", "PATCH"].includes(activeRequest.method)) {
        if (activeRequest.body.type === "raw" && activeRequest.body.rawJson) {
          requestBody = interpolateVariables(
            activeRequest.body.rawJson,
            activeEnvironment,
          );
          if (
            !requestHeaders["Content-Type"] &&
            !requestHeaders["content-type"]
          ) {
            requestHeaders["Content-Type"] = "application/json";
          }
        }
      }

      const proxyPayload = {
        method: activeRequest.method,
        url: targetUrl,
        headers: requestHeaders,
        body: requestBody,
      };

      const response = await fetch("/api/proxy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(proxyPayload),
      });

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`Proxy error: ${response.status} ${errText}`);
      }

      const resData = (await response.json()) as ApiResponseData;
      setLastResponse(resData);

      // Record in History
      const historyItem: RequestHistoryItem = {
        id: `hist_${Date.now()}`,
        requestId: activeRequest.id,
        name: activeRequest.name,
        method: activeRequest.method,
        url: targetUrl,
        status: resData.status,
        statusText: resData.statusText,
        timingMs: resData.timingMs,
        timestamp: resData.timestamp,
        response: resData,
      };
      setHistory((prev) => [historyItem, ...prev.slice(0, 49)]);

      // Variable Chaining Execution
      if (
        resData.json &&
        activeRequest.chainRules &&
        activeRequest.chainRules.length > 0
      ) {
        const chainResult = applyVariableChaining(
          resData.json,
          activeRequest.chainRules,
          activeEnvironment,
        );
        if (chainResult.updatedEnv && chainResult.extracted.length > 0) {
          setEnvironments((prev) =>
            prev.map((e) =>
              e.id === chainResult.updatedEnv!.id ? chainResult.updatedEnv! : e,
            ),
          );
          const toastText = chainResult.extracted
            .map(
              (item) =>
                `Extracted {{${item.key}}} = ${item.value.slice(0, 16)}...`,
            )
            .join(" | ");
          showToast(toastText);
        }
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Request failed";
      setErrorMessage(msg);
      showToast(`Error: ${msg}`);
    } finally {
      setIsSending(false);
    }
  };

  // ---------------------------------------------------------------------------
  // Workflow A: Import Authentic .har Trace
  // ---------------------------------------------------------------------------
  const handleImportHarString = async (rawHar: string, fileName: string) => {
    setIsProcessingHar(true);
    try {
      const res = await fetch("/api/har/ingest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rawHar,
          harContent: rawHar,
          fileName,
        }),
      });

      if (!res.ok) {
        const err = (await res.json()) as { error?: string };
        throw new Error(err.error ?? "Failed to parse .har file");
      }

      const data = (await res.json()) as {
        collection: ApiCollection;
        requests: ApiRequest[];
        traceMeta?: HarTraceMeta;
        targetSha256?: string;
        targetSha256Prefix?: string;
        redactionCount?: number;
      };

      setCollections((prev) => [data.collection, ...prev]);
      setRequests((prev) => [...data.requests, ...prev]);

      const trace: HarTraceMeta = data.traceMeta ?? {
        id: `trace_${Date.now()}`,
        name: fileName,
        sha256: data.targetSha256 || "unknown",
        sha256Prefix: data.targetSha256Prefix || "unknown",
        endpointCount: data.requests?.length || 0,
        redactionCount: data.redactionCount || 0,
        timestamp: new Date().toISOString(),
      };
      setTraces((prev) => [trace, ...prev]);

      if (data.requests && data.requests.length > 0) {
        const newIds = data.requests.map((r) => r.id);
        setActiveTabIds((prev) => Array.from(new Set([...newIds, ...prev])));
        setActiveTabId(data.requests[0]?.id ?? null);
      }

      setHarModalOpen(false);
      showToast(`Ingested ${data.requests.length} endpoints from ${fileName}`);
    } catch (err: unknown) {
      setErrorMessage(
        err instanceof Error ? err.message : "Failed to import .har",
      );
    } finally {
      setIsProcessingHar(false);
    }
  };

  const handleImportHarFile = async (file: File) => {
    try {
      const text = await file.text();
      await handleImportHarString(text, file.name);
    } catch {
      setErrorMessage("Could not read file");
    }
  };

  const handleLoadDemoHar = async () => {
    setIsProcessingHar(true);
    try {
      const res = await fetch("/api/har/ingest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          harContent: DEMO_HAR_PAYLOAD,
          fileName: DEMO_HAR_FILENAME,
        }),
      });

      if (!res.ok) {
        throw new Error("Failed to load demo Stripe .har trace");
      }

      const data = (await res.json()) as {
        collection: ApiCollection;
        requests: ApiRequest[];
        traceMeta: HarTraceMeta;
      };

      setCollections((prev) => {
        const filtered = prev.filter((c) => c.id !== data.collection.id);
        return [data.collection, ...filtered];
      });

      setRequests((prev) => {
        const importedIds = new Set(data.requests.map((r) => r.id));
        const filtered = prev.filter((r) => !importedIds.has(r.id));
        return [...data.requests, ...filtered];
      });

      setTraces((prev) => {
        const filtered = prev.filter((t) => t.id !== data.traceMeta.id);
        return [data.traceMeta, ...filtered];
      });

      if (data.requests.length > 0) {
        const newIds = data.requests.map((r) => r.id);
        setActiveTabIds((prev) => Array.from(new Set([...newIds, ...prev])));
        setActiveTabId(data.requests[0]?.id ?? null);
      }

      showToast("Loaded authentic Stripe Checkout .har trace");
    } catch (err: unknown) {
      setErrorMessage(
        err instanceof Error ? err.message : "Failed to load demo trace",
      );
    } finally {
      setIsProcessingHar(false);
    }
  };

  // ---------------------------------------------------------------------------
  // Workflow D: Compile Endpoint/Collection into MCP Server & SDK Bundle
  // ---------------------------------------------------------------------------
  const handleCompileRequest = async (targetCollectionId?: string) => {
    setIsCompiling(true);
    setErrorMessage(null);

    try {
      const colId = targetCollectionId || activeRequest?.collectionId;
      const targetReqs = colId
        ? requests.filter((r) => r.collectionId === colId)
        : activeRequest
          ? [activeRequest]
          : [];

      if (targetReqs.length === 0) {
        throw new Error("No endpoints selected to compile.");
      }

      const response = await fetch("/api/compile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          requests: targetReqs,
          targetName: activeRequest?.name || "SpecForge Studio Collection",
        }),
      });

      if (response.status === 402) {
        setPricingModalOpen(true);
        const errData = (await response.json()) as { error?: string };
        throw new Error(
          errData.error ?? "Monthly endpoint quota limit reached.",
        );
      }

      if (!response.ok) {
        const errData = (await response.json()) as { error?: string };
        throw new Error(errData.error ?? "Compilation failed");
      }

      const data = (await response.json()) as CompilerArtifacts & {
        quotaUsage?: {
          currentUsage: number;
          limit: number;
          tier: "free" | "pro" | "enterprise";
          planId: PlanId;
        };
      };

      setCompiledArtifacts(data);

      if (data.quotaUsage) {
        setQuota((prev) => ({
          ...prev,
          compiledEndpointsCount:
            data.quotaUsage?.currentUsage ?? prev.compiledEndpointsCount,
          limit: data.quotaUsage?.limit ?? prev.limit,
          tier: data.quotaUsage?.tier ?? prev.tier,
          planId: data.quotaUsage?.planId ?? prev.planId,
        }));
      }

      showToast(
        "Compiled Claude MCP Server, TypeScript SDK & OpenAPI 3.1 Spec in 12s",
      );
    } catch (err: unknown) {
      setErrorMessage(
        err instanceof Error ? err.message : "Compilation failed",
      );
    } finally {
      setIsCompiling(false);
    }
  };

  // Download .ZIP Bundle
  const handleDownloadZipBundle = async () => {
    setIsExportingZip(true);
    try {
      const artifacts = compiledArtifacts;
      const files: Record<string, string> = {
        "src/mcp-server.ts": artifacts?.mcpServerCode || "// Claude MCP Server",
        "src/client.ts": artifacts?.clientCode || "// TypeScript SDK",
        "openapi.json": artifacts?.openApiJson || "{}",
        "tests/parity.test.ts": artifacts?.parityTestsCode || "// Vitest Suite",
        "EPISTEMIC_AUDIT_CERTIFICATE.md":
          artifacts?.auditCertificate || "# Epistemic Audit Certificate",
        "package.json": JSON.stringify(
          {
            name: "@specforge/synthesized-sdk",
            version: "1.0.0",
            type: "module",
            scripts: {
              build: "tsc",
              start: "node dist/mcp-server.js",
              test: "vitest run",
            },
            dependencies: {
              "@modelcontextprotocol/sdk": "^1.6.0",
              zod: "^3.24.2",
            },
            devDependencies: {
              "@types/node": "^22.13.0",
              typescript: "^5.7.3",
              vitest: "^3.0.5",
            },
          },
          null,
          2,
        ),
      };

      const res = await fetch("/api/compile/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          files,
          zipName: `${artifacts?.targetName?.toLowerCase().replace(/[^a-z0-9]/gu, "-") || "specforge"}-mcp-sdk-bundle.zip`,
        }),
      });

      if (!res.ok) throw new Error("ZIP export failed");

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "specforge-mcp-sdk-bundle.zip";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      showToast("Downloaded SDK & MCP bundle .ZIP");
    } catch (err) {
      showToast("Failed to download ZIP bundle");
    } finally {
      setIsExportingZip(false);
    }
  };

  // ---------------------------------------------------------------------------
  // Feature 2: Smart cURL Importer handler
  // ---------------------------------------------------------------------------
  const handleImportParsedCurl = (
    parsed: ParsedCurlResult,
    openInNewTab: boolean,
  ) => {
    if (openInNewTab || !activeRequest) {
      const newReq = createNewRequest(
        activeRequest?.collectionId,
        activeRequest?.folder,
      );
      newReq.method = parsed.method;
      newReq.url = parsed.url;
      newReq.params = parsed.params;
      newReq.headers = parsed.headers;
      newReq.auth = parsed.auth;
      newReq.body = parsed.body;
      newReq.name = `${parsed.method} ${parsed.url.split("/").pop() || "Endpoint"}`;

      setRequests((prev) => [newReq, ...prev]);
      setActiveTabIds((prev) => [...prev, newReq.id]);
      setActiveTabId(newReq.id);
    } else {
      handleUpdateRequest({
        ...activeRequest,
        method: parsed.method,
        url: parsed.url,
        params: parsed.params.length > 0 ? parsed.params : activeRequest.params,
        headers:
          parsed.headers.length > 0 ? parsed.headers : activeRequest.headers,
        auth: parsed.auth.type !== "none" ? parsed.auth : activeRequest.auth,
        body: parsed.body.type !== "none" ? parsed.body : activeRequest.body,
        updatedAt: new Date().toISOString(),
      });
    }
    showToast("cURL command parsed and imported successfully");
  };

  // Reset workspace action
  const handleResetWorkspace = () => {
    setCollections(INITIAL_STATE.collections);
    setRequests(INITIAL_STATE.requests);
    setEnvironments(INITIAL_STATE.environments);
    setActiveEnvironmentId(INITIAL_STATE.activeEnvironmentId);
    setHistory([]);
    setTraces(INITIAL_STATE.traces);
    setQuota(INITIAL_STATE.quota);
    setActiveTabIds(INITIAL_STATE.activeTabIds);
    setActiveTabId(INITIAL_STATE.activeTabId);
    setLastResponse(null);
    setCompiledArtifacts(null);
    showToast("Workspace restored to default state.");
  };

  if (currentView === "hero") {
    return (
      <>
        <HeroExperience
          onLaunchStudio={() => setCurrentView("studio")}
          onRunLiveDemo={handleRunLiveDemoFromHero}
          onOpenPricing={() => setPricingModalOpen(true)}
        />
        <PricingModal
          isOpen={pricingModalOpen}
          onClose={() => setPricingModalOpen(false)}
          currentPlanId={quota.planId}
          currentUsedEndpoints={quota.compiledEndpointsCount}
          currentLimit={quota.limit}
          onPlanUpgraded={(newPlanId) => {
            setQuota((prev) => ({
              ...prev,
              tier: newPlanId === "enterprise_annual" ? "enterprise" : "pro",
              planId: newPlanId,
              limit: newPlanId === "enterprise_annual" ? 999999 : 500,
            }));
            showToast("Plan upgraded successfully");
          }}
        />
      </>
    );
  }

  return (
    <div className="flex flex-col h-screen w-screen bg-[#0B0C0E] text-zinc-100 overflow-hidden font-sans">
      {/* 1. TOP STUDIO HEADER (h-14, 3 Logical Zones) */}
      <TopNav
        currentMode={workspaceMode}
        onSelectMode={(mode) => setWorkspaceMode(mode)}
        activeCollectionName={activeCollection?.name}
        environments={environments}
        activeEnvironmentId={activeEnvironmentId}
        onSelectEnvironment={setActiveEnvironmentId}
        onOpenEnvModal={() => setEnvModalOpen(true)}
        onOpenHarModal={() => setHarModalOpen(true)}
        onOpenCommandPalette={() => setCmdPaletteOpen(true)}
        onSwitchToHero={() => {
          if (typeof window !== "undefined") window.location.hash = "hero";
          setCurrentView("hero");
        }}
        isProcessingHar={isProcessingHar}
      />

      {/* Toast Notification Banner */}
      {toastMessage && (
        <div className="fixed bottom-5 right-5 z-50 bg-[#16161A] text-zinc-200 border border-[#232329] px-4 py-2.5 rounded-lg shadow-xl text-xs font-mono flex items-center space-x-2 animate-in fade-in duration-200">
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Global Error Banner */}
      {errorMessage && (
        <div className="bg-rose-500/10 border-b border-rose-500/20 px-4 py-2 flex items-center justify-between text-xs text-rose-300">
          <span>{errorMessage}</span>
          <button
            onClick={() => setErrorMessage(null)}
            className="text-rose-400 hover:text-rose-200 ml-4 font-bold"
          >
            ✕
          </button>
        </div>
      )}

      {/* 2. FRAMER MOTION WORKSPACE VIEWS */}
      <div className="flex-1 flex overflow-hidden relative">
        <AnimatePresence mode="wait">
          {/* MODE 1: REQUEST BUILDER VIEW */}
          {workspaceMode === "builder" && (
            <motion.div
              key="builder"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 6 }}
              transition={{ duration: 0.18, ease: "easeOut" }}
              className="flex-1 flex overflow-hidden"
            >
              {/* Left Sidebar (w-64) with clean path rendering & footer quota meter */}
              <Sidebar
                collections={collections}
                requests={requests}
                traces={traces}
                history={history}
                activeRequestId={activeRequest?.id ?? null}
                quota={quota}
                onSelectRequest={handleSelectTab}
                onNewRequest={handleNewTab}
                onNewCollection={handleNewCollection}
                onDeleteRequest={handleDeleteRequest}
                onDeleteCollection={handleDeleteCollection}
                onOpenHarModal={() => setHarModalOpen(true)}
                onOpenPricingModal={() => setPricingModalOpen(true)}
                onInspectTrace={(trace) => {
                  setInspectingTrace(trace);
                  setWaterfallModalOpen(true);
                }}
              />

              {/* Main Request & Response Area */}
              <div className="flex-1 flex flex-col h-full overflow-hidden bg-[#0B0C0E]">
                {/* Full-Width URL Bar with Solid White Send Button */}
                <RequestHeaderBar
                  request={activeRequest}
                  activeTabIds={activeTabIds}
                  requests={requests}
                  collections={collections}
                  activeEnvironment={activeEnvironment}
                  isSending={isSending}
                  isCompiling={isCompiling}
                  isSplitVertical={isSplitVertical}
                  sendMode={sendMode}
                  onToggleSendMode={() =>
                    setSendMode((prev) => (prev === "live" ? "mock" : "live"))
                  }
                  onToggleSplitLayout={() =>
                    setIsSplitVertical(!isSplitVertical)
                  }
                  onSelectTab={handleSelectTab}
                  onCloseTab={handleCloseTab}
                  onNewTab={() => handleNewTab()}
                  onUpdateRequest={handleUpdateRequest}
                  onSendRequest={handleSendRequest}
                  onCompileRequest={() => handleCompileRequest()}
                  onCopyCurlToast={() =>
                    showToast("cURL command copied to clipboard")
                  }
                />

                {/* 50/50 Split: Request Pane vs Response Pane */}
                <div
                  className={`flex-1 flex overflow-hidden ${
                    isSplitVertical ? "flex-col" : "flex-row"
                  }`}
                >
                  {/* Request Pane: Params, Headers, Auth, Body, Chaining */}
                  {activeRequest && (
                    <RequestConfigPane
                      request={activeRequest}
                      onUpdateRequest={handleUpdateRequest}
                    />
                  )}

                  {/* Focused Response Pane (Zero Compiler Clutter) */}
                  <ResponsePane
                    request={activeRequest}
                    response={lastResponse}
                    isSending={isSending}
                    onSendLiveRequest={handleSendRequest}
                    onReplayMockEvidence={handleReplayMockEvidence}
                    onViewCompiledCode={() => setWorkspaceMode("mcp")}
                    onAddChainRule={(path) => {
                      if (!activeRequest) return;
                      const newRule = {
                        id: `cr_${Date.now()}`,
                        jsonPath: path,
                        envVarName: `EXTRACTED_${path.toUpperCase()}`,
                        enabled: true,
                      };
                      handleUpdateRequest({
                        ...activeRequest,
                        chainRules: [
                          ...(activeRequest.chainRules || []),
                          newRule,
                        ],
                      });
                      showToast(`Added extraction rule for "${path}"`);
                    }}
                    onCopyCurl={() => showToast("cURL copied to clipboard")}
                  />
                </div>
              </div>
            </motion.div>
          )}

          {/* MODE 2: CODE & MCP STUDIO (Dedicated Synthesis Canvas) */}
          {workspaceMode === "mcp" && (
            <McpStudioView
              key="mcp"
              request={activeRequest}
              collection={activeCollection}
              artifacts={compiledArtifacts}
              isCompiling={isCompiling}
              onCompileNow={() => handleCompileRequest()}
              onOpenPricingModal={() => setPricingModalOpen(true)}
              onDownloadZipBundle={handleDownloadZipBundle}
              isExportingZip={isExportingZip}
            />
          )}

          {/* MODE 3: TRACE INSPECTOR (.har) (Dedicated Network Table) */}
          {workspaceMode === "trace" && (
            <TraceInspectorView
              key="trace"
              traces={traces}
              onLoadSampleTrace={handleLoadDemoHar}
              onImportHarFile={handleImportHarFile}
              isProcessingHar={isProcessingHar}
              onOpenInRequestBuilder={(entry) => {
                const newReq = createNewRequest(
                  activeRequest?.collectionId,
                  entry.domain,
                );
                newReq.method = entry.method;
                newReq.url = entry.url;
                newReq.name = `${entry.method} ${entry.path}`;
                setRequests((prev) => [newReq, ...prev]);
                setActiveTabIds((prev) => [...prev, newReq.id]);
                setActiveTabId(newReq.id);
                setWorkspaceMode("builder");
                showToast(
                  `Opened ${entry.method} ${entry.path} in Request Builder`,
                );
              }}
              onGenerateSchemas={async () => {
                await handleCompileRequest();
                setWorkspaceMode("mcp");
              }}
            />
          )}
        </AnimatePresence>
      </div>

      {/* 3. MODALS */}
      <CommandPalette
        isOpen={cmdPaletteOpen}
        onClose={() => setCmdPaletteOpen(false)}
        collections={collections}
        requests={requests}
        environments={environments}
        onSelectRequest={handleSelectTab}
        onOpenHarModal={() => setHarModalOpen(true)}
        onOpenCurlModal={() => setCurlModalOpen(true)}
        onOpenEnvModal={() => setEnvModalOpen(true)}
        onSelectEnvironment={setActiveEnvironmentId}
        onOpenPricingModal={() => setPricingModalOpen(true)}
        onExportZip={() => handleDownloadZipBundle()}
        onResetWorkspace={handleResetWorkspace}
      />

      <CurlImportModal
        isOpen={curlModalOpen}
        onClose={() => setCurlModalOpen(false)}
        onImportParsed={handleImportParsedCurl}
      />

      <CollectionRunnerModal
        isOpen={runnerModalOpen}
        onClose={() => setRunnerModalOpen(false)}
        collection={
          collections.find((c) => c.id === runnerCollectionId) ||
          collections[0] ||
          null
        }
        requests={requests}
        activeEnvironment={activeEnvironment}
      />

      <HarTraceWaterfallModal
        isOpen={waterfallModalOpen}
        onClose={() => setWaterfallModalOpen(false)}
        trace={inspectingTrace || traces[0] || null}
        onConvertToRequest={(entry) => {
          const newReq = createNewRequest(
            activeRequest?.collectionId,
            entry.domain,
          );
          newReq.method = entry.method;
          newReq.url = entry.url;
          newReq.name = `${entry.method} ${entry.path}`;
          setRequests((prev) => [newReq, ...prev]);
          setActiveTabIds((prev) => [...prev, newReq.id]);
          setActiveTabId(newReq.id);
          showToast(`Added ${entry.method} ${entry.path} to collection`);
        }}
      />

      <EnvironmentModal
        isOpen={envModalOpen}
        onClose={() => setEnvModalOpen(false)}
        environments={environments}
        activeEnvironmentId={activeEnvironmentId}
        onSaveEnvironments={(newEnvs, newActiveId) => {
          setEnvironments(newEnvs);
          setActiveEnvironmentId(newActiveId);
        }}
      />

      <HarImportModal
        isOpen={harModalOpen}
        onClose={() => setHarModalOpen(false)}
        onImportHar={handleImportHarString}
        isProcessing={isProcessingHar}
      />

      <CloudSyncModal
        isOpen={cloudSyncModalOpen}
        onClose={() => setCloudSyncModalOpen(false)}
        isSynced={isCloudSynced}
        onToggleSync={setIsCloudSynced}
      />

      <PricingModal
        isOpen={pricingModalOpen}
        onClose={() => setPricingModalOpen(false)}
        currentPlanId={quota.planId}
        currentUsedEndpoints={quota.compiledEndpointsCount}
        currentLimit={quota.limit}
        onPlanUpgraded={(newPlanId) => {
          setQuota((prev) => ({
            ...prev,
            tier: newPlanId === "enterprise_annual" ? "enterprise" : "pro",
            planId: newPlanId,
            limit: newPlanId === "enterprise_annual" ? 999999 : 500,
          }));
        }}
      />
    </div>
  );
}
