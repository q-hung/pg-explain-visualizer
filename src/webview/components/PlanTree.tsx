import React from "react";
import { PlanData, PlanNode, DisplaySettings } from "../../types";
import { NodeRow } from "./NodeRow";

interface PlanTreeProps {
  planData: PlanData;
  settings: DisplaySettings;
}

interface FlatNode {
  node: PlanNode;
  depth: number;
  isLast: boolean;
  parentConnectors: boolean[];
}

const flattenTree = (
  node: PlanNode,
  depth: number,
  isLast: boolean,
  parentConnectors: boolean[]
): FlatNode[] => {
  const result: FlatNode[] = [];
  result.push({ node, depth, isLast, parentConnectors });

  node.children.forEach((child, idx) => {
    const childIsLast = idx === node.children.length - 1;
    const newConnectors =
      depth === 0
        ? []
        : [...parentConnectors, !isLast];
    result.push(
      ...flattenTree(child, depth + 1, childIsLast, newConnectors)
    );
  });

  return result;
};

export const PlanTree: React.FC<PlanTreeProps> = ({ planData, settings }) => {
  const flatNodes = React.useMemo(
    () => flattenTree(planData.plan, 0, true, []),
    [planData.plan]
  );

  return (
    <div className="plan-tree">
      <div className="plan-tree__header">
        <div className="plan-tree__col-num">#</div>
        <div className="plan-tree__col-node">Node</div>
        {settings.time && <div className="plan-tree__col-time">Time</div>}
        {settings.rows && <div className="plan-tree__col-rows">Rows (actual / est.)</div>}
        {settings.cost && <div className="plan-tree__col-cost">Cost</div>}
      </div>
      <div className="plan-tree__body">
        {flatNodes.map((flat) => (
          <NodeRow
            key={flat.node.id}
            node={flat.node}
            depth={flat.depth}
            isLast={flat.isLast}
            maxTime={planData.maxTotalTime}
            settings={settings}
            parentConnectors={flat.parentConnectors}
          />
        ))}
      </div>
    </div>
  );
};
