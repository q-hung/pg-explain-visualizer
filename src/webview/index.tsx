import React from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import { PlanData } from "../types";

declare function acquireVsCodeApi(): {
  postMessage(message: unknown): void;
  getState(): unknown;
  setState(state: unknown): void;
};

const vscode = acquireVsCodeApi();

const Root = () => {
  const [planData, setPlanData] = React.useState<PlanData | null>(null);
  const [planVersion, setPlanVersion] = React.useState(0);

  React.useEffect(() => {
    const handler = (event: MessageEvent) => {
      const message = event.data;
      if (message.type === "setPlanData" && message.data != null) {
        setPlanData(message.data as PlanData);
        setPlanVersion((v) => (message.version != null ? message.version : v));
        vscode.setState(message.data);
      }
    };

    window.addEventListener("message", handler);

    // Always ask extension for current plan first (ensures we get fresh data when user visualizes a different EXPLAIN)
    vscode.postMessage({ type: "ready" });

    // Fallback: if no setPlanData received (e.g. panel restored after restart), restore from persisted state
    const fallbackTimer = window.setTimeout(() => {
      setPlanData((current) => {
        if (current != null) return current;
        const saved = vscode.getState() as PlanData | null;
        return saved ?? null;
      });
      setPlanVersion((v) => v + 1);
    }, 400);

    return () => {
      window.removeEventListener("message", handler);
      window.clearTimeout(fallbackTimer);
    };
  }, []);

  if (!planData) {
    return (
      <div className="loading">
        <p>Waiting for EXPLAIN data...</p>
      </div>
    );
  }

  return <App key={planVersion} planData={planData} />;
};

const container = document.getElementById("root");
if (container) {
  const root = createRoot(container);
  root.render(<Root />);
}
