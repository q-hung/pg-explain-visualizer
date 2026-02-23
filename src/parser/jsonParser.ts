import { PlanNode, PlanData, BufferStats, JitStats } from "../types";

let nodeCounter = 0;

const parseBuffers = (raw: Record<string, unknown>): BufferStats | undefined => {
  const b: BufferStats = {};
  let hasAny = false;

  const map: [string, keyof BufferStats][] = [
    ["Shared Hit Blocks", "sharedHit"],
    ["Shared Read Blocks", "sharedRead"],
    ["Shared Dirtied Blocks", "sharedDirtied"],
    ["Shared Written Blocks", "sharedWritten"],
    ["Local Hit Blocks", "localHit"],
    ["Local Read Blocks", "localRead"],
    ["Local Dirtied Blocks", "localDirtied"],
    ["Local Written Blocks", "localWritten"],
    ["Temp Read Blocks", "tempRead"],
    ["Temp Written Blocks", "tempWritten"],
  ];

  for (const [jsonKey, tsKey] of map) {
    if (jsonKey in raw && typeof raw[jsonKey] === "number") {
      (b as Record<string, number>)[tsKey] = raw[jsonKey] as number;
      hasAny = true;
    }
  }

  return hasAny ? b : undefined;
};

const parsePlanNode = (raw: Record<string, unknown>): PlanNode => {
  nodeCounter++;

  const children: PlanNode[] = [];
  if (Array.isArray(raw["Plans"])) {
    for (const child of raw["Plans"]) {
      children.push(parsePlanNode(child as Record<string, unknown>));
    }
  }

  const actualTotalTime = raw["Actual Total Time"] as number | undefined;
  const actualLoops = raw["Actual Loops"] as number | undefined;

  const node: PlanNode = {
    id: nodeCounter,
    nodeType: (raw["Node Type"] as string) || "Unknown",
    relation: raw["Relation Name"] as string | undefined,
    schema: raw["Schema"] as string | undefined,
    alias: raw["Alias"] as string | undefined,
    indexName: raw["Index Name"] as string | undefined,
    indexCondition: raw["Index Cond"] as string | undefined,
    scanDirection: raw["Scan Direction"] as string | undefined,

    startupCost: (raw["Startup Cost"] as number) || 0,
    totalCost: (raw["Total Cost"] as number) || 0,
    planRows: (raw["Plan Rows"] as number) || 0,
    planWidth: (raw["Plan Width"] as number) || 0,

    actualStartupTime: raw["Actual Startup Time"] as number | undefined,
    actualTotalTime: actualTotalTime,
    actualRows: raw["Actual Rows"] as number | undefined,
    actualLoops: actualLoops,

    // Will be computed in post-processing
    exclusiveTime: 0,
    totalTimeMs: 0,
    rowEstimateFactor: 0,

    filter: raw["Filter"] as string | undefined,
    rowsRemovedByFilter: raw["Rows Removed by Filter"] as number | undefined,
    joinType: raw["Join Type"] as string | undefined,
    hashCondition: raw["Hash Cond"] as string | undefined,
    sortKey: raw["Sort Key"] as string[] | undefined,
    sortMethod: raw["Sort Method"] as string | undefined,
    sortSpaceUsed: raw["Sort Space Used"] as number | undefined,
    sortSpaceType: raw["Sort Space Type"] as string | undefined,
    parallelAware: raw["Parallel Aware"] as boolean | undefined,
    workersPlanned: raw["Workers Planned"] as number | undefined,
    workersLaunched: raw["Workers Launched"] as number | undefined,
    buffers: parseBuffers(raw),
    output: raw["Output"] as string[] | undefined,

    children,
  };

  return node;
};

const parseJit = (raw: Record<string, unknown>): JitStats | undefined => {
  if (!raw) {
    return undefined;
  }

  return {
    functions: (raw["Functions"] as number) || 0,
    options: {
      inlining: (raw["Options"] as Record<string, boolean>)?.["Inlining"] ?? false,
      optimization:
        (raw["Options"] as Record<string, boolean>)?.["Optimization"] ?? false,
      expressions: (raw["Options"] as Record<string, boolean>)?.["Expressions"] ?? false,
      deforming: (raw["Options"] as Record<string, boolean>)?.["Deforming"] ?? false,
    },
    timing: {
      generation: (raw["Timing"] as Record<string, number>)?.["Generation"] ?? 0,
      inlining: (raw["Timing"] as Record<string, number>)?.["Inlining"] ?? 0,
      optimization: (raw["Timing"] as Record<string, number>)?.["Optimization"] ?? 0,
      emission: (raw["Timing"] as Record<string, number>)?.["Emission"] ?? 0,
      total: (raw["Timing"] as Record<string, number>)?.["Total"] ?? 0,
    },
  };
};

export const parseJsonExplain = (input: string): PlanData => {
  const parsed = JSON.parse(input);

  // EXPLAIN (FORMAT JSON) returns an array with one element
  const root = Array.isArray(parsed) ? parsed[0] : parsed;

  nodeCounter = 0;
  const plan = parsePlanNode(root["Plan"] as Record<string, unknown>);

  return {
    plan,
    executionTime: root["Execution Time"] as number | undefined,
    planningTime: root["Planning Time"] as number | undefined,
    triggers: Array.isArray(root["Triggers"])
      ? (root["Triggers"] as Array<Record<string, unknown>>).map((t) => ({
          name: (t["Trigger Name"] as string) || "Unknown",
          time: (t["Time"] as number) || 0,
          calls: (t["Calls"] as number) || 0,
        }))
      : undefined,
    jit: root["JIT"] ? parseJit(root["JIT"] as Record<string, unknown>) : undefined,
    rawText: input,
    query: root["Query Text"] as string | undefined,
    maxTotalTime: 0, // computed in post-processing
  };
};
