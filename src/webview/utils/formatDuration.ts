/**
 * Format a duration in milliseconds for display.
 * Handles ns, µs, ms, s, and m+s ranges. Returns "N/A" for null/undefined.
 */
export const formatDuration = (ms: number | undefined): string => {
  if (ms == null) {
    return "N/A";
  }
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
