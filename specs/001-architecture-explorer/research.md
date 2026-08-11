# Research: Architecture Explorer IDE Extension

**Feature**: `001-architecture-explorer`  
**Date**: 2026-08-11  
**Status**: Complete — all technical unknowns resolved

## 1. Extension scaffold and repository placement

**Decision**: Create `Tools/ArchitectureExplorer/` as a self-contained npm package using the standard VS Code extension layout (`src/extension.ts`, `package.json` contributes, esbuild bundling).

**Rationale**: The MTN monorepo already hosts standalone tooling under `Tools/` (e.g. `Tools/YallaCardRequest/`). Placing the extension there avoids coupling to any of the 15 .NET services and keeps CI/build independent.

**Alternatives considered**:
- Root-level `architecture-explorer/` — rejected; inconsistent with existing `Tools/` convention.
- Yeoman `generator-code` output verbatim — rejected; generator webpack defaults are heavier than needed; manual scaffold with esbuild is simpler and matches YAGNI (Constitution III).

---

## 2. Markdown rendering pipeline

**Decision**: Parse Markdown in the **extension host** with `markdown-it` (default preset, `html: false` for raw HTML blocks, `linkify: false` to prevent auto-linkification of prose). Post sanitized HTML string to the Webview. Enable `markdown-it-anchor` (or equivalent slugifier) for stable heading IDs to support search scroll-to-match.

**Rationale**: Host-side parsing keeps the Webview CSP minimal (no eval, no remote scripts). Evidence-link injection happens **after** markdown-it render by walking inline `<code>` tokens and anchor `href` attributes — matching FR-019 scope (backticks and Markdown link URLs only).

**Alternatives considered**:
- Render entirely in Webview with a client-side MD library — rejected; harder to enforce evidence rules and file-size truncation before transfer.
- `marked` — viable but markdown-it plugin ecosystem and token walk for evidence links is cleaner.

---

## 3. Mermaid rendering and safety

**Decision**: Bundle `mermaid` in the Webview bundle. Initialize with:

```typescript
mermaid.initialize({
  startOnLoad: false,
  securityLevel: 'strict',
  theme: 'base', // overridden via CSS variables mapped from VS Code theme
});
```

Render each fenced `mermaid` block asynchronously in the Webview; on failure, replace diagram container with diagnostic text + escaped source (FR-012).

**Rationale**: Mermaid's `strict` security level disables script execution and limits HTML in labels. Running inside an isolated Webview with a nonce-based CSP satisfies FR-013 and FR-039.

**Alternatives considered**:
- Pre-render SVG in extension host — rejected; Mermaid API is browser-oriented; duplicating renderer in Node adds complexity.
- External Mermaid Live Editor / CDN — rejected; violates zero-network constraint.

---

## 4. Search indexing strategy

**Decision**: Hybrid local index:
- **Filenames + heading list** → Fuse.js index (`threshold: 0.4`, `ignoreLocation: true`, case-insensitive via normalized keys).
- **Body content** → plain lowercase substring scan over indexed text (same 5 MB head window as rendering).
- **Debounce**: 200 ms on QuickPick input (FR-017).
- **Initial build**: async on activate; search command shows "indexing…" until `SearchIndexService.ready` (FR-017).

**Rationale**: Fuse.js matches the user's explicit stack preference and handles fuzzy filename/heading ranking well. Full-text fuzzy over entire bodies at 500-file scale is unnecessary and slower than substring for the spec's use case (FR-014).

**Alternatives considered**:
- MiniSearch / Lunr — viable; Fuse chosen per user direction.
- Ripgrep spawn — rejected; spawns processes per query, harder to debounce/incremental update, no advantage at ≤500 files.

---

## 5. Filesystem watching and index coalescing

**Decision**: `vscode.workspace.createFileSystemWatcher('**/knowledge/**/*.md')` scoped to the active workspace root, plus manual refresh command. Coalesce events in a 300 ms trailing timer; emit at most one `onDidChangeKnowledge` per window (FR-029).

**Rationale**: Built-in watcher integrates with VS Code's file event pipeline and respects workspace boundaries. Trailing debounce handles `git checkout` bursts without N full rebuilds.

**Alternatives considered**:
- `chokidar` direct — rejected; duplicates VS Code watcher; extra dependency.
- Per-event full rebuild — rejected; violates FR-041.

---

## 6. Git freshness detection

**Decision**: Two-tier approach:
1. **Parse** `knowledge/README.md` for `Last analyzed commit` supporting both table row (`| Last analyzed commit | \`sha\` |`) and plain line forms (case-insensitive, whitespace-tolerant).
2. **Resolve HEAD** via `vscode.extensions.getExtension('vscode.git')` → `GitExtension.getAPI(1).repositories[0].state.HEAD?.commit` when available.
3. **Distance** via read-only `git rev-list --count <analyzed>..HEAD` in workspace root (FR-025, FR-027); omit count on failure.

