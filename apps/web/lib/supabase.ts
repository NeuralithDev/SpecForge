/**
 * Production database and storage adapter for SpecForge with graceful in-memory fallback.
 */

import { randomUUID } from "node:crypto";
import type { PlanId } from "./billing/pricingPlans.js";

export interface DbProjectRecord {
  readonly id: string;
  readonly org_id: string;
  readonly name: string;
  readonly target_type: "har" | "bundle" | "url" | "multi-target";
  readonly status: "draft" | "analyzing" | "verified" | "partially-verified" | "failed";
  readonly stage: "queued" | "scrubbing" | "dissecting" | "synthesizing" | "verifying" | "completed" | "failed";
  readonly progress_pct: number;
  readonly target_url?: string;
  readonly error_message?: string;
  readonly redaction_summary_json?: unknown;
  readonly telemetry_json?: unknown;
  readonly created_at: string;
  readonly updated_at: string;
}

export interface DbGeneratedArtifactsRecord {
  readonly id: string;
  readonly project_id: string;
  readonly openapi_spec: unknown;
  readonly mcp_server_code: string;
  readonly ts_sdk_code: string;
  readonly parity_tests_code: string;
  readonly created_at: string;
}

export interface DbOrgUsageQuotaRecord {
  readonly org_id: string;
  readonly tier: "free" | "pro" | "enterprise";
  readonly plan_id: PlanId;
  readonly payment_provider: "none" | "razorpay" | "stripe";
  readonly external_customer_id?: string;
  readonly external_subscription_id?: string;
  readonly monthly_endpoints_used: number;
  readonly monthly_limit: number;
  readonly current_period_end?: string;
  readonly created_at: string;
  readonly updated_at: string;
}

export interface DbBillingTransactionRecord {
  readonly id: string;
  readonly org_id: string;
  readonly provider: "razorpay" | "stripe" | "test";
  readonly external_payment_id: string;
  readonly amount_minor: number;
  readonly currency: "INR" | "USD";
  readonly plan_id: string;
  readonly status: "succeeded" | "pending" | "failed" | "refunded";
  readonly created_at: string;
}

/** In-memory store for local development or when Supabase credentials are not provided. */
class InMemoryDatabase {
  private readonly projects = new Map<string, DbProjectRecord>();
  private readonly artifacts = new Map<string, DbGeneratedArtifactsRecord>();
  private readonly evidenceLedgers = new Map<string, unknown>();
  private readonly obligationMatrices = new Map<string, unknown>();
  private readonly quotas = new Map<string, DbOrgUsageQuotaRecord>();
  private readonly transactions = new Map<string, DbBillingTransactionRecord[]>();

  saveProject(record: DbProjectRecord): DbProjectRecord {
    this.projects.set(record.id, record);
    return record;
  }

  getProject(id: string): DbProjectRecord | undefined {
    return this.projects.get(id);
  }

  updateProjectProgress(
    id: string,
    update: Partial<Pick<DbProjectRecord, "stage" | "progress_pct" | "status" | "error_message" | "redaction_summary_json" | "telemetry_json">>,
  ): DbProjectRecord | undefined {
    const existing = this.projects.get(id);
    if (!existing) return undefined;
    const updated: DbProjectRecord = {
      ...existing,
      ...update,
      updated_at: new Date().toISOString(),
    };
    this.projects.set(id, updated);
    return updated;
  }

  saveArtifacts(record: DbGeneratedArtifactsRecord): DbGeneratedArtifactsRecord {
    this.artifacts.set(record.project_id, record);
    return record;
  }

  getArtifacts(projectId: string): DbGeneratedArtifactsRecord | undefined {
    return this.artifacts.get(projectId);
  }

  saveEvidenceLedger(projectId: string, ledger: unknown): void {
    this.evidenceLedgers.set(projectId, ledger);
  }

  saveObligationMatrix(projectId: string, matrix: unknown): void {
    this.obligationMatrices.set(projectId, matrix);
  }

  /** Retrieve the organization's usage quota or initialize a default free tier quota. */
  getQuota(orgId: string): DbOrgUsageQuotaRecord {
    const existing = this.quotas.get(orgId);
    if (existing) return existing;

    const defaultQuota: DbOrgUsageQuotaRecord = {
      org_id: orgId,
      tier: "free",
      plan_id: "free",
      payment_provider: "none",
      monthly_endpoints_used: 0,
      monthly_limit: 25,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    this.quotas.set(orgId, defaultQuota);
    return defaultQuota;
  }

  /**
   * Check whether discovered endpoints fit within monthly quota limit, and increment usage atomically.
   */
  checkAndIncrementEndpointQuota(
    orgId: string,
    discoveredCount: number,
  ): {
    readonly allowed: boolean;
    readonly currentUsage: number;
    readonly limit: number;
    readonly tier: string;
    readonly planId: PlanId;
  } {
    const quota = this.getQuota(orgId);

    if (quota.tier !== "enterprise" && quota.monthly_endpoints_used + discoveredCount > quota.monthly_limit) {
      return {
        allowed: false,
        currentUsage: quota.monthly_endpoints_used,
        limit: quota.monthly_limit,
        tier: quota.tier,
        planId: quota.plan_id,
      };
    }

    const updated: DbOrgUsageQuotaRecord = {
      ...quota,
      monthly_endpoints_used: quota.monthly_endpoints_used + discoveredCount,
      updated_at: new Date().toISOString(),
    };
    this.quotas.set(orgId, updated);

    return {
      allowed: true,
      currentUsage: updated.monthly_endpoints_used,
      limit: updated.monthly_limit,
      tier: updated.tier,
      planId: updated.plan_id,
    };
  }

  /**
   * Promote organization quota upon verified payment transaction.
   */
  promoteOrgQuota(
    orgId: string,
    planId: PlanId,
    provider: "razorpay" | "stripe" | "test" = "test",
    externalPaymentId: string = `test_${Date.now()}`,
    amountMinor: number = 0,
    currency: "INR" | "USD" = "USD",
  ): DbOrgUsageQuotaRecord {
    const existing = this.getQuota(orgId);

    let newTier: "pro" | "enterprise" = "pro";
    let newLimit = 500;

    if (planId === "enterprise_annual") {
      newTier = "enterprise";
      newLimit = 999999;
    } else if (planId === "sprint_one_time") {
      newTier = "pro";
      newLimit = Math.max(100, existing.monthly_limit + 100);
    } else if (planId === "pro_monthly") {
      newTier = "pro";
      newLimit = 500;
    }

    const updated: DbOrgUsageQuotaRecord = {
      ...existing,
      tier: newTier,
      plan_id: planId,
      payment_provider: provider === "test" ? "none" : provider,
      external_subscription_id: externalPaymentId,
      monthly_limit: newLimit,
      updated_at: new Date().toISOString(),
    };
    this.quotas.set(orgId, updated);

    // Record transaction
    const tx: DbBillingTransactionRecord = {
      id: randomUUID(),
      org_id: orgId,
      provider,
      external_payment_id: externalPaymentId,
      amount_minor: amountMinor,
      currency,
      plan_id: planId,
      status: "succeeded",
      created_at: new Date().toISOString(),
    };
    const currentTxs = this.transactions.get(orgId) ?? [];
    this.transactions.set(orgId, [...currentTxs, tx]);

    return updated;
  }

  getBillingTransactions(orgId: string): readonly DbBillingTransactionRecord[] {
    return this.transactions.get(orgId) ?? [];
  }
}

// Global in-memory instance for process lifetime
const inMemoryDb = new InMemoryDatabase();

export function getDb() {
  return inMemoryDb;
}
