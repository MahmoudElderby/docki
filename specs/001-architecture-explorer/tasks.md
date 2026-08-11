# Tasks: Architecture Explorer IDE Extension

**Input**: Design documents from `/specs/001-architecture-explorer/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md, analysis.md

**Tests**: Included — spec clarification #18 and Constitution Principle IV require unit tests per service boundary plus ≥1 tree→Webview integration test; every US1–6 acceptance scenario backed by ≥1 automated test.

**Organization**: Tasks grouped by user story for independent implementation and testing.

**Extension root**: `Tools/ArchitectureExplorer/` (standalone npm package per plan.md)

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies on incomplete tasks)
- **[Story]**: User story label (US1–US6) — only on user-story phase tasks
- Every task includes an exact file path

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Extension scaffold, build tooling, and IDE launch configuration

- [X] T001 Create `Tools/ArchitectureExplorer/` directory scaffold (`src/`, `src/services/`, `src/webview/`, `src/utils/`, `media/`, `test/unit/`, `test/integration/`, `test/fixtures/`) per plan.md
- [X] T002 Initialize `Tools/ArchitectureExplorer/package.json` with `engines.vscode ^1.85.0`, dependencies (`markdown-it`, `markdown-it-anchor`, `mermaid`, `fuse.js`, `@types/vscode`), devDependencies (`esbuild`, `@vscode/vsce`, `@vscode/test-electron`, `mocha`, `@types/mocha`, `typescript`), and scripts (`compile`, `watch`, `test`, `test:integration`, `package`)
- [X] T003 [P] Create `Tools/ArchitectureExplorer/tsconfig.json` targeting ES2022 with `outDir` excluded (esbuild bundles)
- [X] T004 [P] Create `Tools/ArchitectureExplorer/esbuild.config.mjs` producing `dist/extension.js` (CJS, external `vscode`) and `dist/webview/panel.js` (IIFE, includes mermaid)
- [X] T005 [P] Create `Tools/ArchitectureExplorer/.vscodeignore` excluding `src/`, `test/`, `node_modules/`, config files from `.vsix`
- [X] T006 [P] Create `Tools/ArchitectureExplorer/.vscode/launch.json` Extension Development Host config (F5) opening MTN repo workspace
- [X] T007 [P] Create `Tools/ArchitectureExplorer/.vscode/tasks.json` compile watch task wired to `npm run watch`
- [X] T008 [P] Add Activity Bar icon at `Tools/ArchitectureExplorer/media/architecture.svg`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Shared constants, utilities, workspace detection, manifest contributes, and test harness — MUST complete before any user story

**⚠️ CRITICAL**: No user story work until this phase is complete

- [X] T009 Create shared constants in `Tools/ArchitectureExplorer/src/constants.ts` (`SEARCH_DEBOUNCE_MS`, `WATCHER_COALESCE_MS`, `MAX_FILE_BYTES`, `SNIPPET_RADIUS`, `KNOWLEDGE_DIR`, `PINNED_FILES`, `OUTPUT_CHANNEL_NAME`, evidence path regex)
- [X] T010 [P] Create Output channel helper in `Tools/ArchitectureExplorer/src/output.ts` (`Architecture Explorer` channel, info/warn/error methods)
- [X] T011 [P] Create path utilities in `Tools/ArchitectureExplorer/src/utils/paths.ts` (workspace-relative resolution, symlink guard rejecting out-of-root targets per FR-023)
- [X] T012 [P] Create label prettifier in `Tools/ArchitectureExplorer/src/utils/labels.ts` (kebab/snake → Title Case for tree labels)
- [X] T013 [P] Create snippet builder in `Tools/ArchitectureExplorer/src/utils/snippets.ts` (~160 char window centered on match with highlight markers)
- [X] T014 [P] Create freshness parser in `Tools/ArchitectureExplorer/src/utils/freshnessParser.ts` (table row and plain line `Last analyzed commit` patterns)
- [X] T015 Implement `KnowledgeWorkspaceService` in `Tools/ArchitectureExplorer/src/services/KnowledgeWorkspaceService.ts` (first folder with `/knowledge`, else first folder; missing/empty/populated; log chosen root to Output channel)
- [X] T016 [P] Unit test workspace detection in `Tools/ArchitectureExplorer/test/unit/knowledgeWorkspace.test.ts` (missing, empty, populated, symlink inside/outside root, multi-root selection)
- [X] T017 [P] Unit test freshness parser in `Tools/ArchitectureExplorer/test/unit/freshnessParser.test.ts` (table row, plain line, malformed, missing metadata)
- [X] T018 [P] Unit test snippet builder in `Tools/ArchitectureExplorer/test/unit/snippets.test.ts` (~160 char centered snippets with highlights)
- [X] T019 [P] Create baseline fixture tree at `Tools/ArchitectureExplorer/test/fixtures/sample-knowledge/` (categories, `README.md` with Last analyzed commit, `AI_CONTEXT.md`, sample domain docs)
- [X] T020 Configure Mocha unit test runner in `Tools/ArchitectureExplorer/package.json` (`npm test` runs `test/unit/**/*.test.ts` via Node)
- [X] T021 Configure `@vscode/test-electron` harness in `Tools/ArchitectureExplorer/test/integration/runTest.ts` and `test/integration/extension.test.ts` skeleton
- [X] T022 Wire `package.json` contributes per `specs/001-architecture-explorer/contracts/extension-contributes.md` (activationEvents, commands, viewsContainers, views, main entry)
- [X] T023 Create `Tools/ArchitectureExplorer/src/extension.ts` activate/deactivate skeleton registering subscriptions, Output channel, and `KnowledgeWorkspaceService`

**Checkpoint**: Foundation ready — user story implementation can begin

---

## Phase 3: User Story 1 — Browse and Read (Priority: P1) 🎯 MVP

**Goal**: Hierarchical knowledge tree in Activity Bar sidebar; click document opens rich rendered Webview with Markdown + Mermaid; raw editor remains independent

**Independent Test**: Open Architecture Explorer on repo with `/knowledge`; expand categories; open document per category; rendered view shows headings/lists/tables/code; Mermaid renders as diagram; raw `.md` opens in normal editor

### Tests for User Story 1

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [X] T024 [P] [US1] Unit test tree sort order and pinned files in `Tools/ArchitectureExplorer/test/unit/treeSort.test.ts` (subfolders first, case-insensitive, README.md/AI_CONTEXT.md pinned)
- [X] T025 [P] [US1] Add Mermaid fixture at `Tools/ArchitectureExplorer/test/fixtures/sample-knowledge/diagrams/overview.md` with valid and invalid ```mermaid blocks
- [X] T026 [P] [US1] Integration test tree activation and Webview render in `Tools/ArchitectureExplorer/test/integration/extension.test.ts` (assert tree contains `domains`; activate doc; Webview `render` message HTML contains expected heading)

