# Research: Architecture Explorer UX + Mermaid Reliability (V2)

**Feature**: `003-architecture-explorer-ux`  
**Date**: 2026-08-11  
**Status**: Complete — all V2 technical unknowns resolved

This document resolves implementation choices for the incremental V2 update. V1 decisions in `specs/001-architecture-explorer/research.md` remain in force unless explicitly superseded below.

---

## 1. Mermaid theme mapping for IDE color themes

**Decision**: Map render payload `theme.kind` to Mermaid initialization using built-in theme name plus optional `themeVariables` overrides. Re-call `mermaid.initialize()` whenever the kind changes (including between consecutive renders).

| IDE `theme.kind` | Mermaid `theme` | Notes |
|------------------|-----------------|-------|
| `light` | `default` | Light backgrounds, dark text/connectors |
| `dark` | `dark` | Light text on dark diagram surfaces |
| `highContrast` | `dark` + high-contrast `themeVariables` | Elevated line/text contrast (`primaryTextColor`, `lineColor`, `noteTextColor`, etc.) |
| missing / unknown | `dark` | FR-005a fallback; log once per unknown value to Output channel |

**Rationale**: V1 already forwards `theme.kind` from `MarkdownDocumentService.getTheme()` (`OBSERVED` in `DocumentationPanel.ts` RenderPayload) but Webview hardcodes `theme: 'neutral'` (`OBSERVED` in `panel.ts:25-29`). Mermaid 11 built-in themes are bundled locally (FR-003). Explicit `themeVariables` on `base`/`dark` themes is the minimal path to WCAG AA for sequence-diagram labels without remote assets.

**Alternatives considered**:
- CSS-only overrides on SVG output — rejected; Mermaid internal fill/stroke colors are set at render time and override is fragile across diagram types.
- Single `neutral` theme for all IDE themes — rejected; root cause of Bug A.
- Per-diagram D3 color picking from VS Code CSS variables — rejected; Mermaid API does not expose stable hooks; adds complexity beyond A2 scope.

---

## 2. Theme change re-render signal

**Decision**: Extension host subscribes to `vscode.window.onDidChangeActiveColorTheme`. When the single active documentation panel exists and is visible (`WebviewPanel.visible === true`), re-invoke `renderPanel` for the current document URI with unchanged scroll options suppressed (no forced scroll on theme-only refresh).

When the panel is hidden (`retainContextWhenHidden: true`), skip immediate re-render; next `reveal()` or `open()` posts a fresh render payload with updated theme (FR-004, A13).

**Rationale**: Host already owns theme kind computation and file read path. Re-posting full `render` message reuses existing Webview pipeline and triggers Mermaid re-init in `handleRender`. No polling required.

**Alternatives considered**:
- Webview-only theme listener — not available; Webview cannot access VS Code theme API directly.
- Partial Mermaid re-render without HTML replace — rejected; theme change requires `mermaid.initialize()` before re-render of all blocks.

---

## 3. Mermaid HTML line-break preprocessing

**Decision**: Extract pure function `sanitizeMermaidSource(source: string, mode: 'normal' | 'strict'): string` in `src/utils/mermaidSanitize.ts`:

1. **Normal mode** (first attempt): replace case-insensitive `<br>`, `<br/>`, `<br />` with newline `\n`; preserve all other content byte-for-byte except normalised line endings unchanged.
2. **Strict mode** (retry after render failure): additionally strip or HTML-escape remaining angle-bracket tags (`/<[^>]+>/g` → escaped text or removal of tag delimiters only, preserving inner text).

Render flow in Webview:
```
sanitized = sanitize(source, 'normal')
try render(sanitized)
catch → sanitized2 = sanitize(source, 'strict'); try render(sanitized2)
catch → show diagnostic + original source
```

Keep `securityLevel: 'strict'` and `htmlLabels: false` (Mermaid default under strict).

**Rationale**: Mermaid strict mode rejects HTML in notes (`INFERRED`, high confidence — matches Bug B with `firebase-fcm.md`). Normalising `<br>` to `\n` is the minimal fix for the known corpus pattern (A3). Extracting to host-testable util satisfies FR-032 without weakening A4.

**Alternatives considered**:
- Lower `securityLevel` to `loose` or `antiscript` — rejected; violates FR-007 and A4.
- Host-side preprocess before postMessage — viable for tests but duplicates Webview render path; **hybrid**: util lives in shared module imported by Webview bundle and unit-tested in Node.
- Rewrite `/knowledge` sources — rejected by FR-030 and spec non-goals.

---

## 4. Mermaid error diagnostics and logging

**Decision**: On render failure, Webview displays:
```html
<div class="mermaid-error">
  <p class="mermaid-error-message">{escaped err.message}</p>
  <pre>{escaped original source}</pre>
</div>
```

Webview posts to host:
```typescript
{ type: 'log', level: 'error', message: `Mermaid render failed: ${documentPath} block ${id}: ${err.message}` }
```

Host enriches `documentPath` from current panel URI (already known in `MarkdownDocumentService`).

**Rationale**: Replaces generic "Diagram could not be rendered." (FR-010, FR-011). Original source shown is pre-sanitize author source from payload (not post-sanitize), so developer sees file-accurate content.

**Alternatives considered**:
- Show sanitized source on failure — rejected; obscures authoring problem.
- Silent per-block failure — rejected by FR-011.

---

