# Contract: Extension Manifest (`package.json` contributes) — V2 delta

**Feature**: `003-architecture-explorer-ux`  
**Base**: `specs/001-architecture-explorer/contracts/extension-contributes.md`  
**Version**: V2 delta over V1

This document defines **additions and changes** to the public VS Code extension surface. Unlisted V1 entries remain unchanged.

---

## Version bump

```json
{
  "version": "0.2.0"
}
```

Patch/minor per team convention; V2 ships as updated side-load `.vsix` (A11).

---

## New command

| Command ID | Title | Handler responsibility |
|------------|-------|------------------------|
| `architectureExplorer.reload` | Architecture Explorer: Reload | Re-register tree data provider and re-initialise supporting services (workspace, index, freshness, watcher bindings) without IDE restart |

**Feedback contract** (FR-027, A17):
- Success → `vscode.window.showInformationMessage` with short summary
- Failure → `vscode.window.showErrorMessage` with short summary
- Both → timestamped line in Architecture Explorer Output channel
- MUST NOT use modal dialog

---

## New constant

```typescript
export const COMMAND_RELOAD = 'architectureExplorer.reload';
```

---

## Activation events (unchanged list; behavior hardened)

V1 activation events remain:

```json
{
  "activationEvents": [
    "onView:architectureExplorer.knowledgeTree",
    "onCommand:architectureExplorer.open",
    "onCommand:architectureExplorer.refresh",
    "onCommand:architectureExplorer.search",
    "onCommand:architectureExplorer.openAiContext",
    "onCommand:architectureExplorer.openReadme"
  ]
}
```

**V2 behavior change** (not manifest): `activate()` MUST call `createTreeView` synchronously before first `await` (FR-025). Optional future addition `"onCommand:architectureExplorer.reload"` if lazy-activation edge case requires it — not in V2 initial manifest unless implement discovers necessity.

---

## Menus — view/title Search (NEW)

```json
{
  "menus": {
    "view/title": [
      {
        "command": "architectureExplorer.search",
        "when": "view == architectureExplorer.knowledgeTree",
        "group": "navigation@1",
        "icon": "$(search)"
      }
    ]
  }
}
```

**Requirements** (FR-018, A15):
- Reuses existing `architectureExplorer.search` command — no duplicate handler
- Icon `$(search)` — standard VS Code search codicon
- Accessible label = command title ("Architecture Explorer: Search")
- Native `view/title` keyboard focus/activation — no custom keybinding

**Coexistence**: Must not remove or hide existing title-bar behaviors (`showCollapseAll: true`, dynamic freshness in `treeView.title`, refresh command if contributed separately).

---

## Commands block addition

Add to `contributes.commands`:

```json
{
  "command": "architectureExplorer.reload",
  "title": "Architecture Explorer: Reload",
  "category": "Architecture Explorer"
}
```

---

## Configuration (unchanged)

`architectureExplorer.autoOpenPanelOnKnowledgeFile` — unchanged from V1.

---

## Views (unchanged)

`architectureExplorer.knowledgeTree` view id unchanged.

---

## Compatibility

| Consumer | Impact |
|----------|--------|
| Command Palette | + Reload command |
| Tree view title bar | + Search icon |
| Keybindings | None added (FR-018, A15) |
| V1 scripts/CI | Same `npm test`, `npm run package` |
