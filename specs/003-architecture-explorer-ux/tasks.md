# Tasks: Architecture Explorer UX + Mermaid Reliability (V2)

**Input**: Design documents from `/specs/003-architecture-explorer-ux/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md

**Tests**: Included — FR-032 and SC-008 require automated regression tests plus quickstart manual checks for visual/IDE scenarios.

**Organization**: Tasks grouped by user story for independent implementation and validation.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies on incomplete tasks)
- **[Story]**: User story label (US1–US5)
- Every task includes an exact file path

## Path Conventions

- Extension root: `Tools/ArchitectureExplorer/`
- Host source: `Tools/ArchitectureExplorer/src/`
- Webview source: `Tools/ArchitectureExplorer/src/webview/`
- Unit tests: `Tools/ArchitectureExplorer/test/unit/`
- Feature docs: `specs/003-architecture-explorer-ux/`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Version bump, shared constants, and V2 test scaffolds before story work.

- [X] T001 Bump extension version to `0.2.0` in `Tools/ArchitectureExplorer/package.json`
- [X] T002 [P] Add `COMMAND_RELOAD = 'architectureExplorer.reload'` export in `Tools/ArchitectureExplorer/src/constants.ts`
- [X] T003 [P] Create Mocha test scaffold with describe blocks in `Tools/ArchitectureExplorer/test/unit/mermaidTheme.test.ts`
- [X] T004 [P] Create Mocha test scaffold with describe blocks in `Tools/ArchitectureExplorer/test/unit/mermaidSanitize.test.ts`
- [X] T005 [P] Create Mocha test scaffold with mocked VS Code API in `Tools/ArchitectureExplorer/test/unit/markdownDocumentService.test.ts`
- [X] T006 [P] Create manifest contributes test scaffold in `Tools/ArchitectureExplorer/test/unit/package.contributes.test.ts`
- [X] T007 [P] Create reload handler test scaffold in `Tools/ArchitectureExplorer/test/unit/extension.reload.test.ts`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Shared render payload and logging conventions required by US1–US3 Webview work.

**⚠️ CRITICAL**: Complete before user story implementation.

- [X] T008 Extend Output channel helpers for activation/reload/mermaid/unknown-theme events in `Tools/ArchitectureExplorer/src/output.ts` per `specs/003-architecture-explorer-ux/contracts/service-interfaces.md`
- [X] T009 Add optional `documentPath` (repo-relative from `/knowledge`) to render payload assembly in `Tools/ArchitectureExplorer/src/services/MarkdownDocumentService.ts` `renderPanel` method
- [X] T010 Extend `RenderMessage` interface with `theme` and `documentPath` fields in `Tools/ArchitectureExplorer/src/webview/panel.ts` to match `specs/003-architecture-explorer-ux/contracts/webview-messages.md`
- [X] T011 Ensure `theme` object from host is forwarded unchanged in `Tools/ArchitectureExplorer/src/webview/DocumentationPanel.ts` `postRender` payload assembly

**Checkpoint**: Foundation ready — user story phases can begin (US1/US2 share `panel.ts`; implement sequentially within those stories).

---

## Phase 3: User Story 1 — Legible diagrams under any IDE theme (Priority: P1) 🎯 MVP

**Goal**: Drive Mermaid palette from IDE `theme.kind`; re-render on theme change when panel visible or on next reveal.

**Independent Test**: Open a Mermaid document under dark, light, and high-contrast IDE themes; switch theme while panel visible and confirm diagram palette updates within one refresh cycle (quickstart §3).

### Tests for User Story 1

> Write tests first; confirm they fail before implementation.

- [X] T012 [P] [US1] Add failing tests for `light`/`dark`/`highContrast` mapping and unknown→dark fallback in `Tools/ArchitectureExplorer/test/unit/mermaidTheme.test.ts`
- [X] T013 [P] [US1] Add failing test asserting high-contrast config includes elevated `themeVariables` in `Tools/ArchitectureExplorer/test/unit/mermaidTheme.test.ts`

### Implementation for User Story 1

- [X] T014 [US1] Implement `resolveMermaidTheme(kind)` returning `{ theme, themeVariables?, isFallback }` in `Tools/ArchitectureExplorer/src/utils/mermaidTheme.ts` per `specs/003-architecture-explorer-ux/research.md` §1
- [X] T015 [US1] Remove hardcoded `theme: 'neutral'` and call `mermaid.initialize()` with mapped config on first render in `Tools/ArchitectureExplorer/src/webview/panel.ts`
- [X] T016 [US1] Re-call `mermaid.initialize()` when `theme.kind` changes between renders in `Tools/ArchitectureExplorer/src/webview/panel.ts` `handleRender`
- [X] T017 [US1] Add `isVisible()` delegating to `WebviewPanel.visible` in `Tools/ArchitectureExplorer/src/webview/DocumentationPanel.ts`
- [X] T018 [US1] Register `vscode.window.onDidChangeActiveColorTheme` listener to re-post render for visible active panel in `Tools/ArchitectureExplorer/src/services/MarkdownDocumentService.ts`
- [X] T019 [US1] Skip theme-only re-render when panel hidden (`retainContextWhenHidden`) and refresh on next `open`/`reveal` in `Tools/ArchitectureExplorer/src/services/MarkdownDocumentService.ts`
- [X] T020 [US1] Post `log` warn `unknown theme kind: <value>` from Webview and dedupe identical values per activation session in `Tools/ArchitectureExplorer/src/extension.ts` webview message handler

**Checkpoint**: US1 independently testable — `npm test` green for `mermaidTheme.test.ts`; manual quickstart §3 passes.

---

## Phase 4: User Story 2 — Diagrams with HTML-break notes still render (Priority: P1)

**Goal**: Preprocess `<br>` variants to Mermaid-safe line breaks; surface diagnostics on failure without blocking sibling blocks.

**Independent Test**: Open `knowledge/integrations/external/firebase-fcm.md`; confirm `<br/>` notes render; confirm malformed diagram shows error + original source while page body and other diagrams render (quickstart §4).

### Tests for User Story 2

- [X] T021 [P] [US2] Add failing tests for `<br>`, `<br/>`, `<br />`, `<BR>` → newline in `Tools/ArchitectureExplorer/test/unit/mermaidSanitize.test.ts`
- [X] T022 [P] [US2] Add failing tests for CRLF preservation and strict-mode tag escape retry path in `Tools/ArchitectureExplorer/test/unit/mermaidSanitize.test.ts`
- [X] T023 [P] [US2] Add failing test that `securityLevel: 'strict'` remains unchanged in `Tools/ArchitectureExplorer/test/unit/mermaidSanitize.test.ts` (assert via render contract comment or panel constant)

### Implementation for User Story 2

- [X] T024 [US2] Implement `sanitizeMermaidSource(source, mode: 'normal' | 'strict')` in `Tools/ArchitectureExplorer/src/utils/mermaidSanitize.ts` per `specs/003-architecture-explorer-ux/contracts/webview-messages.md`
- [X] T025 [US2] Import `sanitizeMermaidSource` and preprocess each block with `'normal'` before `mermaid.render` in `Tools/ArchitectureExplorer/src/webview/panel.ts`
- [X] T026 [US2] Add single strict-mode retry on render failure in `Tools/ArchitectureExplorer/src/webview/panel.ts` `renderMermaidBlocks`
- [X] T027 [US2] Replace generic error copy with escaped `err.message` and original author `source` in `Tools/ArchitectureExplorer/src/webview/panel.ts`
- [X] T028 [P] [US2] Add `.mermaid-error-message` and `.mermaid-error-source` diagnostic styles in `Tools/ArchitectureExplorer/src/webview/panel.css`
- [X] T029 [US2] Post structured `log` error `Mermaid render failed: {documentPath} block {id}: {message}` to host in `Tools/ArchitectureExplorer/src/webview/panel.ts`
- [X] T030 [US2] Route Webview Mermaid failure logs to Output channel in `Tools/ArchitectureExplorer/src/extension.ts` message handler

**Checkpoint**: US2 independently testable — `mermaidSanitize.test.ts` green; firebase-fcm manual check passes.

---

## Phase 5: User Story 3 — One documentation panel, replaced on navigation (Priority: P1)

**Goal**: Maintain at most one Architecture Explorer documentation Webview; tree and search navigation replace content in place.

**Independent Test**: Open documents A→B→C from tree; confirm exactly one panel; close panel and open D; activate search result into same panel (quickstart §5).

### Tests for User Story 3

- [X] T031 [P] [US3] Add failing test that second `open()` reuses same panel mock without second constructor in `Tools/ArchitectureExplorer/test/unit/markdownDocumentService.test.ts`
- [X] T032 [P] [US3] Add failing test that `onDidDispose` clears singleton refs in `Tools/ArchitectureExplorer/test/unit/markdownDocumentService.test.ts`
- [X] T033 [P] [US3] Add failing test that `refreshUri` no-ops for non-active URI in `Tools/ArchitectureExplorer/test/unit/markdownDocumentService.test.ts`

### Implementation for User Story 3

- [X] T034 [US3] Replace `Map<string, DocumentationPanel>` with `activePanel`/`activeUri` singleton fields in `Tools/ArchitectureExplorer/src/services/MarkdownDocumentService.ts`
- [X] T035 [US3] Refactor `open()` to create panel once, update `activeUri`, render, and reveal in `Tools/ArchitectureExplorer/src/services/MarkdownDocumentService.ts`
- [X] T036 [US3] Limit `refreshUri()` and `handleDeleted()` to `activeUri` match only in `Tools/ArchitectureExplorer/src/services/MarkdownDocumentService.ts`
- [X] T037 [US3] Clear singleton on `panel.onDidDispose` in `Tools/ArchitectureExplorer/src/services/MarkdownDocumentService.ts`
- [X] T038 [US3] Add `dispose()` disposing theme listener and active panel for reload/deactivate in `Tools/ArchitectureExplorer/src/services/MarkdownDocumentService.ts`
- [X] T039 [US3] Verify `SearchQuickPick` still calls `markdownService.open(uri, { scrollAnchor, lineHint })` without creating extra panels in `Tools/ArchitectureExplorer/src/webview/SearchQuickPick.ts`

**Checkpoint**: US3 independently testable — 10-document navigation walk shows ≤1 panel (SC-004).

---

## Phase 6: User Story 4 — Search from the tree view title bar (Priority: P2)

**Goal**: Expose existing QuickPick search via native `view/title` search icon on the knowledge tree.

**Independent Test**: Click Search icon on tree title bar; type query; activate result into single documentation panel; Command Palette search unchanged (quickstart §6).

### Tests for User Story 4

- [X] T040 [P] [US4] Add failing test asserting `menus.view/title` references `architectureExplorer.search` with `$(search)` icon in `Tools/ArchitectureExplorer/test/unit/package.contributes.test.ts`

### Implementation for User Story 4

- [X] T041 [US4] Add `view/title` menu entry for `architectureExplorer.search` with `when`, `group: navigation@1`, and `icon: $(search)` in `Tools/ArchitectureExplorer/package.json` per `specs/003-architecture-explorer-ux/contracts/extension-contributes.md`
- [X] T042 [US4] Verify existing `COMMAND_SEARCH` handler in `Tools/ArchitectureExplorer/src/extension.ts` requires no duplicate registration for title-bar action

**Checkpoint**: US4 independently testable — search icon visible; picker behavior identical to Command Palette (FR-024).

---

## Phase 7: User Story 5 — Resilient tree provider registration and recovery (Priority: P3)

**Goal**: Synchronous tree registration on activate; structured activation logging; `Architecture Explorer: Reload` command with non-modal feedback.

**Independent Test**: Fresh Extension Development Host populates tree on first open; Reload restores tree without IDE restart; Output channel records outcomes (quickstart §7).

### Tests for User Story 5

- [X] T043 [P] [US5] Add failing tests for reload success notification and Output log path in `Tools/ArchitectureExplorer/test/unit/extension.reload.test.ts`
- [X] T044 [P] [US5] Add failing test for reload failure `showErrorMessage` and failing-step Output entry in `Tools/ArchitectureExplorer/test/unit/extension.reload.test.ts`

### Implementation for User Story 5

- [X] T045 [US5] Add `architectureExplorer.reload` command entry to `contributes.commands` in `Tools/ArchitectureExplorer/package.json`
- [X] T046 [US5] Extract `registerArchitectureExplorer(context)` with sync `createTreeView` before first `await` in `Tools/ArchitectureExplorer/src/extension.ts` per `specs/003-architecture-explorer-ux/contracts/service-interfaces.md`
- [X] T047 [US5] Wrap `activate()` in try/catch logging timestamped failing step to Output channel in `Tools/ArchitectureExplorer/src/extension.ts`
- [X] T048 [US5] Implement `COMMAND_RELOAD` handler disposing prior `TreeView`, re-registering services, and rebuilding index in `Tools/ArchitectureExplorer/src/extension.ts`
- [X] T049 [US5] Show non-modal `showInformationMessage` on reload success and `showErrorMessage` on failure in `Tools/ArchitectureExplorer/src/extension.ts`
- [X] T050 [US5] Guard reload against duplicating `activePanel` Webview and orphaned tree views in `Tools/ArchitectureExplorer/src/extension.ts`

**Checkpoint**: US5 independently testable — Reload restores tree; no duplicate panels (FR-028).

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Full regression, packaging, and manual acceptance matrix.

- [X] T051 [P] Run `npm test` in `Tools/ArchitectureExplorer/` and fix any failing V2 unit tests
- [X] T052 [P] Run `npm run compile` in `Tools/ArchitectureExplorer/` and confirm zero build errors
- [X] T053 Execute manual acceptance checks for US1–US5 documented in `specs/003-architecture-explorer-ux/quickstart.md` sections 3–7 and record pass/fail
- [X] T054 Run V1 regression checks (evidence links, freshness badge, file watcher, CRLF fences) per `specs/003-architecture-explorer-ux/quickstart.md` section 8
- [X] T055 Run `npm run package` in `Tools/ArchitectureExplorer/` to produce side-load `.vsix` at version 0.2.0
- [X] T056 Update `Tools/ArchitectureExplorer/README.md` with V2 Reload command and tree title-bar Search affordance

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately
- **Foundational (Phase 2)**: Depends on Phase 1 — **blocks all user stories**
- **User Stories (Phases 3–7)**: Depend on Phase 2 completion
  - **US1, US2, US3** are all P1 — recommended order US3 → US1 → US2 if single developer (US3 avoids `panel.ts` conflicts first; US1 before US2 because US2 extends same render loop)
  - **US4** (P2): Independent manifest change — can run in parallel after Phase 2
  - **US5** (P3): Depends on US3 `dispose()` and US4 manifest patterns for reload command entry
- **Polish (Phase 8)**: Depends on all desired user stories

### User Story Dependencies

| Story | Priority | Depends on | Notes |
|-------|----------|------------|-------|
| US1 | P1 | Phase 2 | Touches `panel.ts`, `MarkdownDocumentService.ts` |
| US2 | P1 | Phase 2, US1 render pipeline | Same `panel.ts` — implement after US1 |
| US3 | P1 | Phase 2 | Independent of US1/US2 Webview logic |
| US4 | P2 | Phase 2 | `package.json` only |
| US5 | P3 | US3 dispose, US4 reload manifest optional split | Refactors `extension.ts` |

### Within Each User Story

- Tests MUST fail before implementation (FR-032)
- Pure utils (`mermaidTheme.ts`, `mermaidSanitize.ts`) before Webview wiring
- Service lifecycle (`MarkdownDocumentService`) before Reload integration
- Story checkpoint before moving to next priority

### Parallel Opportunities

- **Phase 1**: T002–T007 all [P]
- **Phase 2**: T009–T011 [P] after T008
- **After Phase 2**: US3 and US4 can proceed in parallel (different files)
- **US1 tests**: T012–T013 [P]
- **US2 tests**: T021–T023 [P]
- **US3 tests**: T031–T033 [P]
- **US5 tests**: T043–T044 [P]
- **Polish**: T051–T052 [P]

---

## Parallel Example: User Story 3 + User Story 4

```bash
# Different files — safe to parallelize after Phase 2:
Task: "Replace Map with activePanel singleton in Tools/ArchitectureExplorer/src/services/MarkdownDocumentService.ts"  # US3
Task: "Add view/title search menu in Tools/ArchitectureExplorer/package.json"  # US4
```

---

## Parallel Example: User Story 1 Tests

```bash
# Launch together before implementation:
Task: "Add failing tests for theme kind mapping in Tools/ArchitectureExplorer/test/unit/mermaidTheme.test.ts"
Task: "Add failing test for high-contrast themeVariables in Tools/ArchitectureExplorer/test/unit/mermaidTheme.test.ts"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational
3. Complete Phase 3: User Story 1
4. **STOP and VALIDATE**: `npm test` + quickstart §3 manual theme checks
5. Package/demo if ready