### Implementation for User Story 1

- [X] T027 [US1] Implement `KnowledgeTreeProvider` in `Tools/ArchitectureExplorer/src/services/KnowledgeTreeProvider.ts` (`TreeDataProvider`, friendly labels, hierarchy preservation, Markdown-only leaves)
- [X] T028 [US1] Implement `MarkdownDocumentService` in `Tools/ArchitectureExplorer/src/services/MarkdownDocumentService.ts` (read file with 5 MB head window, host-side `markdown-it` parse with `html: false`, `linkify: false`, heading slug extraction)
- [X] T029 [US1] Create Webview CSP shell in `Tools/ArchitectureExplorer/src/webview/panel.html` (nonce script-src, no remote connect-src, `img-src` restricted to `${cspSource}` only per contracts/webview-messages.md)
- [X] T030 [US1] Create theme-aware styles in `Tools/ArchitectureExplorer/src/webview/panel.css` (VS Code CSS variable mapping for light/dark/highContrast)
- [X] T031 [US1] Create Webview client script in `Tools/ArchitectureExplorer/src/webview/panel.ts` (`ready`/`openEvidence`/`openRaw`/`log` handlers; Mermaid `securityLevel: 'strict'` render with error fallback showing escaped source)
- [X] T032 [US1] Create `DocumentationPanel` lifecycle manager in `Tools/ArchitectureExplorer/src/webview/DocumentationPanel.ts` (WebviewPanel create/reveal, postMessage `render`/`documentMissing`/`error`, preserve focus, no CustomTextEditor registration)
- [X] T033 [US1] Wire tree view registration and document activation in `Tools/ArchitectureExplorer/src/extension.ts` (`architectureExplorer.knowledgeTree`, tree click → `MarkdownDocumentService.open`)
- [X] T034 [US1] Wire commands `architectureExplorer.open`, `architectureExplorer.openAiContext`, `architectureExplorer.openReadme`, `architectureExplorer.openRaw` in `Tools/ArchitectureExplorer/src/extension.ts`

