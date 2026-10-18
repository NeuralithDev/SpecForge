/**
 * Local-First Storage Engine for SpecForge Studio (Deterministic API Engineering).
 * Provides zero-login, client-side persistence for Collections, Requests,
 * Environments, History, and Quota tracking with graceful SSR safety.
 */

import type { PlanId } from "./billing/pricingPlans";

export type HttpMethod = "GET" | "POST" | "PUT" | "DELETE" | "PATCH" | "HEAD" | "OPTIONS";

export interface KeyValueParam {
  id: string;
  key: string;
  value: string;
  enabled: boolean;
  description?: string;
}

export type AuthType = "none" | "bearer" | "apiKey" | "basic" | "cookie";

export interface RequestAuthConfig {
  type: AuthType;
  bearerToken?: string;
  apiKeyKey?: string;
  apiKeyValue?: string;
  apiKeyIn?: "header" | "query";
  basicUser?: string;
  basicPass?: string;
  cookieHeader?: string;
}

export type BodyType = "none" | "json" | "form-data" | "x-www-form-urlencoded" | "raw";

export interface RequestBodyConfig {
  type: BodyType;
  rawJson?: string;
  formData?: KeyValueParam[];
  urlEncoded?: KeyValueParam[];
}

export interface ApiResponseData {
  status: number;
  statusText: string;
  headers: Record<string, string>;
  body: string;
  json?: unknown;
  timingMs: number;
  sizeBytes: number;
  timestamp: string;
  error?: string;
}

export interface VariableChainRule {
  id: string;
  jsonPath: string; // e.g. "id", "client_secret", "data[0].id"
  envVarName: string; // e.g. "LAST_CHARGE_ID"
  enabled: boolean;
}

export interface ExpectedContract {
  sampleResponse?: unknown;
  inferredTypes?: Record<string, string>;
  securityAudit?: {
    authHeaderName?: string;
    authReplacedWith?: string;
    ssrfGuarded?: boolean;
    evidenceId?: string;
  };
}

