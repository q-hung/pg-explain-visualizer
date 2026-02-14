import React from "react";

interface RawPanelProps {
  rawText: string;
}

export const RawPanel: React.FC<RawPanelProps> = ({ rawText }) => {
  return (
    <div className="raw-panel">
      <pre className="raw-output">{rawText}</pre>
    </div>
  );
};