**Checkpoint**: User Story 1 fully functional — browse tree and read rendered docs including Mermaid

---

## Phase 4: User Story 2 — Search Knowledge Base (Priority: P2)

**Goal**: Command-palette search across filenames, headings, and body with fuzzy/substring matching, grouped snippets, and scroll-to-match on activation

**Independent Test**: Search term appearing in ≥3 category documents returns all with category labels and snippets; filename-only match works; no-match shows empty state; result click opens rendered view at match location

### Tests for User Story 2

- [X] T035 [P] [US2] Unit test search index in `Tools/ArchitectureExplorer/test/unit/searchIndex.test.ts` (fuzzy filename/heading, body substring, case insensitivity, 5 MB truncation, empty query, ≥3-file fixture match, body-match `lineHint`)

### Implementation for User Story 2

- [X] T036 [US2] Implement `SearchIndexService` in `Tools/ArchitectureExplorer/src/services/SearchIndexService.ts` (Fuse.js filename/heading index, body substring scan, `ready` flag, `rebuild`/`upsert`/`remove`, `onDidChangeIndex`)
- [X] T037 [US2] Create search UI in `Tools/ArchitectureExplorer/src/webview/SearchQuickPick.ts` (QuickPick with 200 ms debounce, non-blocking "indexing…" state while `!ready`, grouped results with snippets from `snippets.ts`)
- [X] T038 [US2] Wire background index build on activate in `Tools/ArchitectureExplorer/src/extension.ts` (async `rebuild` from discovered documents; log timing to Output channel)
- [X] T039 [US2] Wire `architectureExplorer.search` command in `Tools/ArchitectureExplorer/src/extension.ts` delegating to `SearchQuickPick`
- [X] T040 [US2] Wire search result activation in `Tools/ArchitectureExplorer/src/webview/SearchQuickPick.ts` → `MarkdownDocumentService.open` with `scrollAnchor` (heading/filename) or `lineHint` (body) per contracts/webview-messages.md

**Checkpoint**: User Stories 1 AND 2 work independently — browse + full-text search

---

## Phase 5: User Story 3 — Evidence Links to Source (Priority: P3)

**Goal**: Backticked paths and Markdown link URLs in rendered docs become clickable evidence links opening source files with optional line/range selection

**Independent Test**: Document with plain path, `#L` line, `#L-L` range, missing file, and `..` traversal — correct open/warn/reject behavior; plain prose not linkified

### Tests for User Story 3

- [X] T041 [P] [US3] Create evidence fixture at `Tools/ArchitectureExplorer/test/fixtures/evidence-samples.md` (existing path, line range, missing file, `../../outside.txt`, prose without backticks)
- [X] T042 [P] [US3] Unit test evidence resolver in `Tools/ArchitectureExplorer/test/unit/evidenceLinkResolver.test.ts` (classify/resolves/missing/rejected, extension whitelist, enrichHtml injection on `<code>` and `<a>` only)

### Implementation for User Story 3

