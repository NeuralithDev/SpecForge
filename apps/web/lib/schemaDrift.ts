/**
 * Live Schema Drift & Epistemic Diff Detector.
 * Compares live JSON response against expected contract/schema extracted from .har traces.
 */

export type DriftStatus = "match" | "type_mismatch" | "missing" | "new_field";

export interface SchemaDriftItem {
  path: string;
  expectedType: string;
  actualType: string;
  status: DriftStatus;
  expectedValue?: unknown;
  actualValue?: unknown;
}

export interface SchemaDriftAnalysis {
  matchPercentage: number;
  totalFields: number;
  matchCount: number;
  driftCount: number;
  items: SchemaDriftItem[];
  isCompleteMatch: boolean;
}

function getTypeString(val: unknown): string {
  if (val === null) return "null";
  if (val === undefined) return "undefined";
  if (Array.isArray(val)) return "array";
  return typeof val;
}

function flattenKeys(obj: unknown, prefix: string = ""): Map<string, { type: string; value: unknown }> {
  const map = new Map<string, { type: string; value: unknown }>();

  if (obj === null || obj === undefined || typeof obj !== "object") {
    if (prefix) map.set(prefix, { type: getTypeString(obj), value: obj });
    return map;
  }

  if (Array.isArray(obj)) {
    map.set(prefix || "root", { type: "array", value: `Array(${obj.length})` });
    if (obj.length > 0) {
      // Sample first array element
      const sub = flattenKeys(obj[0], `${prefix ? prefix : "root"}[0]`);
      sub.forEach((v, k) => map.set(k, v));
    }
    return map;
  }

  for (const [k, v] of Object.entries(obj as Record<string, unknown>)) {
    const fullPath = prefix ? `${prefix}.${k}` : k;
    const typeStr = getTypeString(v);

    if (typeStr === "object" && v !== null) {
      map.set(fullPath, { type: "object", value: "{...}" });
      const sub = flattenKeys(v, fullPath);
      sub.forEach((subV, subK) => map.set(subK, subV));
    } else if (typeStr === "array") {
      map.set(fullPath, { type: "array", value: `Array(${(v as unknown[]).length})` });
      if ((v as unknown[]).length > 0) {
        const sub = flattenKeys((v as unknown[])[0], `${fullPath}[0]`);
        sub.forEach((subV, subK) => map.set(subK, subV));
      }
    } else {
      map.set(fullPath, { type: typeStr, value: v });
    }
  }

  return map;
}

/**
 * Compares an expected contract object against an actual live response object.
 */
export function analyzeSchemaDrift(
  expectedObj: unknown,
  actualObj: unknown,
): SchemaDriftAnalysis {
  const items: SchemaDriftItem[] = [];

  const expectedMap = flattenKeys(expectedObj);
  const actualMap = flattenKeys(actualObj);

  const allPaths = new Set([...expectedMap.keys(), ...actualMap.keys()]);

  let matchCount = 0;
  let driftCount = 0;

  for (const path of Array.from(allPaths).sort()) {
    const exp = expectedMap.get(path);
    const act = actualMap.get(path);

    if (exp && act) {
      if (exp.type === act.type || (exp.type === "number" && act.type === "number")) {
        matchCount++;
        items.push({
          path,
          expectedType: exp.type,
          actualType: act.type,
          status: "match",
          expectedValue: exp.value,
          actualValue: act.value,
        });
      } else {
        driftCount++;
        items.push({
          path,
          expectedType: exp.type,
          actualType: act.type,
          status: "type_mismatch",
          expectedValue: exp.value,
          actualValue: act.value,
        });
      }
    } else if (exp && !act) {
      driftCount++;
      items.push({
        path,
        expectedType: exp.type,
        actualType: "missing",
        status: "missing",
        expectedValue: exp.value,
      });
    } else if (!exp && act) {
      driftCount++;
      items.push({
        path,
        expectedType: "none",
        actualType: act.type,
        status: "new_field",
        actualValue: act.value,
      });
    }
  }

  const totalFields = allPaths.size;
  const matchPercentage = totalFields === 0 ? 100 : Math.round((matchCount / totalFields) * 100);

  return {
    matchPercentage,
    totalFields,
    matchCount,
    driftCount,
    items,
    isCompleteMatch: driftCount === 0 && totalFields > 0,
  };
}
