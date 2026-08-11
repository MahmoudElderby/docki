# Contract: Webview ↔ Extension Host Messages

**Feature**: `001-architecture-explorer`  
**Panel type**: `WebviewPanel` (on-demand documentation viewer)

All messages are JSON objects with a required `type` string discriminator. Unknown message types MUST be ignored.

---

## Host → Webview

Sent via `panel.webview.postMessage(payload)`.

### `render`

Push parsed document content to the Webview.

```typescript
interface RenderMessage {
  type: 'render';
  generation: number;          // matches RenderedDocumentView.renderGeneration
  title: string;               // displayName
  html: string;                // sanitized markdown-it output (body inner HTML)
  mermaidBlocks: MermaidBlock[];
  truncated: boolean;
  truncatedMessage?: string;   // shown when truncated === true
  theme: {
    kind: 'light' | 'dark' | 'highContrast';
    cssVariables: Record<string, string>; // VS Code theme vars
  };
  scrollAnchor?: string;       // heading slug to scroll into view (heading/filename matches)
  lineHint?: number;           // 1-based line for body-match scroll (FR-016)
}

interface MermaidBlock {
  id: string;                  // unique within document
  source: string;              // raw mermaid source
}
```

**Behavior**: Webview replaces `#content` inner HTML, renders each `mermaidBlocks` entry sequentially, applies theme CSS variables, scrolls to `scrollAnchor` if present, otherwise scrolls to approximate `lineHint` for body matches where practical.

---

### `documentMissing`

File was deleted or became unreadable.

```typescript
interface DocumentMissingMessage {
  type: 'documentMissing';
  path: string;                // relative path for display
}
```

---

### `error`

Non-fatal render error.

```typescript
interface ErrorMessage {
  type: 'error';
  message: string;             // user-safe text
}
```

---

## Webview → Host

Sent via `vscode.postMessage(payload)` from the Webview script.

### `ready`

Webview script loaded and listeners attached.

```typescript
interface ReadyMessage {
  type: 'ready';
}
```

Host MAY re-send latest `render` payload on `ready` if panel was preserved across hide/show.

---

### `openEvidence`

User clicked an evidence link.

```typescript
interface OpenEvidenceMessage {
  type: 'openEvidence';
  rawToken: string;            // original path token including optional #L suffix
}
```

**Host handler**: delegate to `EvidenceLinkResolver.resolveAndOpen(rawToken)`.

Outcomes (host-side, not Webview messages):
- Success → `vscode.window.showTextDocument` with selection
- Missing → `vscode.window.showWarningMessage('File not found: …')`
- Rejected → `vscode.window.showWarningMessage('Path rejected: …')`

---

### `openRaw`

User clicked "open raw" from truncated banner.

```typescript
interface OpenRawMessage {
  type: 'openRaw';
  documentId: string;
}
```

**Host handler**: execute `architectureExplorer.openRaw` with resolved URI.

---

### `log`

Webview-side diagnostic (routed to Output channel).

```typescript
interface LogMessage {
  type: 'log';
  level: 'info' | 'warn' | 'error';
  message: string;
}
```

---

## CSP and resource loading

| Resource | Mechanism |
|----------|-----------|
| Webview script | `asWebviewUri(dist/webview/panel.js)` with nonce |
| Webview CSS | inline + `panel.css` via `asWebviewUri` |
| Images in Markdown | rewrite `src` to `asWebviewUri` only when file resolves under workspace `/knowledge` |
| Remote / out-of-root images | not fetched (`img-src` allows only `${cspSource}`); render alt-text fallback (FR-037, SC-007) |

---

## Mermaid error display (Webview-local)

On render failure for block `id`:

```html
<div class="mermaid-error" data-block-id="{id}">
  <p>Diagram could not be rendered.</p>
  <pre>{escaped source}</pre>
</div>
```

Does not post messages to host unless `log` level `warn` is emitted.
