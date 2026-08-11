# Data Model: Architecture Explorer IDE Extension

**Feature**: `001-architecture-explorer`  
**Date**: 2026-08-11

This document defines in-memory entities, fields, relationships, validation rules, and state transitions for the extension. No persistent database — all structures live in the extension host process and are rebuilt from filesystem + Git on refresh.

---

## Entity Relationship Overview

```text
KnowledgeWorkspace (1)
    │
    ├── has many ──► KnowledgeCategory (*)
    │                    │
    │                    └── has many ──► KnowledgeDocument (*)
    │                                          │
    │                                          └── indexed as ──► SearchIndexEntry (1:1)
    │
    ├── produces ──► FreshnessStatus (1)
    │
    └── contains ──► EvidenceLink (*) [parsed from KnowledgeDocument at render time]
```

---

## 1. KnowledgeWorkspace

Represents the resolved workspace context for `/knowledge`.

| Field | Type | Description |
|-------|------|-------------|
| `workspaceRoot` | `vscode.Uri` | Chosen workspace folder URI — first folder in workspace order that contains a `/knowledge` directory; if none contain `/knowledge`, the first folder (for empty-state messaging) |
| `workspaceRootLabel` | `string` | Display path for header / empty state |
| `knowledgeRoot` | `vscode.Uri \| null` | Absolute URI to `<workspaceRoot>/knowledge` when present |
| `presence` | `'missing' \| 'empty' \| 'populated'` | Derived from filesystem scan |
| `activeRootIndex` | `number` | Index in `workspaceFolders` of `workspaceRoot` |
| `followsSymlink` | `boolean` | True when `knowledge/` is a symlink resolved inside workspace |

### Derivation rules

- `missing`: `knowledge/` does not exist under chosen root.
- `empty`: folder exists but zero `.md` files discovered (recursive, following symlink rules).
- `populated`: ≥ 1 `.md` file.

### Validation

- If `knowledgeRoot` resolves via symlink to a path outside `workspaceRoot`, treat as `missing` and log warning (FR-023).

---

## 2. KnowledgeCategory

Mirror node for a subdirectory under `/knowledge`.

| Field | Type | Description |
|-------|------|-------------|
| `id` | `string` | Stable tree ID: POSIX relative path from `knowledge/` (e.g. `domains`) |
| `folderName` | `string` | On-disk segment name |
| `displayName` | `string` | Prettified label (kebab/snake → Title Case) |
| `relativePath` | `string` | Path from `knowledge/` without leading slash |
| `parentId` | `string \| null` | Parent category ID; null for top-level |
| `childCategoryIds` | `string[]` | Sorted subfolder IDs |
| `childDocumentIds` | `string[]` | Sorted document IDs in this folder |

### Sort order (FR-002)

Within each folder:
1. Subfolders first, case-insensitive ascending.
2. Then `.md` files, case-insensitive ascending.
3. Pin `README.md` and `AI_CONTEXT.md` to top of **their containing folder** (files only; not folders).

Non-`.md` files are excluded entirely.

---

## 3. KnowledgeDocument

A single Markdown file under `/knowledge`.

| Field | Type | Description |
|-------|------|-------------|
| `id` | `string` | Stable ID = POSIX relative path from `knowledge/` (e.g. `domains/payment.md`) |
| `uri` | `vscode.Uri` | Absolute file URI |
| `fileName` | `string` | Basename (e.g. `payment.md`) |
| `displayName` | `string` | Prettified stem (e.g. `Payment`) |
| `categoryPath` | `string` | Parent folder relative path (e.g. `domains`) |
| `categoryLabel` | `string` | Prettified category for search results (e.g. `Domains`) |
| `headings` | `Heading[]` | Extracted ATX headings `{ level, text, slug, offset }` |
| `byteSize` | `number` | Raw file size on disk |
| `indexedByteLength` | `number` | Bytes actually indexed (min(size, 5 MB)) |
| `lastModified` | `number` | `mtimeMs` from stat |
| `isPinnedName` | `boolean` | True for `README.md` / `AI_CONTEXT.md` |

### Validation

- Must end with `.md` (case-insensitive).
- Must be reachable without escaping workspace root.

---

## 4. SearchIndexEntry

Searchable projection of a `KnowledgeDocument`.

| Field | Type | Description |
|-------|------|-------------|
| `documentId` | `string` | FK → `KnowledgeDocument.id` |
| `fileName` | `string` | Lowercased for matching |
| `displayName` | `string` | For result title |
| `categoryLabel` | `string` | Group label in results |
| `headingTexts` | `string[]` | Plain heading strings |
| `bodyText` | `string` | Lowercased indexed body (truncated to 5 MB window) |
| `bodyRaw` | `string` | Original casing for snippet extraction |

### Search result (derived, not stored)

