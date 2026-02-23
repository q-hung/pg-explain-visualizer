import { PlanNode, PlanData } from "../types";
import { parseJsonExplain } from "./jsonParser";
import { parseTextExplain } from "./textParser";

/**
 * Determine if a node is a Gather or Gather Merge (parallel root).
 */
const isGatherNode = (node: PlanNode): boolean =>
  node.nodeType === "Gather" || node.nodeType === "Gather Merge";

/**
 * Compute totalTimeMs, exclusiveTime, and rowEstimateFactor for all nodes
 * via a recursive post-order traversal.
 *
 * For parallel plans, nodes under a Gather/Gather Merge have their
 * accumulated time (actualTotalTime * actualLoops) divided by the
 * worker multiplier (workers launched + 1) so that the times represent
 * wall-clock contribution rather than total CPU time across all workers.
 */
const postProcess = (
  node: PlanNode,
  maxTotalTime: { value: number },
  workerMultiplier: number = 1
): void => {
  // Compute this node's adjusted total time
  const rawAccum = (node.actualTotalTime ?? 0) * (node.actualLoops ?? 1);
  node.totalTimeMs = rawAccum / workerMultiplier;

  // Determine worker multiplier for children
  // If this node is Gather/Gather Merge, its children run in parallel
  // with (workersLaunched + 1) copies (workers + leader)
  let childMultiplier = workerMultiplier;
  if (isGatherNode(node)) {
    const workers = node.workersLaunched ?? node.workersPlanned ?? 0;
    if (workers > 0) {
      childMultiplier = workerMultiplier * (workers + 1);
    }
  }

  // Recurse children
  for (const child of node.children) {
    postProcess(child, maxTotalTime, childMultiplier);
  }

  // Compute exclusive time = own total - sum of children's total
  const childrenTotal = node.children.reduce((sum, child) => sum + child.totalTimeMs, 0);
  node.exclusiveTime = Math.max(0, node.totalTimeMs - childrenTotal);

  // Row estimation factor
  if (node.planRows > 0 && node.actualRows != null) {
    if (node.actualRows > node.planRows) {
      node.rowEstimateFactor = node.actualRows / node.planRows;
    } else if (node.actualRows === 0) {
      node.rowEstimateFactor = 0;
    } else {
      node.rowEstimateFactor = -(node.planRows / node.actualRows);
    }
  }

  // Track max total time
  if (node.totalTimeMs > maxTotalTime.value) {
    maxTotalTime.value = node.totalTimeMs;
  }
};

/**
 * Detect format and parse EXPLAIN output into structured PlanData.
 */
export const parseExplain = (input: string): PlanData => {
  const trimmed = input.trim();

  let planData: PlanData;

  // Try JSON first
  if (trimmed.startsWith("[") || trimmed.startsWith("{")) {
    try {
      planData = parseJsonExplain(trimmed);
    } catch {
      // Fall back to text parser
      planData = parseTextExplain(input);
    }
  } else {
    planData = parseTextExplain(input);
  }

  // Post-process: compute exclusive times and row estimation factors
  const maxTotalTime = { value: 0 };
  postProcess(planData.plan, maxTotalTime);
  planData.maxTotalTime = maxTotalTime.value;

  return planData;
};
