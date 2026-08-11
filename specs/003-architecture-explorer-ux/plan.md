# Implementation Plan: Architecture Explorer UX + Mermaid Reliability (V2)

**Branch**: `003-architecture-explorer-ux` | **Date**: 2026-08-11 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/003-architecture-explorer-ux/spec.md`

**Foundation**: Incremental V2 over shipped V1 extension (`specs/001-architecture-explorer`, `Tools/ArchitectureExplorer/`). All V1 non-goals, entities, and constitutional guardrails remain in force.

## Summary

Fix three production bugs and deliver two UX enhancements in the existing **Architecture Explorer** VS Code / Cursor extension without rebuilding from scratch:

1. **Mermaid theme contrast** — drive Mermaid palette from the IDE theme kind already supplied in the render payload; re-render on theme change.
2. **Mermaid HTML-note robustness** — preprocess `<br>` variants to Mermaid-safe line breaks under `securityLevel: 'strict'`; surface underlying diagnostics on failure.
3. **Single documentation panel** — replace per-URI panel map with one reusable Webview; tree and search navigation update content in place.
4. **Tree title-bar Search** — contribute `view/title` action with `$(search)` icon wired to existing QuickPick search.
5. **Tree provider resilience** — synchronous provider registration on activate, structured activation logging, and `Architecture Explorer: Reload` command with non-modal feedback.

**Technical approach**: In-place TypeScript changes under `Tools/ArchitectureExplorer/` — extract testable Mermaid utilities (`mermaidTheme.ts`, `mermaidSanitize.ts`), refactor `MarkdownDocumentService` panel lifecycle, extend `extension.ts` activation/reload wiring, update `package.json` contributes, and add automated tests plus quickstart manual checks per FR-032.

## Technical Context

**Language/Version**: TypeScript 5.x targeting ES2022; Node.js 18+ (VS Code extension host runtime) — unchanged from V1

**Primary Dependencies** (unchanged versions; behavior extended):
- `@types/vscode` — VS Code Extension API
- `markdown-it` — host-side Markdown → HTML
- `mermaid` ^11.4.0 — Webview diagram rendering (`securityLevel: 'strict'`, theme driven by payload)
- `fuse.js` — fuzzy search ranking (unchanged algorithm)
- `esbuild` — bundle host + Webview assets

**Storage**: In-memory only — unchanged from V1. V2 adds `activePanel` singleton reference and `currentDocumentUri` tracking; no disk persistence.

**Testing**: Mocha + Node for pure utilities and service semantics; `@vscode/test-electron` for integration smoke where applicable. V2 requires automated regression tests for unit-testable acceptance scenarios plus documented manual quickstart checks for visual-legibility and live-IDE scenarios (FR-032, SC-008).

**Target Platform**: VS Code ≥ 1.85 and Cursor — unchanged

**Project Type**: Desktop IDE extension (single package `Tools/ArchitectureExplorer/`)

**Performance Goals** (inherited from V1; V2 must not regress):
- Search results ≤ 1 s after debounced query on ≥ 300 files
- Theme re-render completes within one Webview refresh cycle (SC-006)
- Panel content swap (same Webview, new document) ≤ perceptible delay vs V1 new-panel open

**Constraints**:
- Zero outbound network (FR-029, SC-009)
- Strict Webview CSP; no script execution from diagram source (FR-007)
- Preprocessing and theme mapping in memory only — no `/knowledge` writes (FR-030)
- `securityLevel: 'strict'` MUST NOT be relaxed (A4)
- English UI only (A12)

**Scale/Scope**: Same as V1 (~500 Markdown files); V2 touches Webview render path, panel lifecycle, manifest contributes, and activation — not search algorithm, tree sort, evidence rules, or freshness logic.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Applicability | Pre-design | Post-design |
|-----------|---------------|------------|-------------|
| **I. Code and Configuration Are Authoritative** | V2 fixes observed bugs where code diverged from intended behavior (theme in payload unused) | ✅ Pass — changes align implementation to existing payload contract | ✅ Pass — contracts document authoritative message shapes |
| **II. Evidence-Based Architecture Knowledge** | Extension remains viewer-only; no generator edits | ✅ Pass — zero writes to `/knowledge` or `.cursor/skills/architecture-*` | ✅ Pass — preprocess is render-time only |
| **III. Service Boundary Integrity** | Standalone client; no monorepo service coupling | ✅ N/A | ✅ N/A |
| **IV. Testability and Contract Discipline** | V2 crosses Webview ↔ host message boundary and panel lifecycle | ✅ Pass with plan — unit tests for theme map, sanitize, single-panel; contracts updated | ✅ Pass — every US1–5 scenario mapped in [quickstart.md](./quickstart.md) |
| **V. Secret Hygiene and Local-First Tooling** | Local-only tooling; Output channel diagnostics | ✅ Pass — no telemetry, no remote Mermaid assets (FR-003) | ✅ Pass — bundled themes only; Reload uses local re-registration |

**Gate result**: PASS — no unjustified violations. Complexity Tracking table not required.

## Project Structure

### Documentation (this feature)

```text
specs/003-architecture-explorer-ux/
├── plan.md              # This file
├── research.md          # Phase 0 — V2 technology decisions
├── data-model.md        # Phase 1 — V2 entity extensions and state
├── quickstart.md        # Phase 1 — build/install/acceptance validation
├── contracts/           # Phase 1 — updated extension & message contracts
│   ├── extension-contributes.md
│   ├── webview-messages.md
│   └── service-interfaces.md
├── autopilot-assumptions.md
├── spec.md
└── tasks.md             # Phase 2 (/speckit-tasks — not created here)
```

### Source Code (repository root)

```text
Tools/ArchitectureExplorer/
├── package.json                 # + view/title search menu, reload command, version bump
├── src/
│   ├── extension.ts             # sync tree registration, reload command, theme-change listener
│   ├── constants.ts             # + COMMAND_RELOAD
│   ├── services/
│   │   └── MarkdownDocumentService.ts  # single activePanel; theme-change re-render
│   ├── webview/
│   │   ├── DocumentationPanel.ts       # optional: updateUri(); unchanged WebviewPanel reuse
│   │   ├── panel.ts                    # theme init, sanitize, diagnostic errors, theme re-init
│   │   ├── panel.css                   # mermaid-error diagnostic styling (if needed)
│   │   └── SearchQuickPick.ts          # unchanged behavior; routes to single panel
│   └── utils/
│       ├── mermaidTheme.ts      # NEW — IDE kind → Mermaid theme config (unit-tested)
│       └── mermaidSanitize.ts   # NEW — <br> normalisation + retry escape (unit-tested)
└── test/
    └── unit/
        ├── mermaidTheme.test.ts      # NEW — US1 theme mapping + fallback
        ├── mermaidSanitize.test.ts   # NEW — US2 br variants, script preserved blocked
        └── markdownDocumentService.test.ts  # NEW — US3 single-panel semantics (mocked)
