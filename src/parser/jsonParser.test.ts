import { describe, it, expect } from "vitest";
import { parseJsonExplain } from "./jsonParser";

const minimalPlan = {
  "Node Type": "Seq Scan",
  "Startup Cost": 0,
  "Total Cost": 10,
  "Plan Rows": 100,
  "Plan Width": 4,
};

describe("parseJsonExplain", () => {
  describe("invalid input", () => {
    it("throws on invalid JSON", () => {
      expect(() => parseJsonExplain("not json")).toThrow();
      expect(() => parseJsonExplain("{")).toThrow();
    });

    it("throws when root is missing (empty array)", () => {
      expect(() => parseJsonExplain("[]")).toThrow(
        "Invalid EXPLAIN JSON: expected a non-empty plan object"
      );
    });

    it("throws when root is null", () => {
      expect(() => parseJsonExplain("[null]")).toThrow(
        "Invalid EXPLAIN JSON: expected a non-empty plan object"
      );
    });

    it("throws when Plan is missing", () => {
      expect(() => parseJsonExplain("[{}]")).toThrow(
        "Invalid EXPLAIN JSON: missing or invalid Plan"
      );
    });

    it("throws when Plan is null", () => {
      expect(() => parseJsonExplain('[{"Plan": null}]')).toThrow(
        "Invalid EXPLAIN JSON: missing or invalid Plan"
      );
    });

    it("throws when Plan is not an object", () => {
      expect(() => parseJsonExplain('[{"Plan": []}]')).toThrow(
        "Invalid EXPLAIN JSON: missing or invalid Plan"
      );
    });
  });

  describe("root format", () => {
    it("accepts array format (EXPLAIN FORMAT JSON typical output)", () => {
      const input = JSON.stringify([{ Plan: minimalPlan }]);
      const result = parseJsonExplain(input);
      expect(result.plan.nodeType).toBe("Seq Scan");
      expect(result.rawText).toBe(input);
    });

    it("accepts object format (single object with Plan)", () => {
      const input = JSON.stringify({ Plan: minimalPlan });
      const result = parseJsonExplain(input);
      expect(result.plan.nodeType).toBe("Seq Scan");
    });
  });

  describe("plan node", () => {
    it("parses minimal plan (cost and rows only)", () => {
      const input = JSON.stringify([{ Plan: minimalPlan }]);
      const result = parseJsonExplain(input);

      expect(result.plan.id).toBe(1);
      expect(result.plan.nodeType).toBe("Seq Scan");
      expect(result.plan.startupCost).toBe(0);
      expect(result.plan.totalCost).toBe(10);
      expect(result.plan.planRows).toBe(100);
      expect(result.plan.planWidth).toBe(4);
      expect(result.plan.exclusiveTime).toBe(0);
      expect(result.plan.totalTimeMs).toBe(0);
      expect(result.plan.rowEstimateFactor).toBe(0);
      expect(result.plan.children).toEqual([]);
    });

    it("defaults Node Type to Unknown when missing", () => {
      const plan = { ...minimalPlan };
      delete (plan as Record<string, unknown>)["Node Type"];
      const input = JSON.stringify([{ Plan: plan }]);
      const result = parseJsonExplain(input);
      expect(result.plan.nodeType).toBe("Unknown");
    });

    it("parses relation, schema, alias, index name", () => {
      const plan = {
        ...minimalPlan,
        "Relation Name": "users",
        Schema: "public",
        Alias: "u",
        "Index Name": "users_pkey",
      };
      const input = JSON.stringify([{ Plan: plan }]);
      const result = parseJsonExplain(input);

      expect(result.plan.relation).toBe("users");
      expect(result.plan.schema).toBe("public");
      expect(result.plan.alias).toBe("u");
      expect(result.plan.indexName).toBe("users_pkey");
    });

    it("parses actual execution (ANALYZE) fields", () => {
      const plan = {
        ...minimalPlan,
        "Actual Startup Time": 0.1,
        "Actual Total Time": 5.2,
        "Actual Rows": 99,
        "Actual Loops": 2,
      };
      const input = JSON.stringify([{ Plan: plan }]);
      const result = parseJsonExplain(input);

      expect(result.plan.actualStartupTime).toBe(0.1);
      expect(result.plan.actualTotalTime).toBe(5.2);
      expect(result.plan.actualRows).toBe(99);
      expect(result.plan.actualLoops).toBe(2);
    });

    it("parses filter, index cond, hash cond, join type", () => {
      const plan = {
        ...minimalPlan,
        Filter: "(id = 1)",
        "Index Cond": "(id = 1)",
        "Hash Cond": "(a.id = b.id)",
        "Join Type": "Inner",
      };
      const input = JSON.stringify([{ Plan: plan }]);
      const result = parseJsonExplain(input);

      expect(result.plan.filter).toBe("(id = 1)");
      expect(result.plan.indexCondition).toBe("(id = 1)");
      expect(result.plan.hashCondition).toBe("(a.id = b.id)");
      expect(result.plan.joinType).toBe("Inner");
    });

    it("parses sort key, sort method, output", () => {
      const plan = {
        ...minimalPlan,
        "Sort Key": ["a", "b"],
        "Sort Method": "quicksort",
        Output: ["id", "name"],
      };
      const input = JSON.stringify([{ Plan: plan }]);
      const result = parseJsonExplain(input);

      expect(result.plan.sortKey).toEqual(["a", "b"]);
      expect(result.plan.sortMethod).toBe("quicksort");
      expect(result.plan.output).toEqual(["id", "name"]);
    });

    it("parses workers and buffers", () => {
      const plan = {
        ...minimalPlan,
        "Workers Planned": 2,
        "Workers Launched": 2,
        "Shared Hit Blocks": 10,
        "Shared Read Blocks": 5,
      };
      const input = JSON.stringify([{ Plan: plan }]);
      const result = parseJsonExplain(input);

      expect(result.plan.workersPlanned).toBe(2);
      expect(result.plan.workersLaunched).toBe(2);
      expect(result.plan.buffers).toEqual({
        sharedHit: 10,
        sharedRead: 5,
      });
    });
  });

  describe("nested plans (children)", () => {
    it("parses Plans array as children", () => {
      const plan = {
        ...minimalPlan,
        "Node Type": "Nested Loop",
        Plans: [
          { ...minimalPlan, "Node Type": "Seq Scan", "Relation Name": "a" },
          { ...minimalPlan, "Node Type": "Seq Scan", "Relation Name": "b" },
        ],
      };
      const input = JSON.stringify([{ Plan: plan }]);
      const result = parseJsonExplain(input);

      expect(result.plan.nodeType).toBe("Nested Loop");
      expect(result.plan.children).toHaveLength(2);
      expect(result.plan.children[0].nodeType).toBe("Seq Scan");
      expect(result.plan.children[0].relation).toBe("a");
      expect(result.plan.children[1].nodeType).toBe("Seq Scan");
      expect(result.plan.children[1].relation).toBe("b");
    });

    it("assigns numeric ids to root and each child", () => {
      const plan = {
        ...minimalPlan,
        "Node Type": "Nested Loop",
        Plans: [
          { ...minimalPlan, "Node Type": "Seq Scan" },
          { ...minimalPlan, "Node Type": "Seq Scan" },
        ],
      };
      const input = JSON.stringify([{ Plan: plan }]);
      const result = parseJsonExplain(input);

      expect(typeof result.plan.id).toBe("number");
      expect(result.plan.children).toHaveLength(2);
      expect(typeof result.plan.children[0].id).toBe("number");
      expect(typeof result.plan.children[1].id).toBe("number");
    });
  });

  describe("root metadata", () => {
    it("parses Execution Time and Planning Time", () => {
      const input = JSON.stringify([
        {
          Plan: minimalPlan,
          "Execution Time": 12.5,
          "Planning Time": 0.8,
        },
      ]);
      const result = parseJsonExplain(input);

      expect(result.executionTime).toBe(12.5);
      expect(result.planningTime).toBe(0.8);
    });

    it("parses Query Text", () => {
      const input = JSON.stringify([
        {
          Plan: minimalPlan,
          "Query Text": "SELECT * FROM users;",
        },
      ]);
      const result = parseJsonExplain(input);
      expect(result.query).toBe("SELECT * FROM users;");
    });

    it("parses Triggers array", () => {
      const input = JSON.stringify([
        {
          Plan: minimalPlan,
          Triggers: [
            { "Trigger Name": "tr_foo", Time: 0.5, Calls: 10 },
            { "Trigger Name": "tr_bar", Time: 0.2, Calls: 3 },
          ],
        },
      ]);
      const result = parseJsonExplain(input);

      expect(result.triggers).toHaveLength(2);
      expect(result.triggers?.[0]).toEqual({
        name: "tr_foo",
        time: 0.5,
        calls: 10,
      });
      expect(result.triggers?.[1]).toEqual({
        name: "tr_bar",
        time: 0.2,
        calls: 3,
      });
    });

    it("parses JIT section", () => {
      const input = JSON.stringify([
        {
          Plan: minimalPlan,
          JIT: {
            Functions: 3,
            Options: {
              Inlining: true,
              Optimization: true,
              Expressions: false,
              Deforming: true,
            },
            Timing: {
              Generation: 0.1,
              Inlining: 0.2,
              Optimization: 0.3,
              Emission: 0.4,
              Total: 1.0,
            },
          },
        },
      ]);
      const result = parseJsonExplain(input);

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

    it("returns undefined triggers when Triggers is absent", () => {
      const input = JSON.stringify([{ Plan: minimalPlan }]);
      const result = parseJsonExplain(input);
      expect(result.triggers).toBeUndefined();
    });

    it("returns undefined jit when JIT is absent", () => {
      const input = JSON.stringify([{ Plan: minimalPlan }]);
      const result = parseJsonExplain(input);
      expect(result.jit).toBeUndefined();
    });
  });

  describe("buffers", () => {
    it("parses shared and local buffer stats", () => {
      const plan = {
        ...minimalPlan,
        "Shared Hit Blocks": 100,
        "Shared Read Blocks": 10,
        "Local Hit Blocks": 5,
        "Temp Read Blocks": 1,
      };
      const input = JSON.stringify([{ Plan: plan }]);
      const result = parseJsonExplain(input);

      expect(result.plan.buffers).toEqual({
        sharedHit: 100,
        sharedRead: 10,
        localHit: 5,
        tempRead: 1,
      });
    });

    it("returns undefined buffers when no buffer fields present", () => {
      const input = JSON.stringify([{ Plan: minimalPlan }]);
      const result = parseJsonExplain(input);
      expect(result.plan.buffers).toBeUndefined();
    });
  });

  describe("rawText and maxTotalTime", () => {
    it("preserves raw input in rawText", () => {
      const input = JSON.stringify([{ Plan: minimalPlan }]);
      const result = parseJsonExplain(input);
      expect(result.rawText).toBe(input);
    });

    it("sets maxTotalTime to 0 (post-processing fills it)", () => {
      const input = JSON.stringify([{ Plan: minimalPlan }]);
      const result = parseJsonExplain(input);
      expect(result.maxTotalTime).toBe(0);
    });
  });
});
