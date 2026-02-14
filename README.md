# PG Explain Visualizer

Visualize PostgreSQL `EXPLAIN ANALYZE` output directly inside VS Code -- no need to leave your editor or paste into external tools.

<!-- TODO: Add a screenshot here -->
<!-- ![PG Explain Visualizer Screenshot](images/screenshot.png) -->

## Features

- **Interactive Plan Tree** -- See every node in a hierarchical tree with timing bars that show where your query spends its time
- **Exclusive vs Total Time** -- Instantly identify the slowest nodes with proportional timing bars
- **Row Estimation Accuracy** -- Spot planner misestimates that could indicate missing statistics or need for `ANALYZE`
- **Statistics Breakdown** -- Per-table, per-node-type, and per-index stats with percentage bars and drill-down
- **Parallel Query Support** -- Correctly handles `Gather` / `Gather Merge` nodes and adjusts times for parallel workers
- **Dual Format Support** -- Works with both TEXT and JSON output from `EXPLAIN`
- **Theme Aware** -- Automatically adapts to your VS Code light or dark theme
- **Buffer Analysis** -- Toggle buffer stats to see shared hits, reads, and writes per node

## Usage

### From selected text

1. Run your query with `EXPLAIN (ANALYZE, BUFFERS)` in any PostgreSQL client
2. Copy the output into any editor tab in VS Code
3. Select the text
4. Right-click and choose **PG Explain: Visualize Selection**

   Or use the Command Palette (`Ctrl+Shift+P` / `Cmd+Shift+P`) and search for **PG Explain: Visualize Selection**

### From a file

1. Save your EXPLAIN output to a `.explain` file
2. Open it in VS Code
3. Open the Command Palette and run **PG Explain: Visualize File**

## Display Toggles

In the Plan tab, use the settings bar to toggle:

| Toggle | Description |
|--------|-------------|
| **time** | Show/hide timing bars (exclusive and total) |
| **rows estimation** | Show/hide actual vs estimated row counts |
| **cost** | Show/hide planner cost estimates |
| **buffers** | Show/hide buffer usage in expanded node details |

## Tabs

| Tab | Description |
|-----|-------------|
| **Plan** | Interactive tree view of the query plan |
| **Stats** | Aggregated stats per table, node type, and index |
| **Query** | Query text (available with JSON format input) |
| **Raw** | Original EXPLAIN output as plain text |

## Supported Formats

### TEXT format (default)

```sql
EXPLAIN (ANALYZE, BUFFERS) SELECT * FROM users WHERE id = 1;
```

### JSON format

```sql
EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON) SELECT * FROM users WHERE id = 1;
```

Both formats are auto-detected -- just paste or open the output and the extension handles the rest.

## Tips

- Use `EXPLAIN (ANALYZE, BUFFERS)` instead of plain `EXPLAIN` to get actual execution times and buffer stats
- Click on any node row to expand its details (filter conditions, index conditions, buffer breakdown, etc.)
- In the Stats tab, click any row to expand and see individual node contributions
- The extension correctly accounts for parallel workers -- times shown under `Gather` nodes reflect wall-clock time, not accumulated CPU time

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for development setup and build instructions.

## License

MIT
