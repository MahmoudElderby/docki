# Data Model: Architecture Explorer UX + Mermaid Reliability (V2)

**Feature**: `003-architecture-explorer-ux`  
**Date**: 2026-08-11

V2 extends the V1 in-memory model documented in `specs/001-architecture-explorer/data-model.md`. All V1 entities (`KnowledgeWorkspace`, `KnowledgeCategory`, `KnowledgeDocument`, `SearchIndexEntry`, `FreshnessStatus`, `EvidenceLink`) remain unchanged. This document defines **new fields, state transitions, and relationships** introduced by V2.

---

## V2 Entity Relationship Delta

```text
MarkdownDocumentService (1)
    │
    └── holds at most one ──► ActiveDocumentationPanel (0..1)
                                    │
                                    ├── displays ──► KnowledgeDocument (current)
                                    └── renders ──► MermaidRenderAttempt (*) per diagram block

ExtensionActivationState (1 per session)
    ├── registers ──► KnowledgeTreeProvider
    └── exposes ──► ReloadOutcome (ephemeral, on command)
```

---

## 1. ActiveDocumentationPanel (NEW)

Represents the singleton Architecture Explorer documentation Webview for tree/search navigation.

| Field | Type | Description |
|-------|------|-------------|
| `panel` | `DocumentationPanel` | Underlying `WebviewPanel` wrapper |
| `currentUri` | `vscode.Uri` | Knowledge document currently displayed |
| `currentDocumentId` | `string` | URI string sent to Webview as `documentId` |
| `isVisible` | `boolean` | Derived from `WebviewPanel.visible` |
| `lastRenderGeneration` | `number` | Matches `RenderPayload.generation` |
| `lastThemeKind` | `'light' \| 'dark' \| 'highContrast' \| 'unknown'` | Last applied IDE theme kind |

### Invariants (FR-012, FR-013)

- At most **one** `ActiveDocumentationPanel` exists per extension activation session.
- Tree navigation, Command Palette search, and title-bar search all target this instance.
- Standard editor tabs opened via `openRaw` are **outside** this entity.

### State transitions

```text
[none]
  │ open(firstUri)
  ▼
[active: uri=A]
  │ open(B)  ──► [active: uri=B]     // same panel, content replaced
  │ user closes panel
  ▼
[none]
  │ open(C)
  ▼
[active: uri=C]                       // new WebviewPanel created
```

### Validation

- `currentUri` MUST resolve under active workspace `/knowledge` (inherited V1 path guard).
- On `panel.onDidDispose`, service MUST set singleton to `undefined` (FR-014).

---

## 2. MermaidRenderAttempt (NEW — ephemeral per block per render)

Tracks render outcome for one fenced `mermaid` block within a document render pass.

| Field | Type | Description |
|-------|------|-------------|
| `blockId` | `string` | Stable id within document (`mermaid-0`, etc.) |
| `originalSource` | `string` | Author source from Markdown fence (immutable for display on failure) |
| `sanitizedSource` | `string` | After `sanitizeMermaidSource(..., 'normal')` |
| `attempt` | `1 \| 2` | First render or retry after strict sanitize |
| `status` | `'success' \| 'failure'` | Outcome |
| `errorMessage` | `string \| null` | Mermaid exception message when `failure` |
| `documentPath` | `string` | Repository-relative path for logging |

### Validation

- `originalSource` MUST NOT be persisted to disk (FR-030).
- On `failure`, `errorMessage` MUST be non-empty (FR-010).
- Script-bearing source MUST NOT transition to `success` with executed script (FR-007) — enforced by Mermaid strict mode, not by this record.

### Relationships

- Many attempts per `ActiveDocumentationPanel` render generation.
- Failure of one attempt MUST NOT abort sibling blocks (FR-009).

---

## 3. MermaidThemeConfig (NEW — value object)

Configuration passed to `mermaid.initialize()` derived from IDE theme.

| Field | Type | Description |
|-------|------|-------------|
| `mermaidTheme` | `string` | Built-in theme name (`default`, `dark`, …) |
| `themeVariables` | `Record<string, string>` | Optional overrides for contrast |
| `sourceKind` | `'light' \| 'dark' \| 'highContrast' \| 'unknown'` | Input from render payload |
| `isFallback` | `boolean` | True when `sourceKind` was unknown/missing |

### Mapping rules

See [research.md](./research.md) §1. Unknown kind sets `isFallback: true`, `mermaidTheme: 'dark'`.

---

## 4. ExtensionActivationState (NEW — session singleton)

Tracks extension wiring health for recovery scenarios.

| Field | Type | Description |
|-------|------|-------------|
| `activatedAt` | `number` | `Date.now()` at successful activate start |
| `treeProviderRegistered` | `boolean` | True after `createTreeView` returns |
| `lastActivationError` | `string \| null` | Message if activate try/catch caught error |
| `reloadCount` | `number` | Times `architectureExplorer.reload` succeeded |
| `loggedUnknownThemeKinds` | `Set<string>` | Dedup set for FR-005a log-once behavior |

### State transitions

```text
[deactivated]
  │ activate() sync register tree
  ▼
[active: treeProviderRegistered=true]
  │ reload command
  ▼
[active: re-registered, reloadCount++]
  │ activation error
  ▼
[active with lastActivationError set, tree may be empty]
```

---

## 5. ReloadOutcome (NEW — ephemeral)

Result of user-invoked Reload command (not persisted).

| Field | Type | Description |
|-------|------|-------------|
| `success` | `boolean` | Overall outcome |
| `message` | `string` | User-facing summary for notification |
| `timestamp` | `string` | ISO timestamp for Output channel |
| `failedStep` | `string \| null` | e.g. `treeRegistration`, `indexRebuild` |

### Validation

- Success MUST NOT duplicate `ActiveDocumentationPanel` (FR-028).
- Failure MUST produce non-modal error notification + Output entry (FR-027, A17).

---

## 6. RenderPayload extensions (V1 entity delta)

Extends V1 `RenderPayload` / `RenderMessage` (no breaking changes):

| Field | Change | Description |
|-------|--------|-------------|
| `theme.kind` | **now consumed** | Webview MUST apply to Mermaid (was ignored) |
| `mermaidBlocks[].source` | unchanged | Still author-original; sanitize at render time in Webview |
| `documentPath` | **optional add** | Repository-relative path for error logging (host-supplied) |

---

## 7. SearchQuickPick activation (unchanged data)

Search index entries, debounce, and result shape unchanged (A9). V2 only changes **navigation target** to singleton panel — `SearchQuickPickItem.uri` still triggers `markdownService.open(uri, { scrollAnchor, lineHint })`.

---

## Cross-entity rules (V2)

| Rule ID | Description |
|---------|-------------|
| **DR-001** | `ActiveDocumentationPanel` count ≤ 1 at all times |
| **DR-002** | Mermaid preprocess MUST NOT write to `KnowledgeDocument` on disk |
| **DR-003** | Theme re-render MUST NOT change `currentUri` unless user navigates |
| **DR-004** | Reload MUST re-register tree before returning success |
| **DR-005** | Title-bar search and palette search share identical `SearchQuickPick` code path |

---

## Unchanged from V1 (explicit)

- `KnowledgeWorkspace` root resolution and presence states
- `SearchIndexService` index shape and Fuse/substring algorithm
- `FreshnessStatus` computation
- `EvidenceLink` resolution rules
- Tree sort order and pinned files
