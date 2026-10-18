export interface DiscoveredEndpointParameter {
  readonly name: string;
  readonly in: "query" | "header" | "path" | "body";
  readonly required: boolean;
  readonly type?: string;
  readonly example?: unknown;
}

export interface DiscoveredEndpoint {
  readonly method: string;
  readonly url: string;
  readonly path: string;
  readonly status?: number;
  readonly parameters: readonly DiscoveredEndpointParameter[];
  readonly requestHeaders: Readonly<Record<string, string>>;
  readonly responseHeaders: Readonly<Record<string, string>>;
  readonly dynamicTokens: readonly string[];
  readonly evidenceId: string;
  readonly surfaceId: string;
  readonly claimId: string;
}

export interface EvidenceRecordView {
  readonly evidence_id: string;
  readonly operation: string;
  readonly confidence: "observed" | "derived" | "inferred";
  readonly authority: string;
  readonly locations: readonly {
    readonly kind: string;
    readonly path?: string;
    readonly offset?: number;
  }[];
}

export interface ResidualUnknownView {
  readonly unknown_id: string;
  readonly question: string;
  readonly severity: "low" | "medium" | "high" | "critical";
  readonly domain: string;
  readonly status: "open" | "investigating" | "blocked" | "resolved" | "contradicted";
  readonly supporting_evidence_ids: readonly string[];
  readonly envVarName?: string;
}

export interface AnalysisState {
  readonly targetSha256: string;
  readonly targetName: string;
  readonly targetType: "har" | "bundle" | "url";
  readonly endpoints: readonly DiscoveredEndpoint[];
  readonly evidenceRecords: readonly EvidenceRecordView[];
  readonly unknowns: readonly ResidualUnknownView[];
  readonly coverageScore: number;
  readonly closureStatus: "ready" | "partial" | "failed";
  readonly openApiJson: string;
  readonly mcpServerCode: string;
  readonly clientCode: string;
  readonly parityTestsCode: string;
  readonly requiredAuthConfigs: readonly {
    readonly tokenName: string;
    readonly unknownId: string;
    readonly envVarName: string;
  }[];
  readonly projectId?: string;
  readonly auditCertificate?: string;
  readonly telemetry?: {
    readonly sanitize_ms?: number;
    readonly ssrf_ms?: number;
    readonly dissect_ms?: number;
    readonly obligation_eval_ms?: number;
    readonly synthesize_ms?: number;
    readonly total_ms?: number;
  };
  readonly redactionCount?: number;
  readonly filteredAssetsCount?: number;
}