**Rationale**: Using the built-in Git extension avoids requiring Git on PATH when VS Code already has a repo open. Subprocess fallback covers headless/unit-test scenarios.

**Alternatives considered**:
- `simple-git` npm package — rejected; unnecessary dependency for two read-only commands.
- Modify README on stale detection — rejected; violates FR-042 and viewer-only scope.

---

## 7. Evidence link resolution

**Decision**: Regex-validated repo-relative paths:

```text
^[\w./-]+\.(cs|csproj|json|yaml|yml|md|ts|tsx|js|jsx|sql|xml|config|props|sln|cshtml|razor|html|css|scss|ps1|sh|dockerfile|env)(#L\d+(-L\d+)?)?$
```

(case-insensitive extension check; extensible list in `constants.ts`). Resolve with `path.join(workspaceRoot, token)`, `fs.realpath` symlink check, reject if resolved path escapes root (FR-023).

**Rationale**: Aligns with autopilot assumption #1 and FR-019/FR-022. Only `<code>` spans and link `href`s are post-processed — never bare prose.

**Alternatives considered**:
- Linkify all backtick spans — rejected; FR-022 requires workspace file existence check before rendering as link.

---

## 8. Webview security (CSP)

**Decision**: Webview panel options:

```typescript
{
  enableScripts: true,
  enableCommandUris: false,
  localResourceRoots: [extensionUri], // workspace images via webview.asWebviewUri
}
```

CSP meta tag: `default-src 'none'; style-src ${cspSource} 'unsafe-inline'; script-src 'nonce-${nonce}'; img-src ${cspSource};` — no `https:`, no `connect-src` (no remote fetch). Workspace-local Markdown images are rewritten to `asWebviewUri` only when the resolved file is under the active workspace's `/knowledge` tree; all other `src` values (remote URLs, out-of-root paths) render alt-text fallback without network I/O (FR-037, SC-007).

**Rationale**: Standard VS Code Webview hardening pattern. `unsafe-inline` for styles required for theme variable injection; scripts nonce-gated only.

**Alternatives considered**:
- `enableCommandUris: true` — rejected; not needed; reduces attack surface.

---

## 9. Testing stack

**Decision**:
- **Unit tests**: Mocha + Node test runner for pure modules (`EvidenceLinkResolver`, `SearchIndexService` indexing logic, `freshnessParser`, tree sort, snippet builder).
- **Integration**: `@vscode/test-electron` opens Extension Development Host, activates extension against `test/fixtures/sample-knowledge/`, asserts tree items + Webview HTML contains expected heading.

**Rationale**: Satisfies Constitution Principle IV and autopilot assumption #18 without requiring StoreCloud service test infrastructure.

**Alternatives considered**:
- Jest — viable; Mocha is the VS Code extension ecosystem default and pairs cleanly with `@vscode/test-electron`.
- Manual-only testing — rejected; spec mandates automated coverage per user story.

---

## 10. Build and packaging

**Decision**: `esbuild` produces:
- `dist/extension.js` — extension host (CJS, external `vscode`)
- `dist/webview/panel.js` — Webview bundle (IIFE, includes mermaid)

Package with `@vscode/vsce` → `architecture-explorer-*.vsix`. `engines.vscode: ^1.85.0`.

**Rationale**: Fast builds, single dependency, no webpack config overhead. Matches V1 side-load distribution (autopilot assumption #15).

**Alternatives considered**:
- webpack via generator-code — rejected; slower, more config for no V1 benefit.
- tsup — viable; esbuild chosen for direct control over dual entry points.

---

## 11. UI surfaces

**Decision**:
- **Activity Bar** container `architectureExplorer` with TreeView `knowledgeTree`.
- **Tree title** shows freshness badge + active workspace root path segment.
- **Documentation** via `WebviewPanel` (column One/Beside, preserve focus).
- **Search** via `QuickPick` (built-in fuzzy filter disabled; custom results from `SearchIndexService`).
- **Diagnostics** via dedicated Output channel `Architecture Explorer`.

**Rationale**: Uses standard VS Code UX primitives (spec UX principles). Avoids heavy custom web app inside sidebar.

**Alternatives considered**:
- CustomTextEditor for `.md` — rejected in spec clarification (assumption #2).
- Webview in sidebar — rejected; tree stays native; reading surface deserves full panel width.

---

## 12. Large file handling

**Decision**: 5 MB byte-size ceiling per file. Beyond ceiling: index and render first 5 MB only; Webview shows banner with command link to open raw file in editor.

**Rationale**: Autopilot assumption #11; prevents UI freeze on accidentally committed large artifacts under `/knowledge`.

**Alternatives considered**:
- Streamed rendering — rejected; disproportionate complexity for V1.

---

## Resolved clarifications

No `[NEEDS CLARIFICATION]` markers remain in Technical Context. All quantitative defaults (200 ms, 300 ms, 5 MB, 160-char snippets) are accepted from spec/autopilot-assumptions without override.
