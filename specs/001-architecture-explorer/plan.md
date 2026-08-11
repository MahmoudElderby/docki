# Implementation Plan: Architecture Explorer IDE Extension

**Branch**: `001-architecture-explorer` | **Date**: 2026-08-11 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/001-architecture-explorer/spec.md`

## Summary

Build a standalone **VS Code / Cursor extension** (`Architecture Explorer`) that provides local browse, search, render, evidence navigation, and freshness checking for any repository's `/knowledge` Markdown tree. The extension is **viewer-only** — it never generates or rewrites architecture docs, never calls external services, and never indexes source code beyond explicit evidence-link activation.

**Technical approach**: TypeScript extension host services (workspace detection, tree provider, file watcher, search index, evidence resolver, Git freshness reader) plus an on-demand **Webview panel** for rendered Markdown (markdown-it + bundled Mermaid.js). Fuzzy filename/heading search via **Fuse.js**; body search via case-insensitive substring. All filesystem and Git operations stay in-process with strict CSP and zero outbound network.

## Technical Context

**Language/Version**: TypeScript 5.x targeting ES2022; Node.js 18+ (VS Code extension host runtime)

**Primary Dependencies**:
- `@types/vscode` — VS Code Extension API
- `markdown-it` (+ `markdown-it-anchor` optional for heading IDs) — Markdown → HTML in Webview
- `mermaid` — local diagram rendering (bundled, `securityLevel: 'strict'`)
- `fuse.js` — fuzzy ranking for filenames and extracted headings
- `esbuild` — bundle extension host + Webview assets for production `.vsix`

**Storage**: In-memory only (tree cache, search index, freshness snapshot). No database, no persisted index on disk in V1.

**Testing**: `@vscode/test-electron` + Mocha + `@types/mocha` for integration; Mocha + Node for pure service unit tests (search index, evidence resolver, freshness parser, tree sort)

**Target Platform**: VS Code ≥ 1.85 and Cursor (standard Extension API only; no Cursor-specific APIs)

**Project Type**: Desktop IDE extension (single package under `Tools/ArchitectureExplorer/`)

**Performance Goals**:
- Search results visible ≤ 1 s after debounced query on ≥ 300 Markdown files (SC-002)
- Tree/search reflect filesystem changes within ≤ 3 s after burst coalesce (SC-003)
- Idle CPU comparable to lightweight doc extensions on ~500 files (SC-010)

**Constraints**:
- Zero outbound network in normal operation (FR-036, SC-007)
- Strict Webview CSP; no arbitrary script from Markdown (FR-037, FR-039)
- 200 ms search debounce; 300 ms watcher coalesce; 5 MB render/index ceiling per file (FR-017, FR-029, FR-040)
- English UI only; `.vsix` side-load distribution in V1

**Scale/Scope**: Dozens of folders, hundreds of Markdown documents (~500 target), single workspace root in V1

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Applicability | Pre-design | Post-design |
|-----------|---------------|------------|-------------|
| **I. Code and Configuration Are Authoritative** | Extension displays `/knowledge` as-is; does not restate or alter platform behavior | ✅ Pass — read-only viewer; freshness compares README metadata to Git HEAD without rewriting docs | ✅ Pass — no doc mutation paths in design |
| **II. Evidence-Based Architecture Knowledge** | Extension must not modify generators under `.cursor/skills/architecture-*` | ✅ Pass — zero writes to `/knowledge` or generator assets (FR-042) | ✅ Pass — contracts expose read-only APIs only |
| **III. Service Boundary Integrity** | Standalone client; no StoreCloud service DB/API coupling | ✅ N/A — no monorepo service boundaries touched | ✅ N/A |
| **IV. Testability and Contract Discipline** | New extension crosses internal service boundaries | ✅ Pass with plan — unit tests per service + ≥1 tree→Webview integration test; every US1–6 scenario mapped to automated test (see [quickstart.md](./quickstart.md)) | ✅ Pass — contracts document testable message/service surfaces |
| **V. Secret Hygiene and Local-First Tooling** | Developer tooling must run locally; no telemetry | ✅ Pass — local-only, Output channel diagnostics, no secrets in extension config (FR-036) | ✅ Pass — CSP blocks remote fetch; evidence opens files only on explicit click |

**Gate result**: PASS — no unjustified violations. Complexity Tracking table not required.

## Project Structure

### Documentation (this feature)

```text
specs/001-architecture-explorer/
├── plan.md              # This file
├── research.md          # Phase 0 — technology decisions
├── data-model.md        # Phase 1 — entities and state
├── quickstart.md        # Phase 1 — build/run/validation guide
├── contracts/           # Phase 1 — extension & message contracts
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
├── package.json                 # extension manifest, contributes, scripts
├── tsconfig.json
├── esbuild.config.mjs           # host + webview bundles
├── .vscodeignore
├── src/
│   ├── extension.ts             # activate/deactivate, DI wiring
│   ├── constants.ts             # command IDs, limits, regexes
│   ├── output.ts                # "Architecture Explorer" Output channel
│   ├── services/
│   │   ├── KnowledgeWorkspaceService.ts
│   │   ├── KnowledgeTreeProvider.ts
│   │   ├── KnowledgeFileWatcher.ts
│   │   ├── SearchIndexService.ts
│   │   ├── MarkdownDocumentService.ts
│   │   ├── EvidenceLinkResolver.ts
│   │   └── GitFreshnessService.ts
│   ├── webview/
│   │   ├── DocumentationPanel.ts  # WebviewPanel lifecycle
│   │   ├── SearchQuickPick.ts     # search UI
│   │   ├── panel.html             # CSP shell
│   │   ├── panel.ts               # webview-side script (bundled)
│   │   └── panel.css              # theme-variable styling
│   └── utils/
│       ├── paths.ts               # workspace-relative resolution, symlink guard
│       ├── labels.ts              # kebab-case → Title Case
│       ├── snippets.ts            # ~160 char match snippets
│       └── freshnessParser.ts     # README "Last analyzed commit" extraction
├── media/                       # bundled icons (activity bar)
└── test/
    ├── unit/                    # pure service tests (Node + Mocha)
    │   ├── evidenceLinkResolver.test.ts
    │   ├── searchIndex.test.ts
    │   ├── freshnessParser.test.ts
    │   ├── treeSort.test.ts
    │   └── snippets.test.ts
    ├── fixtures/                # sample /knowledge mini-tree
    └── integration/
        └── extension.test.ts    # @vscode/test-electron: tree + webview smoke
