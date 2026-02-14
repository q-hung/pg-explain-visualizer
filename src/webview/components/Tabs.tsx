import React from "react";

export type TabId = "plan" | "stats" | "query" | "raw";

interface TabsProps {
  activeTab: TabId;
  onTabChange: (tab: TabId) => void;
  hasQuery: boolean;
}

const tabs: Array<{ id: TabId; label: string }> = [
  { id: "plan", label: "Plan" },
  { id: "stats", label: "Stats" },
  { id: "query", label: "Query" },
  { id: "raw", label: "Raw" },
];

export const Tabs: React.FC<TabsProps> = ({ activeTab, onTabChange, hasQuery }) => {
  return (
    <div className="tabs">
      {tabs.map((tab) => {
        if (tab.id === "query" && !hasQuery) {return null;}
        return (
          <button
            key={tab.id}
            className={`tab ${activeTab === tab.id ? "tab--active" : ""}`}
            onClick={() => onTabChange(tab.id)}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
};