```

**Structure Decision**: Same single-package layout as V1 under `Tools/ArchitectureExplorer/`. V2 adds two pure utility modules extractable for Node unit tests (sanitize and theme logic must be testable without Webview — FR-032). No new packages or services.

## Architecture Overview

```text
┌─────────────────────────────────────────────────────────────────┐
│                     Extension Host (Node)                        │
│  activate() ──► register TreeDataProvider FIRST (sync)           │
│              ──► register commands + theme-change listener         │
│              ──► await refreshAll() (index, freshness)             │
│                                                                  │
│  MarkdownDocumentService                                         │
│    activePanel: DocumentationPanel | undefined  (V2 singleton)   │
│    open(uri) ──► create | reuse panel ──► postRender(payload)    │
│                                                                  │
│  onDidChangeActiveColorTheme ──► re-render visible panel         │
│  architectureExplorer.reload ──► re-register providers/services  │
└────────────────────────────┬────────────────────────────────────┘
                             │ postMessage(render { theme, mermaidBlocks })
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                     Webview (isolated)                           │
│  handleRender(msg):                                              │
│    1. applyMermaidTheme(msg.theme.kind)  // was ignored in V1    │
│    2. inject HTML                                                  │
│    3. for each block: sanitize(source) → render → retry on fail │
│    4. scrollToAnchor / lineHint                                    │
└─────────────────────────────────────────────────────────────────┘
```

### V2 change map (by user story)

| Story | Primary files | Mechanism |
|-------|---------------|-----------|
| US1 Theme contrast | `mermaidTheme.ts`, `panel.ts`, `MarkdownDocumentService.ts` | Map `theme.kind` → Mermaid `theme` + `themeVariables`; `mermaid.initialize()` when kind changes; host re-posts render on `onDidChangeActiveColorTheme` if panel visible |
| US2 HTML notes | `mermaidSanitize.ts`, `panel.ts` | Pre-render `<br>` → `\n`; catch exposes `err.message`; retry with tag escape; log file path via host |
| US3 Single panel | `MarkdownDocumentService.ts`, `DocumentationPanel.ts` | One `activePanel`; `open()` updates URI and calls `postRender`; dispose clears singleton |
| US4 Title search | `package.json` | `menus.view/title` → existing `architectureExplorer.search` |
| US5 Reload | `extension.ts`, `constants.ts`, `package.json` | Extract registration; try/catch + Output log; Reload command + `showInformationMessage` / `showErrorMessage` |

### Observed V1 gaps (code-authoritative)

| Location | Current behavior | V2 target |
|----------|------------------|-----------|
| `panel.ts:25-29` | `theme: 'neutral'` hardcoded; ignores render payload | Apply `msg.theme.kind` via `mermaidTheme.ts` |
| `panel.ts:46-57` | Generic catch; no error text | Surface `err.message`; post structured log with block id |
| `MarkdownDocumentService.ts:12-38` | `Map<uri, panel>` — stacks panels | Single `activePanel` reused across URIs |
| `package.json` | No `view/title` menu; no Reload command | Add contributes per FR-018, FR-027 |
| `extension.ts:78` | `await refreshAll()` before commands fully wired — tree registered at L38 (OK) but no reload/recovery path | Sync registration wrapper + Reload command |

## Phase 0 Output

✅ [research.md](./research.md) — all V2 technical choices resolved; no `[NEEDS CLARIFICATION]` remain.

## Phase 1 Output

✅ [data-model.md](./data-model.md) — V2 entity extensions (ActiveDocumentationPanel, MermaidRenderAttempt, ExtensionActivationState)

✅ [contracts/](./contracts/) — updated manifest, Webview messages, service interfaces

✅ [quickstart.md](./quickstart.md) — build, install, and acceptance validation scenarios for US1–5

## Post-Design Constitution Re-check

All gates remain **PASS** (see table above). V2 introduces no new frameworks, no knowledge-generator edits, no network surface, and satisfies Principle IV via explicit test mapping in quickstart.

## Risks and Mitigations

| Risk | Mitigation |
|------|------------|
| Mermaid built-in dark theme still low contrast on some IDE themes | Use `theme: 'base'` + explicit `themeVariables` tuned per kind; verify against SC-001 sample docs |
| Sanitize `<br>` insufficient for other HTML in notes | Retry with tag strip/escape (FR-008); diagnostic + source shown; do not lower securityLevel |
| Single panel breaks refresh-on-file-change for non-visible doc | `refreshUri` only re-renders if URI matches `activePanel` current document |
| Reload duplicates tree views | Dispose prior `TreeView` subscription before re-create; guard with activation mutex |
| Theme change storm (rapid toggling) | Debounce re-render 50 ms or compare kind before re-init; final state must match active theme (edge case in spec) |
| `onView` lazy activation race on cold install | Register provider synchronously as first statement in `activate()`; log failures to Output channel |

## Out of Scope (V2)

Confirmed by spec: knowledge Markdown rewrites, LLM/telemetry, multi-root redesign, marketplace publish, inline tree search input, V1 search algorithm changes, evidence/freshness rule changes.

## Next Steps

Run `/speckit-tasks` to decompose into dependency-ordered implementation tasks, then `/speckit-implement`.
