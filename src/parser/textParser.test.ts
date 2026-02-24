import { describe, it, expect } from "vitest";
import { parseTextExplain } from "./textParser";

describe("parseTextExplain", () => {
  describe("empty or invalid input", () => {
    it("throws when no plan nodes are present", () => {
      expect(() => parseTextExplain("")).toThrow("No plan nodes found in EXPLAIN output");
      expect(() =>
        parseTextExplain("Planning Time: 1.0 ms\nExecution Time: 2.0 ms")
      ).toThrow("No plan nodes found in EXPLAIN output");
    });
  });

  describe("single node", () => {
    it("parses a minimal node line (cost only, no actual time)", () => {
      const input = "Seq Scan on users  (cost=0.00..10.50 rows=100 width=4)";
      const result = parseTextExplain(input);

      expect(result.plan.id).toBe(1);
      expect(result.plan.nodeType).toBe("Seq Scan");
      expect(result.plan.relation).toBe("users");
      expect(result.plan.startupCost).toBe(0);
      expect(result.plan.totalCost).toBe(10.5);
      expect(result.plan.planRows).toBe(100);
      expect(result.plan.planWidth).toBe(4);
      expect(result.plan.actualTotalTime).toBeUndefined();
      expect(result.plan.children).toEqual([]);
      expect(result.rawText).toBe(input);
    });

    it("parses node with actual time", () => {
      const input =
        "Seq Scan on users  (cost=0.00..10.50 rows=100 width=4) (actual time=0.1..5.2 rows=99 loops=1)";
      const result = parseTextExplain(input);

      expect(result.plan.actualStartupTime).toBe(0.1);
      expect(result.plan.actualTotalTime).toBe(5.2);
      expect(result.plan.actualRows).toBe(99);
      expect(result.plan.actualLoops).toBe(1);
    });

    it("parses node with alias", () => {
      const input = "Seq Scan on users u  (cost=0.00..1.00 rows=1 width=4)";
      const result = parseTextExplain(input);

      expect(result.plan.relation).toBe("users");
      expect(result.plan.alias).toBe("u");
    });

    it("parses Index Scan using ... on ...", () => {
      const input =
        'Index Scan using "PK_users" on users u  (cost=0.15..8.17 rows=1 width=4)';
      const result = parseTextExplain(input);

      expect(result.plan.nodeType).toBe("Index Scan");
      expect(result.plan.indexName).toBe("PK_users");
      expect(result.plan.relation).toBe("users");
      expect(result.plan.alias).toBe("u");
    });

    it("parses Nested Loop (no relation)", () => {
      const input = "Nested Loop  (cost=1.00..2.00 rows=10 width=8)";
      const result = parseTextExplain(input);

      expect(result.plan.nodeType).toBe("Nested Loop");
      expect(result.plan.relation).toBeUndefined();
    });
  });

  describe("tree structure", () => {
    it("builds parent-child from indentation", () => {
      const input = `Nested Loop  (cost=0.00..1.00 rows=1 width=0)
  ->  Seq Scan on a  (cost=0.00..1.00 rows=1 width=4)
  ->  Seq Scan on b  (cost=0.00..1.00 rows=1 width=4)`;
      const result = parseTextExplain(input);

      expect(result.plan.nodeType).toBe("Nested Loop");
      expect(result.plan.children).toHaveLength(2);
      expect(result.plan.children[0].nodeType).toBe("Seq Scan");
      expect(result.plan.children[0].relation).toBe("a");
      expect(result.plan.children[1].nodeType).toBe("Seq Scan");
      expect(result.plan.children[1].relation).toBe("b");
    });
  });

  describe("extra lines (Filter, Buffers, etc.)", () => {
    it("attaches Filter to the previous node", () => {
      const input = `Seq Scan on users  (cost=0.00..1.00 rows=1 width=4)
  Filter: (id = 1)`;
      const result = parseTextExplain(input);

      expect(result.plan.filter).toBe("(id = 1)");
    });

    it("attaches Rows Removed by Filter", () => {
      const input = `Seq Scan on users  (cost=0.00..1.00 rows=1 width=4)
  Rows Removed by Filter: 42`;
      const result = parseTextExplain(input);

      expect(result.plan.rowsRemovedByFilter).toBe(42);
    });

    it("attaches Index Cond", () => {
      const input = `Index Scan on users  (cost=0.00..1.00 rows=1 width=4)
  Index Cond: (id = 1)`;
      const result = parseTextExplain(input);

      expect(result.plan.indexCondition).toBe("(id = 1)");
    });

    it("attaches Buffers line", () => {
      const input = `Seq Scan on users  (cost=0.00..1.00 rows=1 width=4)
  Buffers: shared hit=10 read=2 dirtied=1 written=0`;
      const result = parseTextExplain(input);

      expect(result.plan.buffers).toEqual({
        sharedHit: 10,
        sharedRead: 2,
        sharedDirtied: 1,
        sharedWritten: 0,
      });
    });

    it("attaches Sort Key", () => {
      const input = `Sort  (cost=1.00..1.01 rows=1 width=4)
  Sort Key: a, b`;
      const result = parseTextExplain(input);

      expect(result.plan.sortKey).toEqual(["a", "b"]);
    });

    it("attaches Workers Planned and Workers Launched", () => {
      const input = `Gather  (cost=0.00..1.00 rows=1 width=4)
  Workers Planned: 2
  Workers Launched: 2`;
      const result = parseTextExplain(input);

      expect(result.plan.workersPlanned).toBe(2);
      expect(result.plan.workersLaunched).toBe(2);
    });
  });

  describe("metadata", () => {
    it("parses Execution Time and Planning Time", () => {
      const input = `Seq Scan on t  (cost=0.00..1.00 rows=1 width=4)
Planning Time: 1.5 ms
Execution Time: 2.25 ms`;
      const result = parseTextExplain(input);

      expect(result.planningTime).toBe(1.5);
      expect(result.executionTime).toBe(2.25);
    });

    it("parses JIT section", () => {
      const input = `Seq Scan on t  (cost=0.00..1.00 rows=1 width=4)
JIT:
  Functions: 3
  Options: Inlining true, Optimization true, Expressions false, Deforming true
  Timing: Generation 0.1 ms, Inlining 0.2 ms, Optimization 0.3 ms, Emission 0.4 ms, Total 1.0 ms
Execution Time: 5.0 ms`;
      const result = parseTextExplain(input);

      expect(result.jit).toBeDefined();
      expect(result.jit?.functions).toBe(3);
      expect(result.jit?.options).toEqual({
        inlining: true,
        optimization: true,
        expressions: false,
        deforming: true,
      });
      expect(result.jit?.timing).toEqual({
        generation: 0.1,
        inlining: 0.2,
        optimization: 0.3,
        emission: 0.4,
        total: 1.0,
      });
    });

    it("parses Trigger lines", () => {
      const input = `Seq Scan on t  (cost=0.00..1.00 rows=1 width=4)
Trigger my_trigger: time=0.5 calls=10
Execution Time: 1.0 ms`;
      const result = parseTextExplain(input);

      expect(result.triggers).toHaveLength(1);
      expect(result.triggers?.[0]).toEqual({
        name: "my_trigger",
        time: 0.5,
        calls: 10,
      });
    });
  });

  describe("rawText", () => {
    it("preserves original input in rawText", () => {
      const input = "Seq Scan on x  (cost=0..1 rows=1 width=0)";
      const result = parseTextExplain(input);
      expect(result.rawText).toBe(input);
    });
  });

  describe("independent results (multiple parses)", () => {
    it("second parseTextExplain with different input returns independent plan", () => {
      const inputA = "Seq Scan on users  (cost=0.00..1.00 rows=1 width=4)";
      const inputB =
        "Nested Loop  (cost=0.00..1.00 rows=1 width=0)\n" +
        "  ->  Seq Scan on orders  (cost=0.00..1.00 rows=1 width=4)";

      const resultA = parseTextExplain(inputA);
      const resultB = parseTextExplain(inputB);

      expect(resultA.rawText).toBe(inputA);
      expect(resultB.rawText).toBe(inputB);
      expect(resultA.plan.relation).toBe("users");
      expect(resultB.plan.nodeType).toBe("Nested Loop");
      expect(resultB.plan.children[0].relation).toBe("orders");
      expect(resultA.plan).not.toBe(resultB.plan);
    });

    it("first result unchanged after parsing different text", () => {
      const inputA = "Seq Scan on table_a  (cost=0.00..1.00 rows=1 width=4)";
      const inputB = "Seq Scan on table_b  (cost=0.00..1.00 rows=1 width=4)";

      const resultA = parseTextExplain(inputA);
      parseTextExplain(inputB);

      expect(resultA.plan.relation).toBe("table_a");
    });
  });
});
