import { PlanNode, PlanData, BufferStats, JitStats } from "../types";

let nodeCounter = 0;

interface RawNodeLine {
  depth: number;
  nodeType: string;
  relation?: string;
  alias?: string;
  indexName?: string;
  startupCost: number;
  totalCost: number;
  planRows: number;
  planWidth: number;
  actualStartupTime?: number;
  actualTotalTime?: number;
  actualRows?: number;
  actualLoops?: number;
}

// Match: <prefix><description> (cost=...) [(actual time=...)]
const NODE_REGEX =
  /^([\s\->]*?)(\w.*?)\s+\(cost=([\d.]+)\.\.([\d.]+)\s+rows=(\d+)\s+width=(\d+)\)(?:\s*\(actual time=([\d.]+)\.\.([\d.]+)\s+rows=(\d+)\s+loops=(\d+)\))?/;

const BUFFERS_REGEX =
  /Buffers:\s*(?:shared hit=(\d+))?\s*(?:read=(\d+))?\s*(?:dirtied=(\d+))?\s*(?:written=(\d+))?/;

const getIndentDepth = (prefix: string): number => {
  // Use the raw prefix length as the depth indicator.
  // The buildTree function uses relative depth comparison (not absolute levels),
  // so we just need a consistent numeric value where deeper nodes > shallower nodes.
  return prefix.length;
};

/**
 * Parse the description part (everything before "(cost=...") to extract
 * node type, relation, alias, and index name.
 *
 * Examples:
 *   "Seq Scan on users u"
 *   "Index Scan using idx_name on users u"
 *   "Nested Loop"
 *   "Subquery Scan on subq"
 *   "Parallel Index Scan using \"PK_abc\" on trigger t"
 */
const parseDescription = (
  desc: string
): {
  nodeType: string;
  relation?: string;
  alias?: string;
  indexName?: string;
} => {
  let nodeType = desc;
  let relation: string | undefined;
  let alias: string | undefined;
  let indexName: string | undefined;

  // Try: NodeType using <index> on <relation> [<alias>]
  const usingOnMatch = desc.match(
    /^(.+?)\s+using\s+(".*?"|\S+)\s+on\s+(\S+)(?:\s+(\S+))?$/
  );
  if (usingOnMatch) {
    nodeType = usingOnMatch[1].trim();
    indexName = usingOnMatch[2].replace(/^"|"$/g, "");
    relation = usingOnMatch[3];
    alias = usingOnMatch[4] || undefined;
    return { nodeType, relation, alias, indexName };
  }

  // Try: NodeType on <relation> [<alias>]
  const onMatch = desc.match(/^(.+?)\s+on\s+(\S+)(?:\s+(\S+))?$/);
  if (onMatch) {
    nodeType = onMatch[1].trim();
    relation = onMatch[2];
    alias = onMatch[3] || undefined;
    return { nodeType, relation, alias };
  }

  // Try: NodeType using <index>
  const usingMatch = desc.match(/^(.+?)\s+using\s+(".*?"|\S+)$/);
  if (usingMatch) {
    nodeType = usingMatch[1].trim();
    indexName = usingMatch[2].replace(/^"|"$/g, "");
    return { nodeType, indexName };
  }

  return { nodeType: nodeType.trim() };
};

const parseNodeLine = (line: string): RawNodeLine | null => {
  const match = line.match(NODE_REGEX);
  if (!match) {
    return null;
  }

  const prefix = match[1] || "";
  const description = match[2].trim();
  const parsed = parseDescription(description);

  return {
    depth: getIndentDepth(prefix),
    nodeType: parsed.nodeType,
    relation: parsed.relation,
    alias: parsed.alias,
    indexName: parsed.indexName,
    startupCost: parseFloat(match[3]),
    totalCost: parseFloat(match[4]),
    planRows: parseInt(match[5], 10),
    planWidth: parseInt(match[6], 10),
    actualStartupTime: match[7] ? parseFloat(match[7]) : undefined,
    actualTotalTime: match[8] ? parseFloat(match[8]) : undefined,
    actualRows: match[9] ? parseInt(match[9], 10) : undefined,
    actualLoops: match[10] ? parseInt(match[10], 10) : undefined,
  };
};

