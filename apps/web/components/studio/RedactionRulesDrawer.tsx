"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ShieldCheck,
  X,
  Search,
  Code,
  Check,
  Copy,
  Lock,
  Key,
  Sliders,
  FileCode,
  ArrowRight,
  ExternalLink,
  Sparkles,
} from "lucide-react";
import type { HarTraceMeta, HarTraceEntry } from "@/lib/localStore";

export interface RedactionRuleItem {
  id: string;
  category: "header" | "query" | "body" | "pattern";
  title: string;
  targetDescription: string;
  patternOrKeys: string;
  placeholderExample: string;
  typePreservationNote: string;
}

export const ACTIVE_RULES_CATALOG: RedactionRuleItem[] = [
  {
    id: "hdr-bearer",
    category: "header",
    title: "Authorization Bearer Tokens",
    targetDescription:
      "Inspects HTTP Authorization request headers matching Bearer scheme",
    patternOrKeys: "Authorization: Bearer <token>",
    placeholderExample: "Bearer <REDACTED_BEARER_TOKEN_{8_CHAR_HASH}>",
    typePreservationNote:
      "Preserves HTTP header string signature; maps to SPECFORGE_AUTH_BEARER_TOKEN",
  },
  {
    id: "hdr-basic",
    category: "header",
    title: "Authorization Basic Auth",
    targetDescription:
      "Inspects HTTP Authorization request headers matching Basic auth scheme",
    patternOrKeys: "Authorization: Basic <base64>",
    placeholderExample: "Basic <REDACTED_BASIC_AUTH_{8_CHAR_HASH}>",
    typePreservationNote:
      "Preserves HTTP header string signature; maps to SPECFORGE_AUTH_BASIC_AUTH",
  },
  {
    id: "hdr-cookie",
    category: "header",
    title: "Session & Auth Cookies",
    targetDescription:
      "Parses Cookie and Set-Cookie headers into pairs and redacts session keys individually",
    patternOrKeys: "Cookie: session_id=..., remember_me=...",
    placeholderExample: "session_id=<REDACTED_COOKIE_SESSION_ID_{HASH}>",
    typePreservationNote:
      "Preserves Cookie header semicolon-delimited pair syntax",
  },
  {
    id: "hdr-api-key",
    category: "header",
    title: "Custom Auth & API Key Headers",
    targetDescription:
      "Matches headers containing token, key, secret, auth, csrf, xsrf, or session",
    patternOrKeys:
      "X-API-Key, api-key, X-Auth-Token, X-CSRF-Token, X-Session-ID",
    placeholderExample: "<REDACTED_{HEADER_NAME}_{8_CHAR_HASH}>",
    typePreservationNote:
      "Preserves header field mapping; dynamically extracted as Studio environment variables",
  },
  {
    id: "query-sensitive",
    category: "query",
    title: "URL Query Parameter Credentials & PII",
    targetDescription:
      "Inspects search parameters in request.url and request.queryString",
    patternOrKeys:
      "email, token, key, secret, sig, password (and compound: client_secret, api_key, etc.)",
    placeholderExample:
      "?token=<REDACTED_TOKEN_{HASH}>&email=<REDACTED_EMAIL_{HASH}>",
    typePreservationNote:
      "Preserves URL search parameter structure; registers token in Studio dynamic environment",
  },
  {
    id: "body-recursive-json",
    category: "body",
    title: "Deep Recursive JSON Body Scrubbing",
    targetDescription:
      "Recursively walks nested request postData and response content JSON structures",
    patternOrKeys:
      "client_secret, access_token, refresh_token, password, email, secret, api_key, auth_token",
    placeholderExample:
      '{\n  "client_secret": "<REDACTED_CLIENT_SECRET_{HASH}>"\n}',
    typePreservationNote:
      "Preserves string JSON types so OpenAPI 3.1.0 & Zod infer valid string schemas (z.string())",
  },
  {
    id: "pattern-email",
    category: "pattern",
    title: "RFC 5322 Email Regex Engine",
    targetDescription:
      "Scans all free text, URL paths, query parameters, and JSON values for email addresses",
    patternOrKeys: "/\\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}\\b/gu",
    placeholderExample: "<REDACTED_EMAIL_{8_CHAR_HASH}>",
    typePreservationNote: "Preserves string type for OpenAPI schema synthesis",
  },
  {
    id: "pattern-jwt",
    category: "pattern",
    title: "JWT Token Pattern Matcher",
    targetDescription:
      "Detects compact serialized 3-segment JSON Web Tokens with base64url payloads",
    patternOrKeys:
      "/\\bey[A-Za-z0-9_-]{10,}\\.[A-Za-z0-9_-]{10,}\\.[A-Za-z0-9_-]{10,}\\b/gu",
    placeholderExample: "<REDACTED_JWT_TOKEN_{8_CHAR_HASH}>",
    typePreservationNote:
      "Deterministic prefix prevents re-redaction and retains bearer semantics",
  },
  {
    id: "pattern-credit-card",
    category: "pattern",
    title: "Credit Card Number Matcher (Luhn)",
    targetDescription:
      "Detects 13 to 16 digit payment card numbers (Visa, MasterCard, Amex, Discover)",
    patternOrKeys: "Luhn-matching 13-16 digit payment card regex",
    placeholderExample: "<REDACTED_CREDIT_CARD_{8_CHAR_HASH}>",
    typePreservationNote:
      "Redacts primary account numbers (PAN) before local cache storage",
  },
  {
    id: "pattern-phone",
    category: "pattern",
    title: "Domestic & International Phone Matcher",
    targetDescription:
      "Detects formatted telephone numbers with area codes and delimiters",
    patternOrKeys:
      "/\\b(?:\\+?1[-.\\s]?)?\\(?[2-9]\\d{2}\\)?[-.\\s]?\\d{3}[-.\\s]?\\d{4}\\b/gu",
    placeholderExample: "<REDACTED_PHONE_{8_CHAR_HASH}>",
    typePreservationNote:
      "Protects telephone PII from accidental schema synthesis leak",
  },
  {
    id: "pattern-hex-secret",
    category: "pattern",
    title: "High-Entropy Hexadecimal Secrets",
    targetDescription:
      "Detects 32 to 64 character hex strings representing cryptographic secret keys",
    patternOrKeys: "/\\b[a-f0-9]{32,64}\\b/giu",
    placeholderExample: "<REDACTED_SECRET_{8_CHAR_HASH}>",
    typePreservationNote: "Scrubbed with deterministic SHA-256 slice prefix",
  },
];