```

**Structure Decision**: Single extension package under `Tools/ArchitectureExplorer/` following the existing `Tools/` convention (see `Tools/YallaCardRequest/`). Keeps the 15-service .NET monorepo untouched; extension ships as an independent `.vsix` build artifact.

## Architecture Overview

```text
┌─────────────────────────────────────────────────────────────────┐
│                     Extension Host (Node)                        │
│  activate() → register TreeView, Commands, FileSystemWatcher    │
│                                                                  │
│  KnowledgeWorkspaceService ──► root path, empty/missing state   │
│         │                                                        │
│         ├── KnowledgeTreeProvider (TreeDataProvider)             │
│         ├── KnowledgeFileWatcher ──► 300ms coalesce ──► refresh │
│         ├── SearchIndexService (Fuse + body substring index)     │
│         ├── GitFreshnessService (README parse + git HEAD)        │
│         └── MarkdownDocumentService ──► DocumentationPanel       │
│                    │                         │                   │
│              EvidenceLinkResolver      Webview postMessage       │
└────────────────────┼─────────────────────────┼───────────────────┘
                     │                         ▼
              vscode.window          ┌──────────────────────┐
              .showTextDocument      │  Webview (isolated)   │
                                     │  markdown-it → HTML   │
                                     │  mermaid.render()     │
                                     │  theme CSS vars       │
                                     └──────────────────────┘
```

### Activation flow

1. **On activate**: resolve workspace root → locate `/knowledge` → log chosen root to Output channel → start background index build → register tree + commands + watcher.
2. **Tree click**: `MarkdownDocumentService.open(uri)` creates/reveals Webview panel; host reads file (≤ 5 MB window), runs markdown-it, posts HTML + mermaid blocks to Webview.
3. **Search command**: QuickPick with 200 ms debounce; queries in-memory index; result activation opens panel and scrolls via heading anchor or character offset.
4. **Evidence click** (Webview → host message): `EvidenceLinkResolver` validates path → `vscode.workspace.openTextDocument` + `showTextDocument` with line/range selection.
5. **Freshness**: parse `knowledge/README.md` table row → compare to `git rev-parse HEAD` → optional `git rev-list --count` → tree view title/description badge.

### Key design choices (see [research.md](./research.md))

- **Webview panel**, not CustomTextEditor — preserves default `.md` editor (FR-006).
- **Host-side Markdown parse** — keeps CSP tight; Webview receives sanitized HTML + diagram sources only.
- **Incremental index** — per-file upsert on watcher events; full rebuild only on manual refresh or root change.
- **Git via `vscode.extensions.getExtension('vscode.git')`** with `child_process` fallback when API unavailable.

## Phase 0 Output

✅ [research.md](./research.md) — all technology choices resolved; no `[NEEDS CLARIFICATION]` remain.

## Phase 1 Output

✅ [data-model.md](./data-model.md) — entity fields, relationships, validation, state transitions

✅ [contracts/](./contracts/) — extension manifest contributes, Webview message protocol, internal service interfaces

✅ [quickstart.md](./quickstart.md) — build, install, and acceptance validation scenarios

## Post-Design Constitution Re-check

All gates remain **PASS** (see table above). Design introduces no new frameworks beyond spec-mandated stack; no knowledge-generator edits; test contracts satisfy Principle IV.

## Risks and Mitigations

| Risk | Mitigation |
|------|------------|
| Mermaid XSS via `htmlLabels` / scripts | `securityLevel: 'strict'`, disable `htmlLabels`, render in isolated Webview with nonce CSP |
| Large repo index blocks UI | Background index build on activate; coalesced updates; head-of-file cap at 5 MB |
| Git unavailable in Cursor sandbox | Graceful `unknown` freshness; log reason to Output channel |
| README freshness format drift | Tolerant regex supporting table row and plain line forms (see freshnessParser) |
| Multi-root confusion | V1: first root with `/knowledge`; display in tree header + Output log |

## Out of Scope (V1)

Confirmed by spec: multi-root grouping, marketplace publish, localization, semantic/vector search, LLM, architecture generation, default keybindings, repository-wide code indexing.

## Next Steps

Run `/speckit-tasks` to decompose into dependency-ordered implementation tasks, then `/speckit-implement`.