export interface ApiRequest {
  id: string;
  collectionId?: string;
  folder?: string; // e.g. "api.stripe.com/v1/charges"
  name: string;
  method: HttpMethod;
  url: string;
  params: KeyValueParam[];
  headers: KeyValueParam[];
  auth: RequestAuthConfig;
  body: RequestBodyConfig;
  chainRules?: VariableChainRule[];
  expectedContract?: ExpectedContract;
  evidenceId?: string;
  sha256Prefix?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ApiCollection {
  id: string;
  name: string;
  description?: string;
  importedFromHar?: boolean;
  targetSha256?: string;
  folders: string[];
  createdAt: string;
  updatedAt: string;
}

export interface EnvironmentVariable {
  id: string;
  key: string;
  value: string;
  enabled: boolean;
  isSecret?: boolean;
}

export interface Environment {
  id: string;
  name: string;
  variables: EnvironmentVariable[];
}

export interface RequestHistoryItem {
  id: string;
  requestId?: string;
  name: string;
  method: HttpMethod;
  url: string;
  status: number;
  statusText: string;
  timingMs: number;
  timestamp: string;
  response: ApiResponseData;
}

export interface LocalQuotaState {
  compiledEndpointsCount: number;
  limit: number;
  tier: "free" | "pro" | "enterprise";
  planId: PlanId;
}

export interface HarTraceEntry {
  id: string;
  method: HttpMethod;
  url: string;
  domain: string;
  path: string;
  status: number;
  statusText: string;
  mimeType: string;
  timeMs: number;
  sizeBytes: number;
  redactionsCount: number;
  hasRedactedSecrets: boolean;
  isXhrOrFetch: boolean;
  isError: boolean;
  requestHeaders: Record<string, string>;
  responseHeaders: Record<string, string>;
  requestBody?: string;
  responseBody?: string;
}

export interface HarTraceMeta {
  id: string;
  name: string;
  sha256: string;
  sha256Prefix: string;
  endpointCount: number;
  redactionCount: number;
  timestamp: string;
  entries?: HarTraceEntry[];
}

export interface LocalStudioState {
  collections: ApiCollection[];
  requests: ApiRequest[];
  environments: Environment[];
  activeEnvironmentId: string | null;
  history: RequestHistoryItem[];
  traces: HarTraceMeta[];
  quota: LocalQuotaState;
  activeTabIds: string[];
  activeTabId: string | null;
}

const STORAGE_KEY = "specforge_studio_v1";

export const FREE_TIER_COMPILED_LIMIT = 25;

export const INITIAL_ENVIRONMENTS: Environment[] = [
  {
    id: "env_localhost",
    name: "Localhost",
    variables: [
      { id: "var_1", key: "BASE_URL", value: "http://localhost:3000", enabled: true },
      { id: "var_2", key: "BEARER_TOKEN", value: "dev_token_secret_123", enabled: true, isSecret: true },
    ],
  },
  {
    id: "env_staging",
    name: "Staging",
    variables: [
      { id: "var_3", key: "BASE_URL", value: "https://staging-api.example.com", enabled: true },
      { id: "var_4", key: "BEARER_TOKEN", value: "sk_test_staging_token", enabled: true, isSecret: true },
    ],
  },
  {
    id: "env_prod",
    name: "Production (Stripe)",
    variables: [
      { id: "var_5", key: "BASE_URL", value: "https://api.stripe.com", enabled: true },
      { id: "var_6", key: "BEARER_TOKEN", value: "sk_live_sanitized_placeholder", enabled: true, isSecret: true },
    ],
  },
];

export const INITIAL_COLLECTIONS: ApiCollection[] = [
  {
    id: "col_stripe",
    name: "Stripe Billing & Payments",
    description: "Extracted REST Endpoints for Stripe Payment Engine",
    importedFromHar: true,
    targetSha256: "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
    folders: ["api.stripe.com/v1/charges", "api.stripe.com/v1/customers", "api.stripe.com/v1/payment_intents"],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "col_github",
    name: "GitHub Octocat API",
    description: "Sample Public REST API collection for local testing",
    importedFromHar: false,
    folders: ["api.github.com/repos"],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

export const INITIAL_REQUESTS: ApiRequest[] = [
  {
    id: "req_stripe_create_charge",
    collectionId: "col_stripe",
    folder: "api.stripe.com/v1/charges",
    name: "Create Payment Charge",
    method: "POST",
    url: "{{BASE_URL}}/v1/charges",
    params: [
      { id: "p_1", key: "expand[]", value: "customer", enabled: true, description: "Expand customer details" },
    ],
    headers: [
      { id: "h_1", key: "Content-Type", value: "application/json", enabled: true },
      { id: "h_2", key: "Authorization", value: "Bearer {{BEARER_TOKEN}}", enabled: true },
    ],
    auth: {
      type: "bearer",
      bearerToken: "{{BEARER_TOKEN}}",
    },
    body: {
      type: "json",
      rawJson: JSON.stringify(
        {
          amount: 2000,
          currency: "usd",
          source: "tok_visa",
          description: "Charge for developer subscription",
        },
        null,
        2,
      ),
    },
    evidenceId: "ev_stripe_charge_create",
    sha256Prefix: "7a8b9c1d",
    expectedContract: {
      sampleResponse: {
        id: "ch_3N4yXk2eZvKYlo2C0WStripe",
        object: "charge",
        amount: 2000,
        amount_captured: 2000,
        currency: "usd",
        paid: true,
        status: "succeeded",
        customer: "cus_9s6XKzk92xStripe",
        description: "Charge for developer subscription",
        receipt_url: "https://pay.stripe.com/receipts/acct_1032D82eZvKYlo2C/ch_3N4yXk2eZvKYlo2C0WStripe",
      },
      inferredTypes: { id: "string", amount: "number", status: "string" },
      securityAudit: {
        authHeaderName: "Authorization",
        authReplacedWith: "<REDACTED_BEARER_TOKEN>",
        ssrfGuarded: true,
      },
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "req_stripe_list_charges",
    collectionId: "col_stripe",
    folder: "api.stripe.com/v1/charges",
    name: "List Recent Charges",
    method: "GET",
    url: "{{BASE_URL}}/v1/charges",
    params: [
      { id: "p_2", key: "limit", value: "10", enabled: true, description: "Number of charges" },
    ],
    headers: [
      { id: "h_3", key: "Accept", value: "application/json", enabled: true },
      { id: "h_4", key: "Authorization", value: "Bearer {{BEARER_TOKEN}}", enabled: true },
    ],
    auth: {
      type: "bearer",
      bearerToken: "{{BEARER_TOKEN}}",
    },
    body: {
      type: "none",
    },
    evidenceId: "ev_stripe_charge_list",
    sha256Prefix: "3f2e1a90",
    expectedContract: {
      sampleResponse: {
        object: "list",
        data: [
          {
            id: "ch_3N4yXk2eZvKYlo2C0WStripe",
            object: "charge",
            amount: 2000,
            currency: "usd",
            paid: true,
            status: "succeeded",
          },
          {
            id: "ch_3N4yAB2eZvKYlo2C0WPrev",
            object: "charge",
            amount: 4900,
            currency: "usd",
            paid: true,
            status: "succeeded",
          },
        ],
        has_more: false,
        url: "/v1/charges",
      },
      inferredTypes: { object: "string", data: "array" },
      securityAudit: {
        authHeaderName: "Authorization",
        authReplacedWith: "<REDACTED_BEARER_TOKEN>",
        ssrfGuarded: true,
      },
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "req_stripe_list_customers",
    collectionId: "col_stripe",
    folder: "api.stripe.com/v1/customers",
    name: "List Customers",
    method: "GET",
    url: "{{BASE_URL}}/v1/customers",
    params: [
      { id: "p_3", key: "limit", value: "5", enabled: true },
    ],
    headers: [
      { id: "h_5", key: "Authorization", value: "Bearer {{BEARER_TOKEN}}", enabled: true },
    ],
    auth: {
      type: "bearer",
      bearerToken: "{{BEARER_TOKEN}}",
    },
    body: {
      type: "none",
    },
    evidenceId: "ev_stripe_cust_list",
    sha256Prefix: "4b5c6d7e",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "req_github_repo",
    collectionId: "col_github",
    folder: "api.github.com/repos",
    name: "Get Octocat Repo",
    method: "GET",
    url: "https://api.github.com/repos/octocat/Hello-World",
    params: [],
    headers: [
      { id: "h_6", key: "User-Agent", value: "SpecForge-Studio/5.0", enabled: true },
      { id: "h_7", key: "Accept", value: "application/vnd.github.v3+json", enabled: true },
    ],
    auth: {
      type: "none",
    },
    body: {
      type: "none",
    },
    evidenceId: "ev_github_octocat",
    sha256Prefix: "8e9f0a1b",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

export const INITIAL_STATE: LocalStudioState = {
  collections: INITIAL_COLLECTIONS,
  requests: INITIAL_REQUESTS,
  environments: INITIAL_ENVIRONMENTS,
  activeEnvironmentId: "env_prod",
  history: [],
  traces: [
    {
      id: "trace_demo_stripe",
      name: "stripe-checkout-flow.har",
      sha256: "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
      sha256Prefix: "e3b0c442",
      endpointCount: 4,
      redactionCount: 8,
      timestamp: new Date().toISOString(),
      entries: [
        {
          id: "tr_entry_1",
          method: "POST",
          url: "https://api.stripe.com/v1/payment_intents",
          domain: "api.stripe.com",
          path: "/v1/payment_intents",
          status: 200,
          statusText: "OK",
          mimeType: "application/json",
          timeMs: 142,
          sizeBytes: 450,
          redactionsCount: 3,
          hasRedactedSecrets: true,
          isXhrOrFetch: true,
          isError: false,
          requestHeaders: {
            "Content-Type": "application/x-www-form-urlencoded",
            "Authorization": "Bearer <REDACTED_BEARER_8f4a1c91>",
          },
          responseHeaders: { "content-type": "application/json" },
          requestBody: "amount=4999&currency=usd",
          responseBody: JSON.stringify({ id: "pi_3N9zXkLkdIwHu7ix04XyB11", status: "requires_payment_method", amount: 4999 }, null, 2),
        },
        {
          id: "tr_entry_2",
          method: "GET",
          url: "https://api.stripe.com/v1/customers?limit=10",
          domain: "api.stripe.com",
          path: "/v1/customers",
          status: 200,
          statusText: "OK",
          mimeType: "application/json",
          timeMs: 98,
          sizeBytes: 512,
          redactionsCount: 2,
          hasRedactedSecrets: true,
          isXhrOrFetch: true,
          isError: false,
          requestHeaders: { "Authorization": "Bearer <REDACTED_BEARER_8f4a1c91>" },
          responseHeaders: { "content-type": "application/json" },
          responseBody: JSON.stringify({ object: "list", data: [{ id: "cus_Q89zX104X9a", name: "Alex Vance" }] }, null, 2),
        },
        {
          id: "tr_entry_3",
          method: "POST",
          url: "https://api.stripe.com/v1/charges",
          domain: "api.stripe.com",
          path: "/v1/charges",
          status: 200,
          statusText: "OK",
          mimeType: "application/json",
          timeMs: 115,
          sizeBytes: 380,
          redactionsCount: 2,
          hasRedactedSecrets: true,
          isXhrOrFetch: true,
          isError: false,
          requestHeaders: { "Authorization": "Bearer <REDACTED_BEARER_8f4a1c91>", "Content-Type": "application/json" },
          responseHeaders: { "content-type": "application/json" },
          requestBody: JSON.stringify({ amount: 2000, currency: "usd" }, null, 2),
          responseBody: JSON.stringify({ id: "ch_3N9zXkLkdIwHu7ix11aa99", amount: 2000, paid: true, status: "succeeded" }, null, 2),
        },
        {
          id: "tr_entry_4",
          method: "GET",
          url: "https://api.stripe.com/v1/balance",
          domain: "api.stripe.com",
          path: "/v1/balance",
          status: 200,
          statusText: "OK",
          mimeType: "application/json",
          timeMs: 85,
          sizeBytes: 320,
          redactionsCount: 1,
          hasRedactedSecrets: true,
          isXhrOrFetch: true,
          isError: false,
          requestHeaders: { "Authorization": "Bearer <REDACTED_BEARER_8f4a1c91>" },
          responseHeaders: { "content-type": "application/json" },
          responseBody: JSON.stringify({ object: "balance", available: [{ amount: 1542000, currency: "usd" }] }, null, 2),
        },
      ],
    },
  ],
  quota: {
    compiledEndpointsCount: 4,
    limit: FREE_TIER_COMPILED_LIMIT,
    tier: "free",
    planId: "free",
  },
  activeTabIds: ["req_stripe_create_charge", "req_stripe_list_charges"],
  activeTabId: "req_stripe_create_charge",
};

/** Load the studio state from browser localStorage. */
export function loadStudioState(): LocalStudioState {
  if (typeof window === "undefined") {
    return INITIAL_STATE;
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      saveStudioState(INITIAL_STATE);
      return INITIAL_STATE;
    }
    const parsed = JSON.parse(raw) as Partial<LocalStudioState>;
    return {
      collections: parsed.collections && parsed.collections.length > 0 ? parsed.collections : INITIAL_COLLECTIONS,
      requests: parsed.requests && parsed.requests.length > 0 ? parsed.requests : INITIAL_REQUESTS,
      environments: parsed.environments && parsed.environments.length > 0 ? parsed.environments : INITIAL_ENVIRONMENTS,
      activeEnvironmentId: parsed.activeEnvironmentId ?? "env_prod",
      history: parsed.history ?? [],
      traces: parsed.traces ?? INITIAL_STATE.traces,
      quota: parsed.quota ?? INITIAL_STATE.quota,
      activeTabIds: parsed.activeTabIds && parsed.activeTabIds.length > 0 ? parsed.activeTabIds : ["req_stripe_create_charge"],
      activeTabId: parsed.activeTabId ?? "req_stripe_create_charge",
    };
  } catch (err) {
    console.warn("Failed to load SpecForge Studio state from localStorage:", err);
    return INITIAL_STATE;
  }
}

/** Save the studio state to browser localStorage with QuotaExceeded resilience. */
export function saveStudioState(state: LocalStudioState): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (err: unknown) {
    const isQuota =
      err instanceof DOMException &&
      (err.name === "QuotaExceededError" ||
        err.name === "NS_ERROR_DOM_QUOTA_REACHED" ||
        err.code === 22);

    if (isQuota) {
      console.warn("localStorage quota exceeded! Auto-pruning historical logs & traces...");
      try {
        // Prune strategy: keep only the latest 15 history items, latest 10 traces, and latest 50 requests
        const prunedState: LocalStudioState = {
          ...state,
          history: state.history.slice(0, 15),
          traces: state.traces.slice(0, 10),
          requests: state.requests.length > 50 ? state.requests.slice(0, 50) : state.requests,
        };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(prunedState));
        return;
      } catch (retryErr) {
        // If still failing, drop history & traces completely to preserve core requests & collections
        try {
          const minimalState: LocalStudioState = {
            ...state,
            history: [],
            traces: [],
          };
          localStorage.setItem(STORAGE_KEY, JSON.stringify(minimalState));
          return;
        } catch {
          console.error("Critical: unable to save even minimal state to localStorage:", retryErr);
        }
      }
    } else {
      console.error("Failed to save SpecForge Studio state to localStorage:", err);
    }
  }
}

/**
 * Interpolates `{{VARIABLE_NAME}}` placeholders using variables from the active environment.
 */
export function interpolateVariables(text: string, env: Environment | null | undefined): string {
  if (!text || !env || !env.variables) return text;
  let result = text;
  for (const v of env.variables) {
    if (v.enabled && v.key.trim().length > 0) {
      const pattern = new RegExp(`\\{\\{${v.key.trim()}\\}\\}`, "gu");
      result = result.replace(pattern, v.value);
    }
  }
  return result;
}

/** Create a fresh request object with default parameters. */
export function createNewRequest(collectionId?: string, folder?: string): ApiRequest {
  const id = `req_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  return {
    id,
    collectionId,
    folder: folder ?? "Custom Endpoints",
    name: "New Request",
    method: "GET",
    url: "{{BASE_URL}}/api/v1/resource",
    params: [{ id: `p_${Date.now()}`, key: "", value: "", enabled: true }],
    headers: [
      { id: `h_${Date.now()}`, key: "Content-Type", value: "application/json", enabled: true },
    ],
    auth: { type: "none" },
    body: { type: "none" },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

/**
 * Extracts a value from a JSON object given a dot/bracket path like 'id' or 'data.client_secret' or 'data[0].id'.
 */
export function extractValueFromJsonPath(obj: unknown, path: string): string | undefined {
  if (!obj || !path) return undefined;
  const cleanPath = path.trim();
  const segments = cleanPath.replace(/\[(\d+)\]/gu, ".$1").split(".").filter(Boolean);
  let cur: any = obj;
  for (const seg of segments) {
    if (cur === null || cur === undefined) return undefined;
    cur = cur[seg];
  }
  if (cur === null || cur === undefined) return undefined;
  return typeof cur === "object" ? JSON.stringify(cur) : String(cur);
}

/**
 * Applies variable chaining rules against a JSON response payload, updating environment variables.
 */
export function applyVariableChaining(
  responseJson: unknown,
  rules: VariableChainRule[] | undefined,
  env: Environment | null | undefined,
): { updatedEnv: Environment | null; extracted: Array<{ key: string; value: string; path: string }> } {
  if (!responseJson || !rules || rules.length === 0 || !env) {
    return { updatedEnv: env ?? null, extracted: [] };
  }

  const extracted: Array<{ key: string; value: string; path: string }> = [];
  const currentVars = [...env.variables];

  for (const rule of rules) {
    if (!rule.enabled || !rule.jsonPath || !rule.envVarName) continue;
    const value = extractValueFromJsonPath(responseJson, rule.jsonPath);
    if (value !== undefined) {
      extracted.push({ key: rule.envVarName, value, path: rule.jsonPath });
      const idx = currentVars.findIndex((v) => v.key.toUpperCase() === rule.envVarName.toUpperCase());
      if (idx !== -1 && currentVars[idx]) {
        currentVars[idx] = { ...currentVars[idx], value };
      } else {
        currentVars.push({
          id: `var_chain_${Date.now()}_${rule.envVarName}`,
          key: rule.envVarName,
          value,
          enabled: true,
        });
      }
    }
  }

  return {
    updatedEnv: { ...env, variables: currentVars },
    extracted,
  };
}

