import React from "react";
import { PlanData, PlanNode, StatsEntry } from "../../types";
import { formatDuration } from "../utils/formatDuration";

interface StatsPanelProps {
  planData: PlanData;
}

interface StatsSection {
  title: string;
  entries: StatsEntry[];
}

const collectNodes = (node: PlanNode): PlanNode[] => {
  const result: PlanNode[] = [node];
  for (const child of node.children) {
    result.push(...collectNodes(child));
  }
  return result;
};

const computeStats = (planData: PlanData): StatsSection[] => {
  const allNodes = collectNodes(planData.plan);
  const totalTime = planData.maxTotalTime || 1;

  // Per table stats
  const tableMap = new Map<
    string,
    { count: number; totalTime: number; nodes: StatsEntry["nodes"] }
  >();
  for (const node of allNodes) {
    if (node.relation) {
      const entry = tableMap.get(node.relation) || {
        count: 0,
        totalTime: 0,
        nodes: [],
      };
      entry.count++;
      entry.totalTime += node.exclusiveTime;
      entry.nodes.push({
        id: node.id,
        nodeType: node.nodeType,
        time: node.exclusiveTime,
        percentage: (node.exclusiveTime / totalTime) * 100,
      });
      tableMap.set(node.relation, entry);
    }
  }

  const tableEntries: StatsEntry[] = Array.from(tableMap.entries())
    .map(([name, data]) => ({
      name,
      count: data.count,
      totalTime: data.totalTime,
      percentage: (data.totalTime / totalTime) * 100,
      nodes: data.nodes.sort((a, b) => b.time - a.time),
    }))
    .sort((a, b) => b.totalTime - a.totalTime);

  // Per node type stats
  const typeMap = new Map<
    string,
    { count: number; totalTime: number; nodes: StatsEntry["nodes"] }
  >();
  for (const node of allNodes) {
    const entry = typeMap.get(node.nodeType) || {
      count: 0,
      totalTime: 0,
      nodes: [],
    };
    entry.count++;
    entry.totalTime += node.exclusiveTime;
    entry.nodes.push({
      id: node.id,
      nodeType: node.nodeType,
      time: node.exclusiveTime,
      percentage: (node.exclusiveTime / totalTime) * 100,
    });
    typeMap.set(node.nodeType, entry);
  }

  const typeEntries: StatsEntry[] = Array.from(typeMap.entries())
    .map(([name, data]) => ({
      name,
      count: data.count,
      totalTime: data.totalTime,
      percentage: (data.totalTime / totalTime) * 100,
      nodes: data.nodes.sort((a, b) => b.time - a.time),
    }))
    .sort((a, b) => b.totalTime - a.totalTime);

  // Per index stats
  const indexMap = new Map<
    string,
    { count: number; totalTime: number; nodes: StatsEntry["nodes"] }
  >();
  for (const node of allNodes) {
    if (node.indexName) {
      const entry = indexMap.get(node.indexName) || {
        count: 0,
        totalTime: 0,
        nodes: [],
      };
      entry.count++;
      entry.totalTime += node.exclusiveTime;
      entry.nodes.push({
        id: node.id,
        nodeType: node.nodeType,
        time: node.exclusiveTime,
        percentage: (node.exclusiveTime / totalTime) * 100,
      });
      indexMap.set(node.indexName, entry);
    }
  }

  const indexEntries: StatsEntry[] = Array.from(indexMap.entries())
    .map(([name, data]) => ({
      name,
      count: data.count,
      totalTime: data.totalTime,
      percentage: (data.totalTime / totalTime) * 100,
      nodes: data.nodes.sort((a, b) => b.time - a.time),
    }))
    .sort((a, b) => b.totalTime - a.totalTime);

  return [
    { title: "Per table stats", entries: tableEntries },
    { title: "Per node type stats", entries: typeEntries },
    { title: "Per index stats", entries: indexEntries },
  ];
};

const StatsSectionComponent: React.FC<{
  section: StatsSection;
}> = ({ section }) => {
  const [expandedEntries, setExpandedEntries] = React.useState<Set<string>>(new Set());

  const toggleEntry = (name: string) => {
    setExpandedEntries((prev) => {
      const next = new Set(prev);
      if (next.has(name)) {
        next.delete(name);
      } else {
        next.add(name);
      }
      return next;
    });
  };

  if (section.entries.length === 0) {
    return null;
  }

  return (
    <div className="stats-section">
      <h3 className="stats-section__title">{section.title}</h3>
      <table className="stats-table">
        <thead>
          <tr>
            <th className="stats-table__name">
              {section.title.includes("table")
                ? "Table"
                : section.title.includes("index")
                  ? "Index Name"
                  : "Node Type"}
            </th>
            <th className="stats-table__count">Count</th>
            <th className="stats-table__time">Time &#x25BC;</th>
          </tr>
        </thead>
        <tbody>
          {section.entries.map((entry) => (
            <React.Fragment key={entry.name}>
              <tr
                className="stats-row stats-row--parent"
                onClick={() => toggleEntry(entry.name)}
              >
                <td className="stats-table__name">
                  <span className="stats-expand">
                    {expandedEntries.has(entry.name) ? "\u25BC" : "\u25B6"}
                  </span>
                  {entry.name}
                </td>
                <td className="stats-table__count">{entry.count}</td>
                <td className="stats-table__time">
                  <div className="stats-time-cell">
                    <span>{formatDuration(entry.totalTime)}</span>
                    <div className="stats-pct-bar">
                      <div
                        className="stats-pct-bar__fill"
                        style={{ width: `${Math.min(entry.percentage, 100)}%` }}
                      />
                    </div>
                    <span className="stats-pct">{entry.percentage.toFixed(0)}%</span>
                  </div>
                </td>
              </tr>
              {expandedEntries.has(entry.name) &&
                entry.nodes.map((n) => (
                  <tr
                    key={`${entry.name}-${n.id}`}
                    className="stats-row stats-row--child"
                  >
                    <td className="stats-table__name stats-child-name">
                      #{n.id} {n.nodeType}
                    </td>
                    <td className="stats-table__count"></td>
                    <td className="stats-table__time">
                      <div className="stats-time-cell">
                        <span>{formatDuration(n.time)}</span>
                        <div className="stats-pct-bar">
                          <div
                            className="stats-pct-bar__fill"
                            style={{
                              width: `${Math.min(n.percentage, 100)}%`,
                            }}
                          />
                        </div>
                        <span className="stats-pct">{n.percentage.toFixed(0)}%</span>
                      </div>
                    </td>
                  </tr>
                ))}
            </React.Fragment>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export const StatsPanel: React.FC<StatsPanelProps> = ({ planData }) => {
  const sections = React.useMemo(() => computeStats(planData), [planData]);

  return (
    <div className="stats-panel">
      {sections.map((section) => (
        <StatsSectionComponent key={section.title} section={section} />
      ))}
    </div>
  );
};
