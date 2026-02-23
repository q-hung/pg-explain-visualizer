import React from "react";
import { PlanData, DisplaySettings } from "../types";
import { Tabs, TabId } from "./components/Tabs";
import { PlanTree } from "./components/PlanTree";
import { StatsPanel } from "./components/StatsPanel";
import { RawPanel } from "./components/RawPanel";
import { QueryPanel } from "./components/QueryPanel";
import { formatDuration } from "./utils/formatDuration";
import "./styles/main.css";

interface AppProps {
  planData: PlanData;
}

export const App: React.FC<AppProps> = ({ planData }) => {
  const [activeTab, setActiveTab] = React.useState<TabId>("plan");
  const [settings, setSettings] = React.useState<DisplaySettings>({
    time: true,
    rows: true,
    cost: false,
    buffers: false,
  });

  const toggleSetting = (key: keyof DisplaySettings) => {
    setSettings((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <div className="app">
      <header className="header">
        <div className="summary">
          <div className="summary-item">
            <span className="summary-label">Execution time:</span>
            <span className="summary-value">
              {formatDuration(planData.executionTime)}
            </span>
          </div>
          <div className="summary-item">
            <span className="summary-label">Planning time:</span>
            <span className="summary-value">{formatDuration(planData.planningTime)}</span>
          </div>
          {planData.triggers && planData.triggers.length > 0 && (
            <div className="summary-item">
              <span className="summary-label">Triggers:</span>
              <span className="summary-value">{planData.triggers.length}</span>
            </div>
          )}
          {planData.jit && (
            <div className="summary-item">
              <span className="summary-label">JIT:</span>
              <span className="summary-value">
                {formatDuration(planData.jit.timing.total)}
              </span>
            </div>
          )}
        </div>
        <Tabs
          activeTab={activeTab}
          onTabChange={setActiveTab}
          hasQuery={!!planData.query}
        />
      </header>

      {activeTab === "plan" && (
        <div className="plan-content">
          <div className="settings-bar">
            <span className="settings-label">Settings</span>
            {(["time", "rows", "cost", "buffers"] as const).map((key) => (
              <button
                key={key}
                className={`setting-toggle ${settings[key] ? "setting-toggle--active" : ""}`}
                onClick={() => toggleSetting(key)}
              >
                {key === "rows" ? "rows estimation" : key}
              </button>
            ))}
          </div>
          <PlanTree planData={planData} settings={settings} />
        </div>
      )}

      {activeTab === "stats" && <StatsPanel planData={planData} />}
      {activeTab === "query" && <QueryPanel query={planData.query} />}
      {activeTab === "raw" && <RawPanel rawText={planData.rawText} />}
    </div>
  );
};
