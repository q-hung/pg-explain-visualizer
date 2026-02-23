import React from "react";
import { formatDuration } from "../utils/formatDuration";

interface TimingBarProps {
  exclusiveTime: number;
  totalTime: number;
  maxTime: number;
}

export const TimingBar: React.FC<TimingBarProps> = ({
  exclusiveTime,
  totalTime,
  maxTime,
}) => {
  if (maxTime === 0) {
    return null;
  }

  const exclusivePct = (exclusiveTime / maxTime) * 100;
  const totalPct = (totalTime / maxTime) * 100;

  return (
    <div className="timing-bar-container">
      <div
        className="timing-bar"
        title={`Exclusive: ${formatDuration(exclusiveTime)}, Total: ${formatDuration(totalTime)}`}
      >
        <div
          className="timing-bar__total"
          style={{ width: `${Math.min(totalPct, 100)}%` }}
        />
        <div
          className="timing-bar__exclusive"
          style={{ width: `${Math.min(exclusivePct, 100)}%` }}
        />
      </div>
      <span className="timing-bar__label">{formatDuration(exclusiveTime)}</span>
    </div>
  );
};