| Field | Type | Description |
|-------|------|-------------|
| `documentId` | `string` | Target document |
| `matchKind` | `'filename' \| 'heading' \| 'body'` | Drives ranking/display |
| `score` | `number` | Fuse score or body position rank |
| `snippet` | `string` | ~160 chars centered on match with highlight markers |
| `anchor` | `string \| null` | Heading slug for scroll-to |
| `lineHint` | `number \| null` | Approximate line for body match |

### Index lifecycle states

```text
[uninitialized] ──activate──► [building] ──complete──► [ready]
                                  │                        │
                                  └── error (logged) ──────┘
[ready] ──file event / refresh──► [updating] ──coalesce──► [ready]
```

While `building` or `updating`, search UI shows non-blocking "indexing…" (FR-017).

---

## 5. EvidenceLink

Parsed token from rendered Markdown (not persisted across sessions).

| Field | Type | Description |
|-------|------|-------------|
| `rawToken` | `string` | Original backtick or href text |
| `filePath` | `string` | Path without `#` fragment |
| `lineStart` | `number \| null` | From `#L120` |
| `lineEnd` | `number \| null` | From `#L120-L184` |
| `resolvedUri` | `vscode.Uri \| null` | Absolute URI if valid |
| `status` | `'resolves' \| 'missing' \| 'rejected'` | Resolution outcome |

### Validation rules (FR-019, FR-022, FR-023)

| Rule | Rejection |
|------|-----------|
| Leading `/` or URL scheme | `rejected` — not linkified |
| Contains `..` segment | `rejected` |
| Missing/common extension and no `#L` suffix | not linkified |
| File not on disk | `missing` (click shows notification) |
| Symlink escapes workspace | `rejected` |
| Plain prose (not code/link) | never parsed |

---

## 6. FreshnessStatus

| Field | Type | Description |
|-------|------|-------------|
| `state` | `'up-to-date' \| 'potentially-stale' \| 'unknown'` | UI badge |
| `analyzedCommit` | `string \| null` | SHA from README |
| `currentHead` | `string \| null` | Git HEAD SHA |
| `commitDistance` | `number \| null` | Count from `git rev-list`; null if query fails |
| `unknownReason` | `string \| null` | e.g. `no-git`, `no-metadata`, `malformed-metadata` |

### State transitions

```text
                    ┌─────────────────┐
                    │     unknown     │◄── no README / no Git / parse fail
                    └────────┬────────┘
                             │ valid metadata + HEAD
              ┌──────────────┴──────────────┐
              ▼                             ▼
     ┌────────────────┐          ┌─────────────────────┐
     │  up-to-date    │          │ potentially-stale   │
     │ analyzed==HEAD │          │ analyzed!=HEAD      │
     └────────────────┘          └─────────────────────┘
```

Re-evaluated on: activate, manual refresh, `knowledge/README.md` change, Git HEAD change (via Git extension API listener when available).

### README parse patterns

1. Table row: `| Last analyzed commit | \`<sha>\` |` (case-insensitive label).
2. Plain line: `Last analyzed commit: <sha>` (whitespace tolerant, optional backticks).

SHA: `[0-9a-fA-F]{7,40}`.

---

## 7. RenderedDocumentView (ephemeral UI state)

Tracks an open Webview panel.

| Field | Type | Description |
|-------|------|-------------|
| `panelId` | `string` | VS Code WebviewPanel id |
| `documentId` | `string` | Currently displayed document |
| `uri` | `vscode.Uri` | Source file |
| `renderGeneration` | `number` | Incremented on each re-render |
| `truncated` | `boolean` | True when 5 MB ceiling applied |
| `scrollAnchor` | `string \| null` | Pending scroll target from search |

### Refresh rules (FR-028)

| Change source | Re-render trigger |
|---------------|-------------------|
| External disk change | Immediate on watcher event |
| User editing raw editor | On `document.save` only |
| File deleted | Show "document no longer exists" state |
| Manual refresh | Force re-read + re-render |

---

## 8. TreeViewItem (presentation)

VS Code `TreeItem` mapping — not a separate domain entity but documented for clarity.

| `contextValue` | Meaning |
|----------------|---------|
| `category` | Expandable folder node |
| `document` | Leaf Markdown file |
| `emptyState` | Informational node when no knowledge |
| `indexing` | Transient placeholder during first scan |

---

## Cross-entity invariants

1. **Single root (V1)**: All entities reference the same `KnowledgeWorkspace.workspaceRoot`.
2. **Read-only**: No entity mutation writes back to disk or Git.
3. **Markdown-only index**: Images and other assets under `/knowledge` are reachable only via normal editor or rendered `<img>` — not indexed or tree-listed.
4. **Id stability**: `documentId` = relative POSIX path ensures rename detection (old ID gone, new ID added) on watcher events.
