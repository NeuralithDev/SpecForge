/**
 * Structured telemetry and high-resolution timing profiler for SpecForge pipeline stages.
 */
export interface PipelineTelemetry {
  readonly sanitize_ms: number;
  readonly ssrf_ms: number;
  readonly dissect_ms: number;
  readonly obligation_eval_ms: number;
  readonly synthesize_ms: number;
  readonly package_ms: number;
  readonly total_ms: number;
  readonly started_at: string;
  readonly completed_at: string;
}

export type PipelineStage =
  | "sanitize"
  | "ssrf"
  | "dissect"
  | "obligation_eval"
  | "synthesize"
  | "package";

export class PipelineTracer {
  private readonly startIso: string;
  private readonly startPerf: number;
  private readonly stageSpans: Map<PipelineStage, number> = new Map();
  private currentStage: PipelineStage | null = null;
  private currentStageStart: number = 0;

  constructor() {
    this.startIso = new Date().toISOString();
    this.startPerf = performance.now();
  }

  /** Start or transition to a timed pipeline execution stage. */
  startStage(stage: PipelineStage): void {
    const now = performance.now();
    if (this.currentStage !== null) {
      const elapsed = Math.round((now - this.currentStageStart) * 100) / 100;
      const prev = this.stageSpans.get(this.currentStage) ?? 0;
      this.stageSpans.set(this.currentStage, prev + elapsed);
    }
    this.currentStage = stage;
    this.currentStageStart = now;
  }

  /** Explicitly end a timed execution stage without immediately starting another. */
  endStage(stage?: PipelineStage): void {
    const now = performance.now();
    const targetStage = stage ?? this.currentStage;
    if (targetStage !== null && this.currentStage === targetStage) {
      const elapsed = Math.round((now - this.currentStageStart) * 100) / 100;
      const prev = this.stageSpans.get(targetStage) ?? 0;
      this.stageSpans.set(targetStage, prev + elapsed);
      this.currentStage = null;
    }
  }

  /** Record a completed stage duration directly. */
  recordDuration(stage: PipelineStage, durationMs: number): void {
    const rounded = Math.round(durationMs * 100) / 100;
    const prev = this.stageSpans.get(stage) ?? 0;
    this.stageSpans.set(stage, prev + rounded);
  }

  /** Finalize tracking and return an immutable PipelineTelemetry report. */
  finish(): PipelineTelemetry {
    if (this.currentStage !== null) {
      this.endStage();
    }
    const endPerf = performance.now();
    const totalMs = Math.round((endPerf - this.startPerf) * 100) / 100;

    return Object.freeze({
      sanitize_ms: this.stageSpans.get("sanitize") ?? 0,
      ssrf_ms: this.stageSpans.get("ssrf") ?? 0,
      dissect_ms: this.stageSpans.get("dissect") ?? 0,
      obligation_eval_ms: this.stageSpans.get("obligation_eval") ?? 0,
      synthesize_ms: this.stageSpans.get("synthesize") ?? 0,
      package_ms: this.stageSpans.get("package") ?? 0,
      total_ms: totalMs,
      started_at: this.startIso,
      completed_at: new Date().toISOString(),
    });
  }
}
