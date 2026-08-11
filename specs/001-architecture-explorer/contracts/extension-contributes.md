# Contract: Extension Manifest (`package.json` contributes)

**Feature**: `001-architecture-explorer`  
**Version**: V1 draft

This contract defines the public VS Code extension surface — commands, views, activation events, and configuration. All command IDs use the `architectureExplorer.*` namespace (FR-034).

---

## Engine

```json
{
  "engines": {
    "vscode": "^1.85.0"
  }
}
```

---

## Activation events

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

Lazy activation — extension loads when the user opens the view or invokes a command.

---

## Commands

| Command ID | Title | Handler responsibility |
|------------|-------|------------------------|
| `architectureExplorer.open` | Architecture Explorer: Open | Focus Activity Bar container + tree view |
| `architectureExplorer.refresh` | Architecture Explorer: Refresh | Force filesystem rescan, index rebuild, freshness re-check |
| `architectureExplorer.search` | Architecture Explorer: Search | Open search QuickPick (show "indexing…" if index not ready) |
| `architectureExplorer.openAiContext` | Architecture Explorer: Open AI Context | Open `knowledge/AI_CONTEXT.md` in rendered Webview (or empty state) |
| `architectureExplorer.openReadme` | Architecture Explorer: Open Knowledge README | Open `knowledge/README.md` in rendered Webview |
| `architectureExplorer.openRaw` | Architecture Explorer: Open Raw Markdown | Internal — open source URI in text editor (used from Webview banner) |

**V1**: No default `keybindings` contribution (FR-034).

---

## Views

```json
{
  "viewsContainers": {
    "activitybar": [
      {
        "id": "architectureExplorer",
        "title": "Architecture",
        "icon": "media/architecture.svg"
      }
    ]
  },
  "views": {
    "architectureExplorer": [
      {
        "id": "architectureExplorer.knowledgeTree",
        "name": "Explorer",
        "when": "workspaceFolderCount > 0"
      }
    ]
  }
}
```

### Tree view title template

Set programmatically via `TreeView.title`:

```text
{freshnessBadge}  ({workspaceRootLabel})
```

Where `freshnessBadge` is one of: `✅ Up to date`, `⚠ May be stale`, `? Unknown`.

---

## Configuration (V1)

No user-facing settings in V1 — all behavioral constants live in `src/constants.ts` (debounce intervals, size limits). Future settings (e.g. fuzzy threshold) deferred.

---

## Output channel

| Channel name | Purpose |
|--------------|---------|
| `Architecture Explorer` | Info/warn/error diagnostics; chosen workspace root log; index timing |

Created once on activate via `vscode.window.createOutputChannel('Architecture Explorer')`.

---

## Categories

```json
{
  "categories": ["Other"]
}
```

---

## Main entry

```json
{
  "main": "./dist/extension.js"
}
```

Bundled by esbuild from `src/extension.ts`.
