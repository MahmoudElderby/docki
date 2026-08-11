# Contract: Internal Service Interfaces

**Feature**: `001-architecture-explorer`  
**Runtime**: Extension host (TypeScript)

These interfaces define testable service boundaries. Implementations live under `Tools/ArchitectureExplorer/src/services/`.

---

## KnowledgeWorkspaceService

```typescript
interface KnowledgeWorkspaceService {
  /** Currently active workspace (V1: first folder in order with /knowledge; else first folder). */
  getActive(): KnowledgeWorkspace | undefined;

  /** Re-resolve roots after workspace folder changes. */
  refresh(): Promise<KnowledgeWorkspace>;

  /** Emitted when presence or root changes. */
  readonly onDidChangeWorkspace: vscode.Event<KnowledgeWorkspace>;
}
```

**Tests**: missing / empty / populated detection; symlink inside/outside root; multi-root picks first with knowledge.

---

## KnowledgeTreeProvider

```typescript
interface KnowledgeTreeProvider extends vscode.TreeDataProvider<TreeNode> {
  readonly onDidChangeTreeData: vscode.Event<TreeNode | undefined | null | void>;

  getTreeItem(element: TreeNode): vscode.TreeItem;
  getChildren(element?: TreeNode): Promise<TreeNode[]>;

  /** Force refresh from KnowledgeWorkspaceService + category/document map. */
  refresh(): Promise<void>;
}

type TreeNode = CategoryNode | DocumentNode | EmptyStateNode;
```

**Tests**: sort order (subfolders first, pinned README/AI_CONTEXT); friendly labels; hierarchy preservation.

---

## KnowledgeFileWatcher

```typescript
interface KnowledgeFileWatcher extends vscode.Disposable {
  /** Fires at most once per 300 ms coalesce window. */
  readonly onDidChangeKnowledge: vscode.Event<KnowledgeChangeEvent>;

  /** Replace watcher when workspace root changes. */
  reset(workspace: KnowledgeWorkspace): void;
}

interface KnowledgeChangeEvent {
  kind: 'create' | 'change' | 'delete' | 'rename';
  uris: vscode.Uri[];
}
```

**Tests**: coalesce burst → single event; dispose on deactivate.

---

## SearchIndexService

```typescript
interface SearchIndexService {
  readonly ready: boolean;
  readonly onDidChangeIndex: vscode.Event<void>;

  /** Build or rebuild full index (background-safe). */
  rebuild(documents: KnowledgeDocument[]): Promise<void>;

  /** Upsert/remove single document (incremental). */
  upsert(document: KnowledgeDocument, body: string): void;
  remove(documentId: string): void;

  /** Query with 200 ms debounce applied by caller. */
  search(query: string, limit?: number): SearchResult[];
}
```

**Tests**: fuzzy filename/heading; body substring; case insensitivity; 5 MB truncation; empty query returns []; performance smoke on 300+ fixture files.

---

## MarkdownDocumentService

```typescript
interface MarkdownDocumentService {
  /** Open or reveal rendered Webview for URI. */
  open(
    uri: vscode.Uri,
    options?: { scrollAnchor?: string; lineHint?: number }
  ): Promise<void>;

  /** Re-render all open panels whose URI matches. */
  refreshUri(uri: vscode.Uri): Promise<void>;

  /** Mark panels for deleted URI. */
  handleDeleted(uri: vscode.Uri): void;
}
```

**Tests**: integration — open fixture md → Webview receives `render` message with expected title.

---

## EvidenceLinkResolver

```typescript
interface EvidenceLinkResolver {
  /** Classify token without opening editor. */
  classify(rawToken: string): EvidenceLink;

  /** Resolve and open in editor; show notification on failure. */
  resolveAndOpen(rawToken: string): Promise<void>;

  /** Post-process HTML: inject data-evidence attributes on eligible <code> and <a>. */
  enrichHtml(html: string, workspaceRoot: vscode.Uri): string;
}
```

**Tests**: plain path, `#L` line, `#L-L` range, missing file, `..` rejection, non-code prose not enriched, extension whitelist.

---

## GitFreshnessService

```typescript
interface GitFreshnessService {
  /** Compute current freshness status. */
  evaluate(readmeUri: vscode.Uri | null): Promise<FreshnessStatus>;

  readonly onDidChangeFreshness: vscode.Event<FreshnessStatus>;
}
```

**Tests**: matching HEAD, stale HEAD, missing metadata, malformed metadata, git unavailable (mock).

---

## Shared constants (`src/constants.ts`)

| Constant | Value | Source |
|----------|-------|--------|
| `SEARCH_DEBOUNCE_MS` | 200 | FR-017 |
| `WATCHER_COALESCE_MS` | 300 | FR-029 |
| `MAX_FILE_BYTES` | 5_242_880 (5 MB) | FR-040 |
| `SNIPPET_RADIUS` | 80 | ~160 char window (FR-015) |
| `KNOWLEDGE_DIR` | `knowledge` | spec |
| `PINNED_FILES` | `['README.md', 'AI_CONTEXT.md']` | FR-002 |
| `OUTPUT_CHANNEL_NAME` | `Architecture Explorer` | FR-036 |

---

## Event wiring (composition root)

`extension.ts` MUST wire:

```text
KnowledgeFileWatcher.onDidChangeKnowledge
  → SearchIndexService upsert/remove
  → KnowledgeTreeProvider.refresh()
  → MarkdownDocumentService.refreshUri (if open)
  → GitFreshnessService.evaluate (if README changed)

KnowledgeWorkspaceService.onDidChangeWorkspace
  → reset watcher, rebuild index, refresh tree
```

Disposables registered on extension context subscriptions.
