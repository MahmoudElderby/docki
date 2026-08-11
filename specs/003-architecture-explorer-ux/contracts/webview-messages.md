# Contract: Webview ↔ Extension Host Messages — V2 delta

**Feature**: `003-architecture-explorer-ux`  
**Base**: `specs/001-architecture-explorer/contracts/webview-messages.md`  
**Panel type**: `WebviewPanel` (singleton documentation viewer in V2)

All V1 messages remain valid. This document specifies **behavior changes** and **optional new fields**.

---

## Host → Webview

### `render` (behavior change)

V1 shape preserved. V2 **requires Webview to consume** `theme`:

```typescript
interface RenderMessage {
  type: 'render';
  generation: number;
  title: string;
  html: string;
  mermaidBlocks: MermaidBlock[];
  truncated: boolean;
  truncatedMessage?: string;
  theme: {
    kind: 'light' | 'dark' | 'highContrast' | string; // unknown → fallback
    cssVariables: Record<string, string>;
  };
  scrollAnchor?: string;
  lineHint?: number;
  documentId?: string;
  documentPath?: string;   // V2 optional — repo-relative path for error logging
}
```

**V2 render pipeline** (ordered):

1. If `theme.kind` unrecognized → apply dark Mermaid palette; post `log` warn `unknown theme kind: <value>` once per distinct value (FR-005a).
2. If `theme.kind` changed since last render → `mermaid.initialize()` with mapped config ([research.md](../research.md) §1).
3. Replace `#content` inner HTML with `html`.
4. For each `mermaidBlocks` entry:
   - `sanitized = sanitizeMermaidSource(source, 'normal')`
   - Try `mermaid.render(id, sanitized)`
   - On failure → retry with `sanitizeMermaidSource(source, 'strict')` once (FR-008)
   - On second failure → render error UI (below)
5. `scrollToAnchor(scrollAnchor, lineHint)`.

**Theme-only refresh**: When host re-sends `render` with same `documentId` and updated `theme` only, Webview MUST re-run steps 1–4 without requiring user action (FR-004).

---

## Webview → Host

### `log` (extended usage)

V1 shape unchanged:

```typescript
interface LogMessage {
  type: 'log';
  level: 'info' | 'warn' | 'error';
  message: string;
}
```

**V2 required log events**:

| Condition | level | message pattern |
|-----------|-------|-----------------|
| Unknown theme kind | `warn` | `unknown theme kind: {value}` |
| Mermaid block failure | `error` | `Mermaid render failed: {documentPath} block {id}: {err.message}` |

Host routes to Architecture Explorer Output channel (FR-011). Host SHOULD supply `documentPath` in render payload so Webview can include it; if absent, Webview uses `documentId` basename.

---

## Mermaid error display (SUPERSEDES V1)

On render failure for block `id` after retry exhausted:

```html
<div class="mermaid-error" data-block-id="{id}">
  <p class="mermaid-error-message">{escaped Mermaid error message}</p>
  <pre class="mermaid-error-source">{escaped original author source}</pre>
</div>
```

**Changes from V1**:
- MUST show underlying diagnostic text, not generic "Diagram could not be rendered." alone (FR-010)
- `<pre>` content is **original** `mermaidBlocks[].source` from payload (pre-sanitize)
- Generic fallback text MAY prefix diagnostic if `err.message` empty

**Isolation** (FR-009): Failure MUST NOT abort rendering of subsequent blocks or prevent Markdown body display.

---

## Mermaid initialization (Webview-local)

```typescript
// Called when theme.kind changes or on first render
mermaid.initialize({
  startOnLoad: false,
  securityLevel: 'strict',  // MUST NOT change in V2 (FR-007)
  theme: mappedTheme,       // from mermaidTheme.ts
  themeVariables: mappedVars // optional per kind
});
```

No remote theme assets (FR-003).

---

## Sanitize utility contract (shared module)

Extracted to `src/utils/mermaidSanitize.ts` — callable from Webview bundle and Node unit tests.

```typescript
type SanitizeMode = 'normal' | 'strict';

function sanitizeMermaidSource(source: string, mode: SanitizeMode): string;
```

**Normal mode** (FR-006):
- Replace `/<br\s*\/?>/gi` with `\n`
- Preserve all other characters

**Strict mode** (FR-008 retry):
- Apply normal mode transforms
- Escape or strip remaining HTML-like tags without executing scripts

**Security**: Function MUST NOT decode entities in ways that re-enable script execution. Final safety enforced by Mermaid `securityLevel: 'strict'`.

---

## Theme mapping utility contract

```typescript
type IdeThemeKind = 'light' | 'dark' | 'highContrast';

interface MermaidThemeConfig {
  theme: string;
  themeVariables?: Record<string, string>;
  isFallback: boolean;
}

function resolveMermaidTheme(kind: string | undefined): MermaidThemeConfig;
```

Unknown/missing `kind` → `{ theme: 'dark', isFallback: true }` (FR-005a).

---

## CSP and resource loading (unchanged)

V1 CSP rules apply unchanged. V2 adds no new external resources.

---

## Single panel implication

Only one Webview instance receives `render` messages for tree/search navigation at a time. Host MUST NOT post concurrent `render` messages to multiple Architecture Explorer documentation panels (FR-012).
