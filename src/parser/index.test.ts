import { describe, it, expect } from "vitest";
import { parseExplain } from "./index";

describe("parseExplain", () => {
  describe("format detection", () => {
    it("parses TEXT format when input does not start with [ or {", () => {
      const input = "Seq Scan on users  (cost=0.00..10.00 rows=100 width=4)";
      const result = parseExplain(input);

      expect(result.plan.nodeType).toBe("Seq Scan");
      expect(result.plan.relation).toBe("users");
      expect(result.rawText).toBe(input);
    });

    it("parses JSON format when input starts with [", () => {
      const input = JSON.stringify([
        {
          Plan: {
            "Node Type": "Seq Scan",
            "Relation Name": "users",
            "Startup Cost": 0,
            "Total Cost": 10,
            "Plan Rows": 100,
            "Plan Width": 4,
          },
        },
      ]);
      const result = parseExplain(input);

      expect(result.plan.nodeType).toBe("Seq Scan");
      expect(result.plan.relation).toBe("users");
      expect(result.rawText).toBe(input);
    });

    it("parses JSON format when input starts with {", () => {
      const input = JSON.stringify({
        Plan: {
          "Node Type": "Nested Loop",
          "Startup Cost": 0,
          "Total Cost": 1,
          "Plan Rows": 1,
          "Plan Width": 0,
        },
      });
      const result = parseExplain(input);

      expect(result.plan.nodeType).toBe("Nested Loop");
    });
  });

  describe("JSON fallback to text", () => {
    it("falls back to text parser when JSON is invalid (e.g. empty array)", () => {
      const input = "[]";
      expect(() => parseExplain(input)).toThrow("No plan nodes found in EXPLAIN output");
    });

    it("succeeds with text when JSON parse fails but rest is valid text", () => {
      const textPlan = "Seq Scan on users  (cost=0.00..1.00 rows=1 width=4)";
      const input = `[invalid json\n${textPlan}`;
      const result = parseExplain(input);

      expect(result.plan.nodeType).toBe("Seq Scan");
      expect(result.plan.relation).toBe("users");
    });
  });

  describe("post-processing", () => {
    it("sets maxTotalTime from plan tree", () => {
      const input =
        "Nested Loop  (cost=0.00..2.00 rows=1 width=0) (actual time=0.1..10.0 rows=1 loops=1)\n" +
        "  ->  Seq Scan on a  (cost=0.00..1.00 rows=1 width=4) (actual time=0.05..2.0 rows=1 loops=1)\n" +
        "  ->  Seq Scan on b  (cost=0.00..1.00 rows=1 width=4) (actual time=0.05..3.0 rows=1 loops=1)";
      const result = parseExplain(input);

      expect(result.maxTotalTime).toBeGreaterThan(0);
      expect(result.plan.totalTimeMs).toBeGreaterThan(0);
      expect(result.plan.exclusiveTime).toBeGreaterThanOrEqual(0);
    });

    it("computes exclusiveTime and totalTimeMs on each node", () => {
      const input =
        "Seq Scan on t  (cost=0.00..1.00 rows=1 width=4) (actual time=0.1..5.0 rows=1 loops=1)";
      const result = parseExplain(input);

      expect(result.plan.totalTimeMs).toBe(5);
      expect(result.plan.exclusiveTime).toBe(5);
      expect(result.maxTotalTime).toBe(5);
    });

    it("computes rowEstimateFactor when planRows and actualRows present", () => {
      const input =
        "Seq Scan on t  (cost=0.00..1.00 rows=100 width=4) (actual time=0.1..1.0 rows=50 loops=1)";
      const result = parseExplain(input);

      expect(result.plan.planRows).toBe(100);
      expect(result.plan.actualRows).toBe(50);
      expect(result.plan.rowEstimateFactor).toBe(-2);
    });
  });

  describe("independent results (visualize different EXPLAIN)", () => {
    it("second parseExplain with different input returns independent plan data", () => {
      const inputA = "Seq Scan on users  (cost=0.00..10.00 rows=100 width=4)";
      const inputB =
        "Nested Loop  (cost=0.00..1.00 rows=1 width=0)\n" +
        "  ->  Index Scan on orders  (cost=0.00..1.00 rows=1 width=4)";

      const resultA = parseExplain(inputA);
      const resultB = parseExplain(inputB);

      expect(resultA.rawText).toBe(inputA);
      expect(resultB.rawText).toBe(inputB);
      expect(resultA.plan.nodeType).toBe("Seq Scan");
      expect(resultA.plan.relation).toBe("users");
      expect(resultB.plan.nodeType).toBe("Nested Loop");
      expect(resultB.plan.children).toHaveLength(1);
      expect(resultB.plan.children[0].relation).toBe("orders");
      expect(resultA.plan).not.toBe(resultB.plan);
    });

    it("parseExplain does not mutate previous result when parsing again", () => {
      const inputA = "Seq Scan on a  (cost=0.00..1.00 rows=1 width=4)";
      const inputB = "Seq Scan on b  (cost=0.00..1.00 rows=1 width=4)";

      const resultA = parseExplain(inputA);
      const resultB = parseExplain(inputB);

      expect(resultA.plan.relation).toBe("a");
      expect(resultB.plan.relation).toBe("b");
      expect(resultA.plan.relation).toBe("a");
    });
  });
});
