# Release v0.2.1

**Fix for webview not resetting when visualizing a different EXPLAIN.**

- **Webview reset** — Opening a new EXPLAIN (or re-running "Visualize") now always shows the new plan. The panel no longer displays the previous plan or a mix of old and new data.
- **Tests** — Parser independence tests ensure consecutive parses with different input return independent results.

See [CHANGELOG.md](CHANGELOG.md) for details.
