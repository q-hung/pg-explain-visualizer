# Release v0.2.0

**Plan tree filter, clearer errors, and reliability improvements.**

- **Filter** — In the Plan tab, filter nodes by node type, relation, alias, index, or schema. Matching rows are highlighted; others are dimmed.
- **Better errors** — Invalid EXPLAIN JSON (e.g. empty array or missing Plan) now shows a clear message instead of a cryptic type error.
- **Webview fix** — The visualize command no longer stacks duplicate message handlers when run multiple times.
- **Tests** — Added integration tests for the parser entry point and JSON parser validation.

See [CHANGELOG.md](CHANGELOG.md) for the full list of changes.
