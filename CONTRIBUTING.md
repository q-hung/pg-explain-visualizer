# PG Explain Visualizer

A VS Code / Cursor extension that visualizes PostgreSQL `EXPLAIN (ANALYZE)` output with an interactive plan tree, timing bars, and statistics tables.

## Features

- **Plan Tree View** -- Hierarchical visualization of query plan nodes with tree connectors, timing bars showing exclusive vs. total time, row counts, and cost estimates
- **Statistics** -- Per-table, per-node-type, and per-index stats with collapsible rows and percentage bars
- **Raw Output** -- View the original EXPLAIN text
- **Query View** -- Display extracted query text (when available from JSON format)
- **Theme Support** -- Automatically adapts to VS Code light/dark themes
- **Dual Format** -- Supports both TEXT and JSON EXPLAIN output formats

## Usage

### From selected text

1. Run `EXPLAIN (ANALYZE, BUFFERS)` in your PostgreSQL client
2. Copy the output
3. Paste it into any editor in VS Code
4. Select the text
5. Right-click and choose **PG Explain: Visualize Selection**, or open Command Palette (`Cmd+Shift+P`) and run the command

### From a `.explain` file

1. Save your EXPLAIN output to a file with the `.explain` extension
2. Open it in VS Code
3. Run **PG Explain: Visualize File** from the Command Palette

## Display Settings

Toggle these in the Plan tab:
- **time** -- Show/hide timing bars
- **rows estimation** -- Show/hide actual vs. estimated row counts
- **cost** -- Show/hide planner cost estimates
- **buffers** -- Show/hide buffer usage details in expanded nodes

## Development

```bash
# Install dependencies
npm install

# Build
npm run build

# Watch mode
npm run watch
```

Press `F5` in VS Code to launch the Extension Development Host for testing.

## Supported Formats

### TEXT format
```
EXPLAIN (ANALYZE, BUFFERS) SELECT ...;
```

### JSON format
```
EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON) SELECT ...;
```