- [X] T043 [US3] Implement `EvidenceLinkResolver` in `Tools/ArchitectureExplorer/src/services/EvidenceLinkResolver.ts` (`classify`, `resolveAndOpen`, `enrichHtml`, symlink guard via `paths.ts`)
- [X] T044 [US3] Integrate `enrichHtml` post-processing in `Tools/ArchitectureExplorer/src/services/MarkdownDocumentService.ts` after markdown-it render
- [X] T045 [US3] Handle `openEvidence` Webview message in `Tools/ArchitectureExplorer/src/webview/DocumentationPanel.ts` delegating to `EvidenceLinkResolver.resolveAndOpen` with user-safe notifications

**Checkpoint**: Evidence navigation works from rendered docs — US1+US2+US3 independently testable

---

## Phase 6: User Story 4 — Knowledge Freshness (Priority: P4)

**Goal**: Tree view title shows freshness badge (up-to-date / may-be-stale / unknown) derived from `knowledge/README.md` metadata vs Git HEAD

**Independent Test**: Repositories with matching HEAD, stale HEAD, missing metadata, and no Git all show correct badge without errors

### Tests for User Story 4

- [X] T046 [P] [US4] Unit test freshness evaluation in `Tools/ArchitectureExplorer/test/unit/gitFreshness.test.ts` (matching HEAD → up-to-date, stale → potentially-stale with SHAs and optional distance, missing metadata → unknown, git unavailable → unknown)

### Implementation for User Story 4

- [X] T047 [US4] Implement `GitFreshnessService` in `Tools/ArchitectureExplorer/src/services/GitFreshnessService.ts` (README parse via `freshnessParser.ts`, HEAD via `vscode.git` API with `child_process` fallback, `git rev-list --count` distance, read-only, `onDidChangeFreshness`)
- [X] T048 [US4] Wire freshness badge to `TreeView.title` in `Tools/ArchitectureExplorer/src/extension.ts` (`{freshnessBadge} ({workspaceRootLabel})` per extension-contributes.md)
- [X] T049 [US4] Wire freshness re-evaluation triggers in `Tools/ArchitectureExplorer/src/extension.ts` (activate, manual refresh, README change, Git HEAD change listener when available)

**Checkpoint**: Freshness indicator live — extension shows doc currency at a glance

---

## Phase 7: User Story 5 — Live Sync on Changes (Priority: P4)

**Goal**: File watcher with 300 ms coalesce keeps tree, search index, and open rendered views in sync; manual refresh command; deleted-doc state in Webview

**Independent Test**: Add/rename/delete `.md` under `/knowledge` — tree and search update within 3 s; open doc shows "document no longer exists" on delete; manual refresh completes cleanly

### Tests for User Story 5

- [X] T050 [P] [US5] Unit test watcher coalesce in `Tools/ArchitectureExplorer/test/unit/fileWatcher.test.ts` (burst events → single `onDidChangeKnowledge` within 300 ms window)
- [X] T051 [P] [US5] Unit test index upsert/remove and rename detection in `Tools/ArchitectureExplorer/test/unit/searchIndex.test.ts` (old `documentId` removed, new added on rename)
- [X] T052 [P] [US5] Integration or temp-directory test for watcher-driven rename in `Tools/ArchitectureExplorer/test/integration/watcher.test.ts` (rename `.md` file; tree reflects new name within 3 s)

### Implementation for User Story 5

- [X] T053 [US5] Implement `KnowledgeFileWatcher` in `Tools/ArchitectureExplorer/src/services/KnowledgeFileWatcher.ts` (`createFileSystemWatcher` scoped to `**/knowledge/**/*.md`, 300 ms trailing coalesce, `reset` on workspace change)
- [X] T054 [US5] Wire `onDidChangeKnowledge` event pipeline in `Tools/ArchitectureExplorer/src/extension.ts` (→ `SearchIndexService` upsert/remove, → `KnowledgeTreeProvider.refresh`, → `MarkdownDocumentService.refreshUri`, → `GitFreshnessService.evaluate` when README changed)
- [X] T055 [US5] Wire `architectureExplorer.refresh` command in `Tools/ArchitectureExplorer/src/extension.ts` (force filesystem rescan, index rebuild, freshness re-check)
- [X] T056 [US5] Implement live re-render rules in `Tools/ArchitectureExplorer/src/services/MarkdownDocumentService.ts` (external disk change → immediate re-render; raw editor save → re-render on save; `handleDeleted` → post `documentMissing` message)

