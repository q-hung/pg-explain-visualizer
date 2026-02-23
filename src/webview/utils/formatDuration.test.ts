import { describe, it, expect } from "vitest";
import { formatDuration } from "./formatDuration";

describe("formatDuration", () => {
  describe("null and undefined", () => {
    it("returns N/A for undefined", () => {
      expect(formatDuration(undefined)).toBe("N/A");
    });

    it("returns N/A for null", () => {
      expect(formatDuration(null as unknown as undefined)).toBe("N/A");
    });
  });

  describe("invalid or zero", () => {
    it("returns N/A for negative values", () => {
      expect(formatDuration(-1)).toBe("N/A");
      expect(formatDuration(-0.001)).toBe("N/A");
    });

    it("returns 0 for zero", () => {
      expect(formatDuration(0)).toBe("0");
    });
  });

  describe("nanoseconds (ms < 0.001)", () => {
    it("formats sub-millisecond as ns", () => {
      expect(formatDuration(0.0005)).toBe("500ns");
      expect(formatDuration(0.000001)).toBe("1ns");
      expect(formatDuration(0.000999)).toBe("999ns");
    });
  });

  describe("microseconds (ms < 0.1)", () => {
    it("formats as µs", () => {
      expect(formatDuration(0.001)).toBe("1\u00b5s");
      expect(formatDuration(0.05)).toBe("50\u00b5s");
      expect(formatDuration(0.0999)).toBe("100\u00b5s");
    });
  });

  describe("milliseconds (ms < 1)", () => {
    it("formats with 3 decimal places", () => {
      expect(formatDuration(0.5)).toBe("0.500ms");
      expect(formatDuration(0.1234)).toBe("0.123ms");
    });
  });

  describe("milliseconds (ms < 100)", () => {
    it("formats with 1 decimal place", () => {
      expect(formatDuration(1)).toBe("1.0ms");
      expect(formatDuration(50.5)).toBe("50.5ms");
      expect(formatDuration(99.99)).toBe("100.0ms");
    });
  });

  describe("milliseconds (ms < 1000)", () => {
    it("formats as rounded ms", () => {
      expect(formatDuration(500)).toBe("500ms");
      expect(formatDuration(999.4)).toBe("999ms");
      expect(formatDuration(999.6)).toBe("1000ms");
    });
  });

  describe("seconds (1s to under 60s)", () => {
    it("formats as Xs Yms", () => {
      expect(formatDuration(1000)).toBe("1s 0ms");
      expect(formatDuration(1500)).toBe("1s 500ms");
      expect(formatDuration(59999)).toBe("59s 999ms");
    });
  });

  describe("minutes and seconds (>= 60s)", () => {
    it("formats as Xm Y.Ys", () => {
      expect(formatDuration(60000)).toBe("1m 0.0s");
      expect(formatDuration(90000)).toBe("1m 30.0s");
      expect(formatDuration(125000)).toBe("2m 5.0s");
    });
  });
});
