import React from "react";
import { PlanNode, DisplaySettings } from "../../types";
import { TimingBar } from "./TimingBar";

interface NodeRowProps {
  node: PlanNode;
  depth: number;
  isLast: boolean;
  maxTime: number;
  settings: DisplaySettings;
  parentConnectors: boolean[];
  filter?: string;
}

const formatRows = (actual: number | undefined, planned: number): string => {
  if (actual == null) {
    return `est. ${planned.toLocaleString()}`;
  }
  return actual.toLocaleString();
};

const getRowEstimateClass = (factor: number): string => {
  if (factor === 0) {
    return "";
  }
  const absFactor = Math.abs(factor);
  if (absFactor > 1000) {
    return "rows-severe";
  }
  if (absFactor > 100) {
    return "rows-bad";
  }
  if (absFactor > 10) {
    return "rows-warning";
  }
  return "";
};

const formatRowEstimate = (factor: number): string => {
  if (factor === 0) {
    return "";
  }
  if (factor > 0) {
    return `\u2191 ${factor.toFixed(1)}x under`;
  }
  return `\u2193 ${Math.abs(factor).toFixed(1)}x over`;
};

const formatBuffers = (node: PlanNode): string => {
  if (!node.buffers) {
    return "";
  }
  const parts: string[] = [];
  const b = node.buffers;
  if (b.sharedHit) {
    parts.push(`hit=${b.sharedHit.toLocaleString()}`);
  }
  if (b.sharedRead) {
    parts.push(`read=${b.sharedRead.toLocaleString()}`);
  }
  if (b.sharedDirtied) {
    parts.push(`dirtied=${b.sharedDirtied.toLocaleString()}`);
  }
  if (b.sharedWritten) {
    parts.push(`written=${b.sharedWritten.toLocaleString()}`);
  }
  return parts.length > 0 ? `shared ${parts.join(" ")}` : "";
};

const getNodeLabel = (node: PlanNode): string => {
  let label = node.nodeType;
  if (node.relation) {
    label += ` on ${node.relation}`;
    if (node.alias && node.alias !== node.relation) {
      label += ` as ${node.alias}`;
    }
  }
  if (node.indexName) {
    label += ` using ${node.indexName}`;
  }
  return label;
};

const nodeMatchesFilter = (node: PlanNode, filter: string): boolean => {
  if (!filter) return true;
  const lower = filter.toLowerCase();
  const fields = [
    node.nodeType,
    node.relation,
    node.alias,
    node.indexName,
    node.schema,
  ].filter(Boolean) as string[];
  return fields.some((f) => f.toLowerCase().includes(lower));
};

export const NodeRow: React.FC<NodeRowProps> = ({
  node,
  depth,
  isLast,
  maxTime,
  settings,
  parentConnectors,
  filter = "",
}) => {
  const [expanded, setExpanded] = React.useState(false);

  const hasDetails =
    node.filter ||
    node.indexCondition ||
    node.hashCondition ||
    node.sortKey ||
    (node.buffers && settings.buffers);

  const matchesFilter = nodeMatchesFilter(node, filter);
  const filterActive = filter.length > 0;
  const rowClass = [
    "node-row",
    hasDetails ? "node-row--expandable" : "",
    filterActive && matchesFilter ? "node-row--match" : "",
    filterActive && !matchesFilter ? "node-row--dimmed" : "",
  ]
    .filter(Boolean)
    .join(" ");

  const prefix = parentConnectors
    .map((showLine) => (showLine ? "\u2502 " : "  "))
    .join("");
  const connector = depth === 0 ? "" : isLast ? "\u2514 " : "\u251C ";

  return (
    <>
      <div className={rowClass} onClick={() => hasDetails && setExpanded(!expanded)}>
        <div className="node-row__number">#{node.id}</div>
        <div className="node-row__tree">
          <span className="tree-prefix">
            {prefix}
            {connector}
          </span>
          <span className="node-type">{getNodeLabel(node)}</span>
        </div>

        <div className="node-row__metrics">
          {settings.time && (
            <div className="node-row__timing">
              <TimingBar
                exclusiveTime={node.exclusiveTime}
                totalTime={node.totalTimeMs}
                maxTime={maxTime}
              />
            </div>
          )}

          {settings.rows && (
            <div className="node-row__rows">
              <span className="rows-actual">
                {formatRows(node.actualRows, node.planRows)}
              </span>
              <span className="rows-planned">{node.planRows.toLocaleString()}</span>
              {node.rowEstimateFactor !== 0 && (
                <span
                  className={`rows-estimate ${getRowEstimateClass(node.rowEstimateFactor)}`}
                >
                  {formatRowEstimate(node.rowEstimateFactor)}
                </span>
              )}
            </div>
          )}

          {settings.cost && (
            <div className="node-row__cost">
              <span>{node.totalCost.toFixed(2)}</span>
            </div>
          )}
        </div>
      </div>

      {expanded && hasDetails && (
        <div className="node-details">
          <div className="node-details__indent">
            <span className="tree-prefix">
              {prefix}
              {"  "}
            </span>
          </div>
          <div className="node-details__content">
            {node.filter && (
              <div className="detail-row">
                <span className="detail-label">Filter:</span>
                <span className="detail-value">{node.filter}</span>
              </div>
            )}
            {node.rowsRemovedByFilter != null && (
              <div className="detail-row">
                <span className="detail-label">Rows Removed:</span>
                <span className="detail-value">
                  {node.rowsRemovedByFilter.toLocaleString()}
                </span>
              </div>
            )}
            {node.indexCondition && (
              <div className="detail-row">
                <span className="detail-label">Index Cond:</span>
                <span className="detail-value">{node.indexCondition}</span>
              </div>
            )}
            {node.hashCondition && (
              <div className="detail-row">
                <span className="detail-label">Hash Cond:</span>
                <span className="detail-value">{node.hashCondition}</span>
              </div>
            )}
            {node.sortKey && (
              <div className="detail-row">
                <span className="detail-label">Sort Key:</span>
                <span className="detail-value">{node.sortKey.join(", ")}</span>
              </div>
            )}
            {node.sortMethod && (
              <div className="detail-row">
                <span className="detail-label">Sort Method:</span>
                <span className="detail-value">{node.sortMethod}</span>
              </div>
            )}
            {settings.buffers && node.buffers && (
              <div className="detail-row">
                <span className="detail-label">Buffers:</span>
                <span className="detail-value">{formatBuffers(node)}</span>
              </div>
            )}
            {node.workersPlanned != null && (
              <div className="detail-row">
                <span className="detail-label">Workers:</span>
                <span className="detail-value">
                  {node.workersLaunched ?? 0} / {node.workersPlanned} launched
                </span>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
};
