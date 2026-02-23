import React from "react";

interface TimingBarProps {
  exclusiveTime: number;
  totalTime: number;
  maxTime: number;
}

const formatDuration = (ms: number): string => {
  if (ms === 0) {
    return "0";
  }
  if (ms < 0.001) {
    return `${(ms * 1000000).toFixed(0)}ns`;
  }
  if (ms < 0.1) {
    return `${(ms * 1000).toFixed(0)}\u00b5s`;
  }
  if (ms < 1) {
    return `${ms.toFixed(3)}ms`;
  }
  if (ms < 100) {
    return `${ms.toFixed(1)}ms`;
  }
  if (ms < 1000) {
    return `${Math.round(ms)}ms`;
  }
  const s = ms / 1000;
  if (s < 60) {
    const whole = Math.floor(s);
    const frac = Math.round(ms % 1000);
    return `${whole}s ${frac}ms`;
  }
  const min = Math.floor(s / 60);
  const sec = s % 60;
  return `${min}m ${sec.toFixed(1)}s`;
};

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
