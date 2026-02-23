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

  React.useEffect(() => {
    const handler = (event: MessageEvent) => {
      const message = event.data;
      if (message.type === "setPlanData") {
        setPlanData(message.data as PlanData);
        vscode.setState(message.data);
      }
    };

    window.addEventListener("message", handler);

    // Restore state if available
    const savedState = vscode.getState() as PlanData | null;
    if (savedState) {
      setPlanData(savedState);
    }

    // Tell the extension we're ready
    vscode.postMessage({ type: "ready" });

    return () => window.removeEventListener("message", handler);
  }, []);

  if (!planData) {
    return (
      <div className="loading">
        <p>Waiting for EXPLAIN data...</p>
      </div>
    );
  }

  return <App planData={planData} />;
};

const container = document.getElementById("root");
if (container) {
  const root = createRoot(container);
  root.render(<Root />);
}
