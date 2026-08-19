# Docki Explorer

VS Code / Cursor extension that browses a repository's `/knowledge` folder.

## Features

- Activity bar **Docki** view with hierarchical knowledge tree
- Markdown rendering with **local Mermaid** (no network)
- Fuzzy + substring search across filenames, headings, and body text
- Evidence links open source files at optional `#L` / `#L-L` ranges
- Freshness badge vs `Last analyzed commit` in `knowledge/README.md`
- Live reload when knowledge files change

## Install

From a Docki checkout:

```bash
npx docki-cli install-explorer
```

Or manually:

```bash
cd packages/explorer
npm install
npm run package
cursor --install-extension docki-explorer-*.vsix
# or: code --install-extension docki-explorer-*.vsix
```

## Develop

```bash
cd packages/explorer
npm install
npm run compile
# Press F5 in VS Code/Cursor with this folder open (Extension Development Host)
npm test
```

## Commands

| Command | Action |
|---------|--------|
| Docki Explorer: Open | Open / focus the explorer |
| Docki Explorer: Search | QuickPick search |
| Docki Explorer: Refresh | Rebuild index / refresh tree |
| Docki Explorer: Open AI Context | Open `knowledge/AI_CONTEXT.md` |
| Docki Explorer: Open Knowledge README | Open `knowledge/README.md` |
| Docki Explorer: Open Raw Markdown | Open current doc as text |
| Docki Explorer: Reload | Full extension reload |

## Contract

The extension looks for a folder named **`knowledge`** at the workspace root (first folder that contains it in multi-root workspaces). It does not generate or modify knowledge content.
