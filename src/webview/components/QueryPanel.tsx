import React from "react";

interface QueryPanelProps {
  query: string | undefined;
}

export const QueryPanel: React.FC<QueryPanelProps> = ({ query }) => {
  if (!query) {
    return (
      <div className="query-panel">
        <p className="empty-state">No query text available.</p>
      </div>
    );
  }

  return (
    <div className="query-panel">
      <pre className="query-output">{query}</pre>
    </div>
  );
};