**Checkpoint**: Live sync and manual refresh complete — tree/search/view stay current

---

## Phase 8: User Story 6 — Empty State (Priority: P5)

**Goal**: Actionable empty state when `/knowledge` is missing or has no Markdown files; seamless transition when files appear

**Independent Test**: Workspace without `/knowledge` shows helpful message naming expected path (no folder created); `/knowledge` with only non-Markdown files shows equivalent empty state; adding `.md` transitions to populated tree without restart

### Tests for User Story 6

- [X] T057 [P] [US6] Extend workspace empty-state tests in `Tools/ArchitectureExplorer/test/unit/knowledgeWorkspace.test.ts` (missing folder, folder with only `image.png`, transition to populated on scan)

### Implementation for User Story 6

- [X] T058 [US6] Implement `EmptyStateNode` and empty-state tree items in `Tools/ArchitectureExplorer/src/services/KnowledgeTreeProvider.ts` (actionable message naming `/knowledge` path and architecture-knowledge workflow; `contextValue: emptyState`)
- [X] T059 [US6] Wire empty-state header with `workspaceRootLabel` in `Tools/ArchitectureExplorer/src/extension.ts` (display chosen root in view header and empty state; log to Output channel)
- [X] T060 [US6] Wire empty-to-populated transition in `Tools/ArchitectureExplorer/src/extension.ts` (`KnowledgeWorkspaceService.onDidChangeWorkspace` and watcher events trigger tree refresh from empty to populated)

**Checkpoint**: All six user stories independently functional

---

## Phase 9: Polish & Cross-Cutting Concerns

**Purpose**: Performance validation, security hardening, packaging, and quickstart verification

- [X] T061 [P] Create performance fixture generator at `Tools/ArchitectureExplorer/scripts/generate-large-knowledge-fixture.mjs` (300+ synthetic `.md` files for SC-002/SC-010 scale testing)
- [X] T062 [P] Add search performance smoke test in `Tools/ArchitectureExplorer/test/unit/searchIndexPerformance.test.ts` (query on 300+ fixture files completes ≤ 1 s p95)
- [X] T063 [P] Add CSP policy unit test in `Tools/ArchitectureExplorer/test/unit/cspPolicy.test.ts` (assert `panel.html` CSP excludes `https:`, `data:`, and remote `connect-src`; SC-007 compliance)
- [X] T064 Run full test suite per `specs/001-architecture-explorer/quickstart.md` (`npm test` + `npm run test:integration` in `Tools/ArchitectureExplorer/`) and fix failures
- [X] T065 Add `npm run package` producing `architecture-explorer-*.vsix` via `@vscode/vsce` in `Tools/ArchitectureExplorer/package.json`
- [X] T066 Validate SC-007 zero-network policy — document network-isolation verification steps in `Tools/ArchitectureExplorer/README.md` (no telemetry endpoints in `package.json`; CSP blocks remote fetch)
- [X] T067 Add FR-035 keyboard operability smoke checklist to `Tools/ArchitectureExplorer/README.md` (tree navigation, search, evidence link activation via keyboard)
- [X] T068 Add SC-010 idle CPU observation steps to `Tools/ArchitectureExplorer/README.md` (500-file fixture idle session; no sustained CPU spike)
- [X] T069 Create `Tools/ArchitectureExplorer/README.md` with build, F5 dev host, `.vsix` install, and troubleshooting aligned to quickstart.md

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately
- **Foundational (Phase 2)**: Depends on Phase 1 — **BLOCKS all user stories**
- **User Stories (Phases 3–8)**: All depend on Phase 2 completion
  - Recommended sequential order: US1 → US2 → US3 → US4 → US5 → US6 (each builds on shared services)
  - US4 and US6 can start after Phase 2 in parallel with US1 if staffed (minimal coupling)