## 5. Single documentation panel lifecycle

**Decision**: Refactor `MarkdownDocumentService`:

```typescript
private activePanel: DocumentationPanel | undefined;
private activeUri: vscode.Uri | undefined;

async open(uri, options?) {
  if (!this.activePanel) {
    this.activePanel = new DocumentationPanel(...);
    this.activePanel.onDidDispose(() => { this.activePanel = undefined; this.activeUri = undefined; });
  }
  this.activeUri = uri;
  await this.renderPanel(this.activePanel, uri, options);
  this.activePanel.reveal();
}
```

Remove `Map<string, DocumentationPanel>`. `refreshUri(uri)` re-renders only when `uri === activeUri`. `handleDeleted(uri)` notifies panel only when `uri === activeUri`.

`DocumentationPanel` constructor URI is initial only; panel identity is stable — no second WebviewPanel per navigation.

**Rationale**: Directly addresses observed V1 `Map` stacking (inbox + `MarkdownDocumentService.ts:12-38`). Matches FR-012–FR-017. Dragging panel to another editor group preserves singleton because VS Code moves the same `WebviewPanel` instance.

**Alternatives considered**:
- `WebviewPanel.reveal` + dispose old panels on each open — rejected; leaves tab clutter until dispose; fails FR-012.
- Singleton via static class property on `DocumentationPanel` — rejected; service-owned lifecycle is clearer for Reload and tests.

---

## 6. Tree view title-bar Search contribution

**Decision**: Add `menus.view/title` entry in `package.json`:

```json
{
  "command": "architectureExplorer.search",
  "when": "view == architectureExplorer.knowledgeTree",
  "group": "navigation@1",
  "icon": "$(search)"
}
```

No new command ID — title action invokes existing `architectureExplorer.search` handler (FR-019, FR-024, A9).

**Rationale**: Standard VS Code pattern (`OBSERVED` in VS Code docs and common extensions). Native keyboard accessibility via `view/title` (A15, AC1). `group: navigation@1` places search near existing collapse-all without displacing freshness title text (dynamic `treeView.title`).

**Alternatives considered**:
- Custom Webview toolbar — rejected; non-goal per spec.
- Duplicate command alias — rejected; unnecessary surface duplication.

---

## 7. Tree data provider registration and Reload recovery

**Decision**:

1. **Activation structure**: Wrap `activate()` body in try/catch. First synchronous steps:
   - Create services (no await)
   - `createTreeView(VIEW_KNOWLEDGE_TREE, { treeDataProvider })` — before any `await`
   - Register commands including new `architectureExplorer.reload`
   - Then `await refreshAll()`

2. **Reload command** (`Architecture Explorer: Reload`):
   - Dispose existing `TreeView` if present
   - Re-run workspace refresh, index rebuild, freshness evaluate
   - Re-create tree view with same provider instance or fresh provider
   - Show `vscode.window.showInformationMessage('Architecture Explorer reloaded.')` on success; `showErrorMessage` on failure (A17, AC3)
   - Log timestamped outcome to Output channel (FR-027)

3. **Optional hardening**: Add activation event `"onStartupFinished"` so extension activates earlier in workspaces containing `/knowledge` — **deferred**; FR-025 satisfied by synchronous registration within existing `onView` activation. Reload provides manual recovery without IDE restart (SC-007).

**Rationale**: "No data provider registered" typically indicates extension activation failed or tree view created before provider attachment (`INFERRED` from user report). Synchronous registration + Reload is minimal cost (A10). Non-modal notification matches V1 ergonomics (AC3).

**Alternatives considered**:
- Require IDE restart — rejected by FR-027.
- `"*"` activation — rejected; eager activation of all workspaces violates local-first lightweight posture unless reproduction proves necessary.
- Modal error on activation failure — rejected by FR-026 and A17.

---

## 8. Unknown theme kind logging

**Decision**: When Webview receives `theme.kind` outside the recognised union, apply dark fallback and post single log line per session value:

```
{ type: 'log', level: 'warn', message: 'unknown theme kind: <value>' }
```

Host deduplicates identical unknown values within activation session to avoid log spam (implementation detail; not user-visible).

**Rationale**: AC2 / FR-005a. Dark palette safest default (A16).

---

## 9. Test strategy mapping

**Decision**: Add unit tests:

| Test file | Covers |
|-----------|--------|
| `mermaidTheme.test.ts` | kind → config mapping; unknown → dark; highContrast variables present |
| `mermaidSanitize.test.ts` | all `<br>` variants; CRLF preservation; script tags unchanged in source but strict mode escapes |
| `markdownDocumentService.test.ts` | second `open()` reuses panel mock; dispose clears singleton |

Integration/manual scenarios documented in [quickstart.md](./quickstart.md) for WCAG visual check and live IDE theme toggle (SC-001, SC-006). Per FR-032 / SC-008, visual-legibility acceptance scenarios (US1 scenarios 1–4) and live-IDE chrome checks (US4 keyboard focus, US5 cold-install tree populate) use quickstart manual matrix; logic scenarios use the automated suites above.

---

## Superseded V1 research notes

- V1 research §3 suggested `theme: 'base'` overridden via CSS variables — **superseded** by explicit kind→theme mapping with `themeVariables` (this document §1).
- V1 Mermaid error display contract — **superseded** by §4 diagnostic message requirement in [contracts/webview-messages.md](./contracts/webview-messages.md).
