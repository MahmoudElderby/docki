# Quickstart: Architecture Explorer IDE Extension

**Feature**: `001-architecture-explorer`  
**Purpose**: Build, install, and validate the extension end-to-end against this monorepo's `/knowledge` tree or test fixtures.

See also: [data-model.md](./data-model.md), [contracts/](./contracts/).

---

## Prerequisites

- Node.js 18+
- npm 9+
- VS Code ≥ 1.85 **or** Cursor (compatible VS Code build)
- Git (optional — freshness shows `unknown` without it)
- This repository opened as workspace root (`c:\MTN` or clone path)

---

## Setup

```powershell
cd Tools/ArchitectureExplorer
npm install
npm run compile
```

### Extension Development Host (F5)

1. Open `Tools/ArchitectureExplorer/` in VS Code/Cursor.
2. Run **Run Extension** launch config (or F5).
3. Extension Development Host opens — open the MTN repo folder as workspace.

### Package `.vsix`

```powershell
npm run package
# produces architecture-explorer-<version>.vsix
```

Install locally:

```powershell
code --install-extension architecture-explorer-*.vsix
# or: cursor --install-extension architecture-explorer-*.vsix
```

---

## Smoke test (manual)

| Step | Action | Expected |
|------|--------|----------|
| 1 | Open Activity Bar → **Architecture** | Tree view appears; header shows workspace root label |
| 2 | Expand **Domains** (or equivalent category) | Subfolders before files; friendly labels |
| 3 | Click a document (e.g. Payments) | Webview panel opens with rendered Markdown |
| 4 | Command palette → **Architecture Explorer: Search** → type `RabbitMQ` | Results from multiple categories with snippets |
| 5 | In rendered doc, click an evidence path (if present) | Source file opens in editor |
| 6 | Check tree title / freshness | Shows up-to-date, stale, or unknown — no error |

---

## Automated tests

```powershell
cd Tools/ArchitectureExplorer
npm test              # unit tests (Mocha, Node)
npm run test:integration   # @vscode/test-electron
```

---

## Validation scenarios (maps to User Stories)

Each scenario MUST have ≥ 1 automated test (see `test/` layout in [plan.md](./plan.md)).

### US1 — Browse and read (P1)

**Fixture**: repo `/knowledge` or `test/fixtures/sample-knowledge/`

1. Activate extension; assert tree contains `domains` category.
2. Activate `domains/payment.md` tree item.
3. Assert Webview `render` message HTML contains `<h1` or document title.
4. Open fixture with valid ` ```mermaid ` block → diagram SVG/canvas present in Webview DOM.
5. Command **Open Raw** → text editor tab opens for same URI without closing Webview.

### US2 — Search (P2)

1. Index fixture with ≥ 3 files mentioning `RabbitMQ`.
2. `SearchIndexService.search('RabbitMQ')` returns ≥ 3 results with `categoryLabel`.
3. Filename-only match: query basename → document returned.
4. Query `xyzzy-no-match-12345` → empty array, no throw.
5. Activate result → `MarkdownDocumentService.open` called with `scrollAnchor` (heading/filename match) or `lineHint` (body match).

### US3 — Evidence links (P3)

**Fixture paths** in `test/fixtures/evidence-samples.md`:

| Token | Expected |
|-------|----------|
| `StoreCloud.Payment/.../PaymentService.cs` (existing) | opens file |
| same with `#L10-L20` | selection range |
| `nonexistent/path/File.cs` | warning notification, no editor tab |
| `../../outside.txt` | rejected, not linkified in HTML |
| prose mention without backticks | not linkified |

### US4 — Freshness (P4)

| Setup | Expected `state` |
|-------|------------------|
| README commit == mocked HEAD | `up-to-date` |
| README commit != HEAD | `potentially-stale` + both SHAs |
| No metadata line | `unknown` |
| Git unavailable | `unknown`, extension still loads tree |

Parser unit tests use snippets from real `knowledge/README.md` table format.

### US5 — Live sync (P4)

1. With EDH open, copy new `.md` into `/knowledge/domains/`.
2. Within 3 s, tree shows new node; search finds content.
3. Delete open document → Webview shows `documentMissing`.
4. **Architecture Explorer: Refresh** → index count matches filesystem.

Automated: unit-test `SearchIndexService.upsert/remove`, tree provider refresh, and rename detection (old `documentId` removed, new added); at least one integration or temp-directory test MUST cover watcher-driven rename (US5 scenario 2).

### US6 — Empty state (P5)

1. Open workspace with no `/knowledge` → single empty-state tree item; message names expected path; no folder created.
2. Workspace with `/knowledge` containing only `image.png` → empty state.
3. Add `overview.md` → transitions to populated without restart.

---

## Network isolation check (SC-007)

1. Disable network on OS or use firewall.
2. Use Extension Development Host for 1 hour browse/search session.
3. Confirm zero outbound connections from extension host (Process Explorer / OS tools).

No telemetry endpoints are configured in `package.json`.

---

## Performance spot checks

| Criterion | Command / method | Target |
|-----------|------------------|--------|
| SC-002 search latency | time `search()` on full MTN `/knowledge` (~39 files; extrapolate 300-file fixture) | ≤ 1 s p95 |
| SC-003 watcher delay | add file, measure tree update | ≤ 3 s |
| SC-010 idle CPU | Activity Monitor during idle with 500-file fixture | no sustained spike |

For scale testing, generate `test/fixtures/large-knowledge/` script (tasks phase) with 300+ synthetic `.md` files.

---

## Troubleshooting

| Symptom | Check |
|---------|-------|
| Empty tree but `/knowledge` exists | Output channel — wrong workspace root in multi-root? |
| Freshness always unknown | Git extension disabled? README table format changed? |
| Mermaid blank | Webview devtools (Help → Toggle Developer Tools) for CSP errors |
| Search stuck on "indexing…" | Output channel for index build error |

All diagnostics MUST appear only in **Architecture Explorer** Output channel (FR-036).