const parseBuffersLine = (line: string): BufferStats | null => {
  const match = line.match(BUFFERS_REGEX);
  if (!match) {
    return null;
  }

  const b: BufferStats = {};
  let hasAny = false;

  if (match[1]) {
    b.sharedHit = parseInt(match[1], 10);
    hasAny = true;
  }
  if (match[2]) {
    b.sharedRead = parseInt(match[2], 10);
    hasAny = true;
  }
  if (match[3]) {
    b.sharedDirtied = parseInt(match[3], 10);
    hasAny = true;
  }
  if (match[4]) {
    b.sharedWritten = parseInt(match[4], 10);
    hasAny = true;
  }

  return hasAny ? b : null;
};

const buildTree = (nodes: Array<{ raw: RawNodeLine; extras: string[] }>): PlanNode => {
  if (nodes.length === 0) {
    throw new Error("No plan nodes found in EXPLAIN output");
  }

  // Build plan nodes with proper parent-child relationships
  const planNodes: PlanNode[] = [];
  const stack: Array<{ depth: number; node: PlanNode }> = [];

  for (const { raw, extras } of nodes) {
    nodeCounter++;

    const actualTotalTime = raw.actualTotalTime;
    const actualLoops = raw.actualLoops;

    const node: PlanNode = {
      id: nodeCounter,
      nodeType: raw.nodeType,
      relation: raw.relation,
      alias: raw.alias,
      indexName: raw.indexName,
      startupCost: raw.startupCost,
      totalCost: raw.totalCost,
      planRows: raw.planRows,
      planWidth: raw.planWidth,
      actualStartupTime: raw.actualStartupTime,
      actualTotalTime: actualTotalTime,
      actualRows: raw.actualRows,
      actualLoops: actualLoops,
      exclusiveTime: 0,
      totalTimeMs: 0,
      rowEstimateFactor: 0,
      children: [],
    };

    // Parse extras
    for (const extra of extras) {
      const trimmed = extra.trim();

      if (trimmed.startsWith("Filter:")) {
        node.filter = trimmed.substring("Filter:".length).trim();
      } else if (trimmed.startsWith("Rows Removed by Filter:")) {
        node.rowsRemovedByFilter = parseInt(
          trimmed.substring("Rows Removed by Filter:".length).trim(),
          10
        );
      } else if (trimmed.startsWith("Index Cond:")) {
        node.indexCondition = trimmed.substring("Index Cond:".length).trim();
      } else if (trimmed.startsWith("Sort Key:")) {
        node.sortKey = trimmed
          .substring("Sort Key:".length)
          .trim()
          .split(",")
          .map((s) => s.trim());
      } else if (trimmed.startsWith("Sort Method:")) {
        const parts = trimmed.substring("Sort Method:".length).trim().split(/\s+/);
        node.sortMethod = parts[0];
      } else if (trimmed.startsWith("Join Filter:") || trimmed.startsWith("Hash Cond:")) {
        const colonIdx = trimmed.indexOf(":");
        node.hashCondition = trimmed.substring(colonIdx + 1).trim();
      } else if (trimmed.startsWith("Workers Planned:")) {
        node.workersPlanned = parseInt(
          trimmed.substring("Workers Planned:".length).trim(),
          10
        );
      } else if (trimmed.startsWith("Workers Launched:")) {
        node.workersLaunched = parseInt(
          trimmed.substring("Workers Launched:".length).trim(),
          10
        );
      } else if (trimmed.startsWith("Buffers:")) {
        const buffers = parseBuffersLine(trimmed);
        if (buffers) {
          node.buffers = buffers;
        }
      } else if (trimmed.startsWith("Output:")) {
        node.output = trimmed
          .substring("Output:".length)
          .trim()
          .split(",")
          .map((s) => s.trim());
      }
    }

    // Find parent based on depth
    while (stack.length > 0 && stack[stack.length - 1].depth >= raw.depth) {
      stack.pop();
    }

    if (stack.length > 0) {
      stack[stack.length - 1].node.children.push(node);
    }

    stack.push({ depth: raw.depth, node });
    planNodes.push(node);
  }

  // Root is the first node
  return planNodes[0];
};