- **Polish (Phase 9)**: Depends on all desired user stories being complete

### User Story Dependencies

| Story | Priority | Depends on | Notes |
|-------|----------|------------|-------|
| US1 | P1 | Phase 2 | MVP — tree + rendered viewer |
| US2 | P2 | Phase 2, US1 (`MarkdownDocumentService.open` for result activation) | Search UI independent; activation needs US1 panel |
| US3 | P3 | US1 (`MarkdownDocumentService` HTML pipeline) | Evidence enrichment plugs into render path |
| US4 | P4 | Phase 2 | Independent freshness service; wires to tree title |
| US5 | P4 | US1, US2, US4 (refresh targets tree, index, panel, freshness) | Watcher orchestrates existing services |
| US6 | P5 | Phase 2, US1 (`KnowledgeTreeProvider`) | Empty state extends tree provider |

### Within Each User Story

- Tests MUST be written and FAIL before implementation
- Services before UI wiring
- Webview shell before client script
- Story complete before dependent story (except US4/US6 partial parallelism)

### Parallel Opportunities

- Phase 1: T003–T008 all parallel after T001–T002
- Phase 2: T010–T019 parallel after T009; T016–T018 parallel
- US1: T024–T026 parallel; T029–T030 parallel after T028
- US2: T035 parallel with US1 late tasks if files don't conflict
- US3: T041–T042 parallel
- US4: T046 parallel with US3 implementation
- US5: T050–T052 parallel
- US6: T057 parallel with US5 late tasks
- Phase 9: T061–T063 parallel

---

## Parallel Example: User Story 1

```bash
# Launch all US1 tests together:
T024: "Unit test tree sort in Tools/ArchitectureExplorer/test/unit/treeSort.test.ts"
T025: "Mermaid fixture in Tools/ArchitectureExplorer/test/fixtures/sample-knowledge/diagrams/overview.md"
T026: "Integration test in Tools/ArchitectureExplorer/test/integration/extension.test.ts"

# Launch Webview assets in parallel after T028:
T029: "panel.html CSP shell"
T030: "panel.css theme styles"
```

---

## Parallel Example: User Story 5

```bash
# Launch all US5 tests together:
T050: "Watcher coalesce test in test/unit/fileWatcher.test.ts"
T051: "Rename detection in test/unit/searchIndex.test.ts"
T052: "Integration rename test in test/integration/watcher.test.ts"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (T001–T008)
2. Complete Phase 2: Foundational (T009–T023)
3. Complete Phase 3: User Story 1 (T024–T034)
4. **STOP and VALIDATE**: F5 Extension Development Host — browse `/knowledge`, open rendered doc, verify Mermaid
5. Package demo `.vsix` if ready (T065)

### Incremental Delivery

1. Setup + Foundational → foundation ready
2. US1 → browse/read MVP
3. US2 → add search discoverability
4. US3 → add evidence-to-source navigation
5. US4 → add freshness trust signal
6. US5 → add live sync
7. US6 → add empty-repo first-run experience
8. Polish → performance, CSP, packaging

### Parallel Team Strategy

With multiple developers after Phase 2:

- Developer A: US1 (tree + Webview) — critical path
- Developer B: US2 (search index) — starts after T028 stub exists
- Developer C: US4 (freshness) — fully independent after Phase 2
- Merge US3/US5/US6 sequentially as US1 stabilizes

---

## Notes

- All behavioral constants live in `src/constants.ts` — no V1 configuration settings (extension-contributes.md)
- Do NOT register as default `.md` editor — Webview panel only (FR-006)
- Do NOT modify `/knowledge` content or `.cursor/skills/architecture-*` generators (FR-042, Constitution II)
- Non-Markdown files under `/knowledge` hidden from tree and search index
- Commit after each task or logical group; stop at any checkpoint to validate story independently