### Incremental Delivery (Recommended for V2)

1. Setup + Foundational → foundation ready
2. US3 Single panel → fixes top UX complaint (quick win with tests)
3. US1 Theme contrast → unblocks diagram reading
4. US2 HTML-break robustness → fixes hard corpus failures
5. US4 Title-bar search → discoverability
6. US5 Reload recovery → resilience
7. Polish → full quickstart matrix + `.vsix`

### Parallel Team Strategy

| Developer | Stories | Primary files |
|-----------|---------|---------------|
| A | US3 | `MarkdownDocumentService.ts`, `markdownDocumentService.test.ts` |
| B | US1 + US2 | `mermaidTheme.ts`, `mermaidSanitize.ts`, `panel.ts` (sequential) |
| C | US4 + US5 | `package.json`, `extension.ts` (after US3 dispose lands) |

---

## Notes

- `[P]` tasks = different files, no incomplete-task dependencies
- US1 and US2 both modify `Tools/ArchitectureExplorer/src/webview/panel.ts` — do not mark concurrent edits [P]
- Visual WCAG legibility (SC-001) and live IDE keyboard checks (US4 AC) use quickstart manual matrix, not Node unit tests
- Do not relax `securityLevel: 'strict'` or add network/telemetry surfaces (FR-029, FR-007)
- No writes to `/knowledge` — all sanitize/theme work is in-memory at render time (FR-030)