export const parseTextExplain = (input: string): PlanData => {
  const lines = input.split("\n");
  nodeCounter = 0;

  const nodeEntries: Array<{ raw: RawNodeLine; extras: string[] }> = [];
  let executionTime: number | undefined;
  let planningTime: number | undefined;
  let jit: JitStats | undefined;
  const triggers: PlanData["triggers"] = [];

  let inJit = false;
  let jitFunctions = 0;
  const jitOptions: Record<string, boolean> = {};
  const jitTiming: Record<string, number> = {};

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    if (!trimmed) {
      continue;
    }

    // Check for metadata lines
    const execMatch = trimmed.match(/^Execution Time:\s*([\d.]+)\s*ms/);
    if (execMatch) {
      executionTime = parseFloat(execMatch[1]);
      continue;
    }

    const planMatch = trimmed.match(/^Planning Time:\s*([\d.]+)\s*ms/);
    if (planMatch) {
      planningTime = parseFloat(planMatch[1]);
      continue;
    }

    // Planning buffers
    if (trimmed.startsWith("Planning:")) {
      continue;
    }

    // JIT section
    if (trimmed === "JIT:") {
      inJit = true;
      continue;
    }

    if (inJit) {
      const funcMatch = trimmed.match(/^Functions:\s*(\d+)/);
      if (funcMatch) {
        jitFunctions = parseInt(funcMatch[1], 10);
        continue;
      }
      const optMatch = trimmed.match(
        /^Options:\s*Inlining\s*(true|false),\s*Optimization\s*(true|false),\s*Expressions\s*(true|false),\s*Deforming\s*(true|false)/
      );
      if (optMatch) {
        jitOptions["inlining"] = optMatch[1] === "true";
        jitOptions["optimization"] = optMatch[2] === "true";
        jitOptions["expressions"] = optMatch[3] === "true";
        jitOptions["deforming"] = optMatch[4] === "true";
        continue;
      }
      const timingMatch = trimmed.match(
        /^Timing:\s*Generation\s*([\d.]+)\s*ms.*?Inlining\s*([\d.]+)\s*ms.*?Optimization\s*([\d.]+)\s*ms.*?Emission\s*([\d.]+)\s*ms.*?Total\s*([\d.]+)\s*ms/
      );
      if (timingMatch) {
        jitTiming["generation"] = parseFloat(timingMatch[1]);
        jitTiming["inlining"] = parseFloat(timingMatch[2]);
        jitTiming["optimization"] = parseFloat(timingMatch[3]);
        jitTiming["emission"] = parseFloat(timingMatch[4]);
        jitTiming["total"] = parseFloat(timingMatch[5]);
        inJit = false;

        jit = {
          functions: jitFunctions,
          options: {
            inlining: jitOptions["inlining"] ?? false,
            optimization: jitOptions["optimization"] ?? false,
            expressions: jitOptions["expressions"] ?? false,
            deforming: jitOptions["deforming"] ?? false,
          },
          timing: {
            generation: jitTiming["generation"] ?? 0,
            inlining: jitTiming["inlining"] ?? 0,
            optimization: jitTiming["optimization"] ?? 0,
            emission: jitTiming["emission"] ?? 0,
            total: jitTiming["total"] ?? 0,
          },
        };
        continue;
      }
      continue;
    }

    // Trigger lines
    const triggerMatch = trimmed.match(/^Trigger\s+(.+?):\s*time=([\d.]+)\s*calls=(\d+)/);
    if (triggerMatch) {
      triggers.push({
        name: triggerMatch[1],
        time: parseFloat(triggerMatch[2]),
        calls: parseInt(triggerMatch[3], 10),
      });
      continue;
    }

    // Try to parse as node line
    const nodeData = parseNodeLine(line);
    if (nodeData) {
      nodeEntries.push({ raw: nodeData, extras: [] });
      continue;
    }

    // If not a node line, it's an extra line for the previous node
    if (nodeEntries.length > 0) {
      // Skip lines that are just part of top-level explain metadata
      if (
        !trimmed.startsWith("Planning") &&
        !trimmed.startsWith("Execution") &&
        !trimmed.startsWith("JIT") &&
        !trimmed.startsWith("Trigger")
      ) {
        nodeEntries[nodeEntries.length - 1].extras.push(trimmed);
      }
    }
  }

  const plan = buildTree(nodeEntries);

  return {
    plan,
    executionTime,
    planningTime,
    triggers: triggers.length > 0 ? triggers : undefined,
    jit,
    rawText: input,
    maxTotalTime: 0,
  };
};
