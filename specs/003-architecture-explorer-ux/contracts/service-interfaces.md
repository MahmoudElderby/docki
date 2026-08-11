# Contract: Internal Service Interfaces — V2 delta

**Feature**: `003-architecture-explorer-ux`  
**Base**: `specs/001-architecture-explorer/contracts/service-interfaces.md`  
**Date**: 2026-08-11

Documents **changed or new** internal TypeScript service surfaces. Unlisted V1 interfaces remain unchanged.

---

## MarkdownDocumentService (CHANGED)

**File**: `src/services/MarkdownDocumentService.ts`

### V1 surface (retained)

```typescript
class MarkdownDocumentService {
  constructor(
    evidenceResolver: EvidenceLinkResolver,
    getWorkspaceRoot: () => vscode.Uri | undefined,
    extensionUri: vscode.Uri
  );

  open(uri: vscode.Uri, options?: OpenDocumentOptions): Promise<void>;
  refreshUri(uri: vscode.Uri): Promise<void>;
  handleDeleted(uri: vscode.Uri): void;
  openRaw(uri: vscode.Uri): Promise<void>;
}

interface OpenDocumentOptions {
  scrollAnchor?: string;
  lineHint?: number;
}
```

### V2 lifecycle change

**Removed**: `private panels = new Map<string, DocumentationPanel>()`

**Added**:
```typescript
private activePanel: DocumentationPanel | undefined;
private activeUri: vscode.Uri | undefined;
private themeChangeDisposable: vscode.Disposable | undefined;
```

### Semantics

| Method | V2 behavior |
|--------|-------------|
| `open(uri, opts?)` | If no `activePanel`, create one. Set `activeUri = uri`. Render and reveal. Subsequent calls reuse same panel (FR-013). |
| `refreshUri(uri)` | Re-render only if `uri.toString() === activeUri?.toString()`. |
| `handleDeleted(uri)` | Notify panel only if matches `activeUri`. |
| `openRaw(uri)` | Unchanged — opens standard editor (FR-015). |
| `dispose()` (NEW) | Dispose theme listener; dispose active panel if any. Called from extension deactivate/reload. |

### Theme change subscription (NEW)

On construction or first panel open, register:

```typescript
vscode.window.onDidChangeActiveColorTheme(() => {
  if (this.activePanel && this.activePanel.isVisible() && this.activeUri) {
    void this.renderPanel(this.activePanel, this.activeUri); // no scroll options
  }
});
```

### Render payload extension

`renderPanel` MUST include optional `documentPath` (repo-relative from `/knowledge`) for Webview error logging.

---

## DocumentationPanel (MINOR CHANGE)

**File**: `src/webview/DocumentationPanel.ts`

### Added methods

```typescript
isVisible(): boolean;  // delegates to this.panel.visible
```

**Note**: The service owns `activeUri` (authoritative current document). The panel is not recreated on navigation; `openRaw` and error logging use `documentId` / `documentPath` from the latest `RenderPayload`. Do not add `getCurrentUri()` on the panel — callers use `MarkdownDocumentService`'s private `activeUri` or the render payload fields.

### Unchanged

- `postRender(payload: RenderPayload)`
- `postDocumentMissing`, `postError`
- `onDidDispose` event
- CSP HTML shell generation

---

## Extension activate / reload (NEW)

**File**: `src/extension.ts`

### Extracted registration function

```typescript
interface ExtensionServices {
  workspaceService: KnowledgeWorkspaceService;
  treeProvider: KnowledgeTreeProvider;
  searchIndex: SearchIndexService;
  markdownService: MarkdownDocumentService;
  freshnessService: GitFreshnessService;
  fileWatcher: KnowledgeFileWatcher;
  searchQuickPick: SearchQuickPick;
}

async function registerArchitectureExplorer(
  context: vscode.ExtensionContext
): Promise<{ services: ExtensionServices; treeView: vscode.TreeView<unknown> }>;
```

**Ordering requirements** (FR-025):
1. Instantiate services (sync)
2. `createTreeView(VIEW_KNOWLEDGE_TREE, { treeDataProvider, showCollapseAll: true })` (sync)
3. Register all commands including `COMMAND_RELOAD` (sync)
4. `await refreshAll()` (async)
5. Wire watchers and subscriptions

### Reload handler

```typescript
vscode.commands.registerCommand(COMMAND_RELOAD, async () => {
  try {
    // dispose treeView, re-call register or partial re-register
    // showInformationMessage on success
    // log to Output channel
  } catch (err) {
    // showErrorMessage
    // log failing step + err.message
  }
});
```

**Invariants** (FR-028):
- MUST NOT leave two `TreeView` instances registered
- MUST NOT duplicate `activePanel` Webview
- MAY re-render open panel content after reload

---

## SearchQuickPick (UNCHANGED interface)

**File**: `src/webview/SearchQuickPick.ts`

```typescript
class SearchQuickPick {
  show(): void;
}
```

V2 benefits from single-panel `markdownService.open()` automatically. No API change required (A9).

---

## New pure utilities (NEW)

### mermaidTheme.ts

```typescript
export function resolveMermaidTheme(
  kind: string | undefined
): { theme: string; themeVariables?: Record<string, string>; isFallback: boolean };
```

### mermaidSanitize.ts

```typescript
export type SanitizeMode = 'normal' | 'strict';

export function sanitizeMermaidSource(source: string, mode: SanitizeMode): string;
```

Both MUST be importable from Node unit tests without VS Code API.

---

## Output channel logging (extended conventions)

**File**: `src/output.ts`

| Event | Function | Example |
|-------|----------|---------|
| Activation start | `logInfo` | `Architecture Explorer activating…` |
| Activation failure | `logError` | `[activation] treeRegistration failed: …` |
| Reload success | `logInfo` | `[reload] succeeded at ISO timestamp` |
| Reload failure | `logError` | `[reload] indexRebuild failed: …` |
| Mermaid failure | `logError` | `[webview] Mermaid render failed: path block id: msg` |
| Unknown theme | `logWarn` | `[webview] unknown theme kind: xyz` |

No telemetry sinks (FR-029).

---

## KnowledgeTreeProvider (UNCHANGED)

No interface changes. Reload may call `treeProvider.reload()` after re-registration.

---

## Test contracts (Principle IV)

| Interface | Minimum unit test coverage |
|-----------|---------------------------|
| `resolveMermaidTheme` | all kinds + unknown |
| `sanitizeMermaidSource` | br variants, strict retry path |
| `MarkdownDocumentService.open` | singleton reuse mocked |
| `package.json` contributes | view/title references `architectureExplorer.search` |

Integration tests optional for Reload; manual quickstart covers SC-007.
