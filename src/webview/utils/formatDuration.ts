/**
 * Format a duration in milliseconds for display.
 * Handles ns, µs, ms, s, and m+s ranges. Returns "N/A" for null/undefined/negative.
 */

const MS_PER_S = 1000;
const NS_PER_MS = 1e6;
const S_PER_MIN = 60;

type Formatter = (ms: number) => string;

const TIERS: { maxMs: number; format: Formatter }[] = [
  { maxMs: 0.001, format: (ms) => `${(ms * NS_PER_MS).toFixed(0)}ns` },
  { maxMs: 0.1, format: (ms) => `${(ms * MS_PER_S).toFixed(0)}\u00b5s` },
  { maxMs: 1, format: (ms) => `${ms.toFixed(3)}ms` },
  { maxMs: 100, format: (ms) => `${ms.toFixed(1)}ms` },
  { maxMs: 1000, format: (ms) => `${Math.round(ms)}ms` },
];

export const formatDuration = (ms: number | undefined): string => {
  if (ms == null || ms < 0) return "N/A";
  if (ms === 0) return "0";

  const tier = TIERS.find((t) => ms < t.maxMs);
  if (tier) return tier.format(ms);

  const s = ms / MS_PER_S;
  if (s < S_PER_MIN) {
    const whole = Math.floor(s);
    const frac = Math.round(ms % MS_PER_S);
    return `${whole}s ${frac}ms`;
  }
  const min = Math.floor(s / S_PER_MIN);
  const sec = s % S_PER_MIN;
  return `${min}m ${sec.toFixed(1)}s`;
};
