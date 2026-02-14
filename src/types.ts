export interface BufferStats {
  sharedHit?: number;
  sharedRead?: number;
  sharedDirtied?: number;
  sharedWritten?: number;
  localHit?: number;
  localRead?: number;
  localDirtied?: number;
  localWritten?: number;
  tempRead?: number;
  tempWritten?: number;
}

export interface JitStats {
  functions: number;
  options: {
    inlining: boolean;
    optimization: boolean;
    expressions: boolean;
    deforming: boolean;
  };
  timing: {
    generation: number;
    inlining: number;
    optimization: number;
    emission: number;
    total: number;
  };
}

export interface PlanNode {
  id: number;
  nodeType: string;
  relation?: string;
  schema?: string;
  alias?: string;
  indexName?: string;
  indexCondition?: string;
  scanDirection?: string;

  // Planner estimates
  startupCost: number;
  totalCost: number;
  planRows: number;
  planWidth: number;

  // Actual execution (ANALYZE)
  actualStartupTime?: number;
  actualTotalTime?: number;
  actualRows?: number;
  actualLoops?: number;

  // Computed fields (filled in post-processing)
  exclusiveTime: number;
  totalTimeMs: number;
  rowEstimateFactor: number;

  // Details
  filter?: string;
  rowsRemovedByFilter?: number;
  joinType?: string;
  hashCondition?: string;
  sortKey?: string[];
  sortMethod?: string;
  sortSpaceUsed?: number;
  sortSpaceType?: string;
  parallelAware?: boolean;
  workersPlanned?: number;
  workersLaunched?: number;
  buffers?: BufferStats;
  output?: string[];

  // Tree
  children: PlanNode[];
}

export interface PlanData {
  plan: PlanNode;
  executionTime?: number;
  planningTime?: number;
  triggers?: Array<{
    name: string;
    time: number;
    calls: number;
  }>;
  jit?: JitStats;
  rawText: string;
  query?: string;
  maxTotalTime: number;
}

export interface StatsEntry {
  name: string;
  count: number;
  totalTime: number;
  percentage: number;
  nodes: Array<{
    id: number;
    nodeType: string;
    time: number;
    percentage: number;
  }>;
}

export type DisplaySettings = {
  time: boolean;
  rows: boolean;
  cost: boolean;
  buffers: boolean;
};
