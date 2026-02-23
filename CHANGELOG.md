# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

## [0.2.0] - 2025-02-24

### Added

- **Plan tree filter** — Filter nodes by node type, relation, alias, index, or schema. Matching rows are highlighted; non-matching rows are dimmed.
- Integration tests for `parseExplain` (format detection, JSON fallback, post-processing).
- JSON parser tests; validation for missing or invalid root/Plan with clear error messages.

### Fixed

- Webview message handler is registered once per panel (no duplicate handlers when re-running the visualize command).
- Invalid EXPLAIN JSON (e.g. empty array or missing Plan) now throws a clear error instead of a low-level type error.

### Changed

- Parser and extension use arrow functions; Prettier added with format/format:check scripts.
- Shared `formatDuration` helper for webview; duration formatting tests.