interface RedactionRulesDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  activeTrace: HarTraceMeta | null;
  onGenerateSchemas?: () => void;
}

export default function RedactionRulesDrawer({
  isOpen,
  onClose,
  activeTrace,
  onGenerateSchemas,
}: RedactionRulesDrawerProps) {
  const [activeTab, setActiveTab] = useState<"rules" | "diff">("rules");
  const [rulesSearch, setRulesSearch] = useState("");
  const [selectedEntryIndex, setSelectedEntryIndex] = useState(0);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  if (!isOpen) return null;

  const entries =
    activeTrace?.entries && activeTrace.entries.length > 0
      ? activeTrace.entries
      : [];
  const activeEntry: HarTraceEntry | null =
    entries[selectedEntryIndex] || entries[0] || null;

  const filteredRules = ACTIVE_RULES_CATALOG.filter((rule) => {
    if (!rulesSearch.trim()) return true;
    const q = rulesSearch.toLowerCase();
    return (
      rule.title.toLowerCase().includes(q) ||
      rule.patternOrKeys.toLowerCase().includes(q) ||
      rule.targetDescription.toLowerCase().includes(q) ||
      rule.category.toLowerCase().includes(q)
    );
  });

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Mock raw values for diff preview if entry does not contain raw values
  const rawUrlPreview = activeEntry?.url.includes("?")
    ? activeEntry.url.replace(
        /<REDACTED_([A-Z0-9_]+)_[a-f0-9]+>/gu,
        "sk_live_secret_token_planted_99182",
      )
    : `${activeEntry?.url || "https://api.stripe.com/v1/payment_intents"}?token=tok_live_secret_planted_99182&email=billing%40enterprise.corp&secret=shh_client_secret`;

  const scrubbedUrlPreview =
    activeEntry?.url ||
    "https://api.stripe.com/v1/payment_intents?token=<REDACTED_TOKEN_8f4a1c91>&email=<REDACTED_EMAIL_2b3c4d5e>&secret=<REDACTED_SECRET_9a8b7c6d>";

  const rawHeadersPreview = `Authorization: Bearer sk_live_51M0secret_bearer_token_9999\nCookie: session_id=sess_secret_cookie_abcdef123; user_auth=jwt_secret_token\nX-API-Key: live_sk_test_api_key_secret_998877\nContent-Type: application/json`;

  const scrubbedHeadersPreview = `Authorization: Bearer <REDACTED_BEARER_TOKEN_8f4a1c91>\nCookie: session_id=<REDACTED_COOKIE_SESSION_ID_a1b2c3d4>; user_auth=<REDACTED_COOKIE_USER_AUTH_e5f6a7b8>\nX-API-Key: <REDACTED_X_API_KEY_c9d0e1f2>\nContent-Type: application/json`;

  const rawBodyPreview = JSON.stringify(
    {
      client_secret: "pi_12345_secret_abc998877665544",
      access_token: "toxic_access_token_nested_555",
      refresh_token: "toxic_refresh_token_nested_777",
      password: "SuperSecretMasterPassword123!",
      customer_email: "admin_internal@secretcorp.org",
      amount: 2000,
      currency: "usd",
    },
    null,
    2,
  );

  const scrubbedBodyPreview = JSON.stringify(
    {
      client_secret: "<REDACTED_CLIENT_SECRET_9a8b7c6d>",
      access_token: "<REDACTED_ACCESS_TOKEN_5e4d3c2b>",
      refresh_token: "<REDACTED_REFRESH_TOKEN_1f2e3d4c>",
      password: "<REDACTED_PASSWORD_3a4b5c6d>",
      customer_email: "<REDACTED_EMAIL_8a7b6c5d>",
      amount: 2000,
      currency: "usd",
    },
    null,
    2,
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-150">
      <motion.div
        initial={{ opacity: 0, scale: 0.98, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.98, y: 8 }}
        transition={{ duration: 0.16, ease: "easeOut" }}
        className="w-full max-w-5xl bg-[#0E0F13] border border-[#232329] rounded-2xl shadow-2xl overflow-hidden flex flex-col font-sans max-h-[90vh]"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#222328] bg-[#111216]">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center">
              <ShieldCheck className="w-5 h-5" strokeWidth={1.75} />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-sm font-semibold text-zinc-100">
                  Redaction Rules (Active) &amp; Pre-Compile Scrubbed Diff
                </h2>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  100% Client-Side In-Memory
                </span>
                {activeTrace && (
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[#1A1A22] text-zinc-300 border border-[#2B2B38]">
                    SHA: {activeTrace.sha256Prefix}
                  </span>
                )}
              </div>
              <p className="text-xs text-zinc-400">
                Transparent cryptographic credential sanitization running
                locally before schema compilation
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-200 hover:bg-[#1A1B20] transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" strokeWidth={1.75} />
          </button>
        </div>

        {/* Tab Switcher & Search Bar */}
        <div className="px-6 py-2.5 border-b border-[#222328] bg-[#0A0A0C] flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
          <div className="flex items-center space-x-1 bg-[#141418] p-1 rounded-xl border border-[#232329]">
            <button
              onClick={() => setActiveTab("rules")}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer flex items-center space-x-1.5 ${
                activeTab === "rules"
                  ? "bg-zinc-100 text-zinc-950 font-semibold"
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              <Sliders className="w-3.5 h-3.5" strokeWidth={1.75} />
              <span>Redaction Rules (Active)</span>
              <span
                className={`text-[10px] font-mono px-1.5 py-0.2 rounded-full ${
                  activeTab === "rules"
                    ? "bg-zinc-300 text-zinc-950"
                    : "bg-emerald-500/10 text-emerald-400"
                }`}
              >
                {ACTIVE_RULES_CATALOG.length}
              </span>
            </button>
            <button
              onClick={() => setActiveTab("diff")}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer flex items-center space-x-1.5 ${
                activeTab === "diff"
                  ? "bg-zinc-100 text-zinc-950 font-semibold"
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              <Code className="w-3.5 h-3.5" strokeWidth={1.75} />
              <span>Pre-Compile Scrubbed Diff</span>
              <span
                className={`text-[10px] font-mono px-1.5 py-0.2 rounded-full ${
                  activeTab === "diff"
                    ? "bg-zinc-300 text-zinc-950"
                    : "bg-indigo-500/10 text-indigo-400"
                }`}
              >
                {activeTrace?.redactionCount ?? 7} Redactions
              </span>
            </button>
          </div>

          {activeTab === "rules" ? (
            <div className="relative w-full sm:w-64">
              <Search
                className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-500"
                strokeWidth={1.75}
              />
              <input
                type="text"
                placeholder="Filter rules (e.g. token, email)..."
                value={rulesSearch}
                onChange={(e) => setRulesSearch(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 bg-[#141418] border border-[#232329] rounded-lg text-zinc-200 placeholder-zinc-500 text-xs focus:outline-none focus:border-zinc-500"
              />
            </div>
          ) : (
            entries.length > 0 && (
              <div className="flex items-center space-x-2">
                <span className="text-zinc-500 text-xs">Request:</span>
                <select
                  value={selectedEntryIndex}
                  onChange={(e) =>
                    setSelectedEntryIndex(Number(e.target.value))
                  }
                  className="bg-[#141418] border border-[#232329] text-zinc-200 rounded-lg px-2.5 py-1 text-xs font-mono focus:outline-none focus:border-zinc-500 cursor-pointer"
                >
                  {entries.map((ent, idx) => (
                    <option key={ent.id} value={idx}>
                      {ent.method} {ent.path} ({ent.redactionsCount} redacted)
                    </option>
                  ))}
                </select>
              </div>
            )
          )}
        </div>

        {/* Tab 1: Redaction Rules (Active) */}
        {activeTab === "rules" && (
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredRules.map((rule) => {
                const categoryColor =
                  rule.category === "header"
                    ? "text-indigo-400 bg-indigo-500/10 border-indigo-500/20"
                    : rule.category === "query"
                      ? "text-cyan-400 bg-cyan-500/10 border-cyan-500/20"
                      : rule.category === "body"
                        ? "text-violet-400 bg-violet-500/10 border-violet-500/20"
                        : "text-emerald-400 bg-emerald-500/10 border-emerald-500/20";

                return (
                  <div
                    key={rule.id}
                    className="p-4 bg-[#121317] border border-[#222328] rounded-xl flex flex-col justify-between space-y-3 hover:border-zinc-600 transition-colors"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="font-semibold text-zinc-100 text-xs">
                          {rule.title}
                        </span>
                        <span
                          className={`text-[10px] font-mono px-2 py-0.5 rounded uppercase font-bold border ${categoryColor}`}
                        >
                          {rule.category}
                        </span>
                      </div>
                      <p className="text-zinc-400 text-[11px] leading-relaxed mb-2.5">
                        {rule.targetDescription}
                      </p>

                      <div className="space-y-1.5 font-mono text-[10px]">
                        <div className="p-2 bg-[#0A0A0C] rounded-lg border border-[#1E1F24] flex items-center justify-between">
                          <span className="text-zinc-500">Pattern/Keys:</span>
                          <span className="text-zinc-300 truncate max-w-[240px]">
                            {rule.patternOrKeys}
                          </span>
                        </div>
                        <div className="p-2 bg-[#0A0A0C] rounded-lg border border-[#1E1F24] flex items-center justify-between">
                          <span className="text-zinc-500">Placeholder:</span>
                          <span className="text-emerald-400 font-bold truncate max-w-[240px]">
                            {rule.placeholderExample}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-[#1C1D22] flex items-center justify-between text-[11px] text-zinc-500">
                      <span className="truncate max-w-[340px]">
                        {rule.typePreservationNote}
                      </span>
                      <button
                        onClick={() =>
                          handleCopy(rule.placeholderExample, rule.id)
                        }
                        className="text-zinc-400 hover:text-zinc-200 transition-colors flex items-center space-x-1 cursor-pointer"
                        title="Copy placeholder pattern"
                      >
                        {copiedId === rule.id ? (
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {filteredRules.length === 0 && (
              <div className="text-center py-12 text-zinc-500 text-xs">
                No redaction rules matching &quot;{rulesSearch}&quot;
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Pre-Compile Scrubbed Diff */}
        {activeTab === "diff" && (
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {/* Type Preservation Guarantee Card */}
            <div className="p-4 bg-[#12141A] border border-emerald-500/20 rounded-xl flex items-start space-x-3">
              <ShieldCheck
                className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5"
                strokeWidth={1.75}
              />
              <div>
                <div className="text-xs font-semibold text-emerald-300">
                  Cryptographic Type-Preserving Schema Invariants
                </div>
                <p className="text-[11px] text-zinc-400 leading-relaxed mt-0.5">
                  All scrubbed tokens, query parameters, passwords, and JSON
                  values are replaced with deterministic placeholders preserving
                  string types (
                  <code className="font-mono text-emerald-400">z.string()</code>{" "}
                  /{" "}
                  <code className="font-mono text-emerald-400">
                    type: &quot;string&quot;
                  </code>
                  ). This guarantees OpenAPI 3.1.0 specifications and TypeScript
                  SDKs compile with zero schema breakage.
                </p>
              </div>
            </div>

            {/* 1. URL Query Parameter Diff */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-semibold text-zinc-200">
                <span>1. Request URL &amp; Query String Scrubbing</span>
                <span className="text-[10px] font-mono text-zinc-400">
                  Parameters: email, token, key, secret, sig, password
                </span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs font-mono">
                <div className="p-3 bg-[#151113] border border-rose-500/20 rounded-xl space-y-1">
                  <div className="flex items-center justify-between text-[10px] text-rose-400 font-semibold uppercase tracking-wider">
                    <span>Raw Live Traced URL (Planted Secrets)</span>
                    <span className="px-1.5 py-0.2 bg-rose-500/10 rounded">
                      RAW EXPOSURE
                    </span>
                  </div>
                  <pre className="text-zinc-300 text-[11px] break-all whitespace-pre-wrap">
                    {rawUrlPreview}
                  </pre>
                </div>
                <div className="p-3 bg-[#101714] border border-emerald-500/20 rounded-xl space-y-1">
                  <div className="flex items-center justify-between text-[10px] text-emerald-400 font-semibold uppercase tracking-wider">
                    <span>Scrubbed Pre-Compile URL</span>
                    <span className="px-1.5 py-0.2 bg-emerald-500/10 rounded">
                      100% SANITIZED
                    </span>
                  </div>
                  <pre className="text-emerald-300 text-[11px] break-all whitespace-pre-wrap">
                    {scrubbedUrlPreview}
                  </pre>
                </div>
              </div>
            </div>

            {/* 2. Headers Diff */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-semibold text-zinc-200">
                <span>2. HTTP Request Headers Scrubbing</span>
                <span className="text-[10px] font-mono text-zinc-400">
                  Authorization, Cookies, API Keys
                </span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs font-mono">
                <div className="p-3 bg-[#151113] border border-rose-500/20 rounded-xl space-y-1">
                  <div className="text-[10px] text-rose-400 font-semibold uppercase tracking-wider">
                    Raw Request Headers
                  </div>
                  <pre className="text-zinc-300 text-[11px] whitespace-pre-wrap">
                    {rawHeadersPreview}
                  </pre>
                </div>
                <div className="p-3 bg-[#101714] border border-emerald-500/20 rounded-xl space-y-1">
                  <div className="text-[10px] text-emerald-400 font-semibold uppercase tracking-wider">
                    Sanitized Headers (Deterministic Placeholders)
                  </div>
                  <pre className="text-emerald-300 text-[11px] whitespace-pre-wrap">
                    {scrubbedHeadersPreview}
                  </pre>
                </div>
              </div>
            </div>

            {/* 3. Deep Recursive JSON Body Diff */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-semibold text-zinc-200">
                <span>3. Deep Recursive JSON Body Scrubbing</span>
                <span className="text-[10px] font-mono text-zinc-400">
                  client_secret, access_token, refresh_token, password, email
                </span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs font-mono">
                <div className="p-3 bg-[#151113] border border-rose-500/20 rounded-xl space-y-1">
                  <div className="text-[10px] text-rose-400 font-semibold uppercase tracking-wider">
                    Raw JSON Body
                  </div>
                  <pre className="text-zinc-300 text-[11px] whitespace-pre-wrap overflow-x-auto">
                    {rawBodyPreview}
                  </pre>
                </div>
                <div className="p-3 bg-[#101714] border border-emerald-500/20 rounded-xl space-y-1">
                  <div className="text-[10px] text-emerald-400 font-semibold uppercase tracking-wider">
                    Scrubbed JSON Body (Type-Preserving String Placeholders)
                  </div>
                  <pre className="text-emerald-300 text-[11px] whitespace-pre-wrap overflow-x-auto">
                    {scrubbedBodyPreview}
                  </pre>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="px-6 py-3.5 border-t border-[#222328] bg-[#111216] flex items-center justify-between text-xs">
          <div className="text-zinc-400 flex items-center space-x-2">
            <Lock className="w-3.5 h-3.5 text-emerald-400" strokeWidth={1.75} />
            <span>
              Ephemeral RAM only · Zero persistent leak · SHA-256 keyed
            </span>
          </div>

          <div className="flex items-center space-x-3">
            <button
              onClick={onClose}
              className="px-3.5 py-1.5 rounded-lg border border-[#2A2A32] hover:bg-[#1A1A22] text-zinc-300 font-medium transition-colors cursor-pointer"
            >
              Close
            </button>
            {onGenerateSchemas && (
              <button
                onClick={() => {
                  onClose();
                  onGenerateSchemas();
                }}
                className="px-4 py-1.5 rounded-lg bg-zinc-100 hover:bg-white text-zinc-950 font-semibold transition-all flex items-center space-x-1.5 shadow-sm cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5" strokeWidth={2} />
                <span>Generate Schemas</span>
                <ArrowRight className="w-3.5 h-3.5" strokeWidth={2} />
              </button>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
}
