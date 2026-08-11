# Quickstart: Architecture Explorer UX + Mermaid Reliability (V2)

**Feature**: `003-architecture-explorer-ux`  
**Date**: 2026-08-11

Validation guide for building, installing, and verifying V2 acceptance scenarios. Implementation details belong in `tasks.md` and the implement phase — this document defines **runnable checks and expected outcomes** only.

**Prerequisites**: Node.js 18+, npm, VS Code or Cursor ≥ 1.85, repository opened at monorepo root with `/knowledge` present.

**Related artifacts**:
- [data-model.md](./data-model.md) — entity invariants
- [contracts/](./contracts/) — message and manifest contracts
- V1 [quickstart](../001-architecture-explorer/quickstart.md) — base build/install steps still apply

---

## 1. Build and install

```powershell
cd Tools/ArchitectureExplorer
npm install
npm run compile
npm test
npm run package
```

**Expected**:
- Compile succeeds with zero errors
- All unit tests pass, including new V2 tests (`mermaidTheme`, `mermaidSanitize`, `markdownDocumentService`)
- `architecture-explorer-0.2.0.vsix` (or current version) produced

**Install side-loaded VSIX** (Extension Development Host or manual):
```powershell
code --install-extension architecture-explorer-*.vsix
```

Or press F5 from `Tools/ArchitectureExplorer/` to launch Extension Development Host.

---

## 2. Automated test matrix (FR-032, SC-008)

Run before manual acceptance:

```powershell
cd Tools/ArchitectureExplorer
npm test
```

| Test suite | User Story | Acceptance backing |
|------------|------------|-------------------|
| `mermaidTheme.test.ts` | US1 | Theme kind mapping; unknown → dark fallback |
| `mermaidSanitize.test.ts` | US2 | `<br>` variants → newline; strict retry; no securityLevel change |
| `markdownDocumentService.test.ts` | US3 | Second open reuses panel; dispose clears singleton |
| `package/contributes.test.ts` | US4 | Search command id referenced in view/title menu (FR-018, FR-024) |
| `extension.reload.test.ts` | US5 | Reload handler success/failure notification + Output log path (FR-027) |

---

## 3. Manual acceptance — US1 Legible diagrams (SC-001, SC-006)

### 3.1 Dark theme legibility

1. Set IDE color theme to a dark theme (e.g. Dark+).
2. Open Architecture Explorer → navigate to a document with sequence diagrams (e.g. `knowledge/integrations/external/firebase-fcm.md` or any integration flow doc).
3. Inspect participant labels, arrows, message text, and notes.

**Expected**: All diagram text and connectors legible against panel background without hover/zoom (FR-002).

### 3.2 Light and high-contrast themes

Repeat §3.1 with light theme and high-contrast theme.

**Expected**: Diagrams remain legible in each theme.

### 3.3 Live theme switch

1. Open a diagram document with panel **visible**.
2. Switch IDE theme dark → light (or reverse).

**Expected**: Within one refresh cycle, diagram palette updates to match new theme (SC-006, FR-004).

### 3.4 Hidden panel theme switch

1. Open diagram document; switch to another editor tab hiding the panel.
2. Change IDE theme.
3. Reveal Architecture Explorer documentation panel.

**Expected**: Diagram uses current theme on reveal (FR-004).

---

## 4. Manual acceptance — US2 HTML-break notes (SC-002, SC-003)

### 4.1 Known corpus fixture

1. Open `knowledge/integrations/external/firebase-fcm.md` in Architecture Explorer.
2. Locate sequence diagram with `<br/>` in notes.

**Expected**: Diagram renders; note text visibly wraps across lines (US2 scenario 1).

### 4.2 Partial failure isolation

Use a local test fixture or temporary knowledge doc (do **not** commit) with:
- One valid diagram
- One intentionally malformed diagram
- Normal Markdown body text

**Expected**: Valid diagram + body render; failing diagram shows Mermaid error message + original source; other content unaffected (FR-009, FR-010).

### 4.3 Output channel logging

1. Open View → Output → select **Architecture Explorer**.
2. Trigger a diagram failure (malformed fixture).

**Expected**: Timestamped entry with file path and underlying error message (FR-011).

---

## 5. Manual acceptance — US3 Single panel (SC-004)

1. Open document A from tree.
2. Click document B, then C in tree (10-document walk for SC-004).
3. Inspect open editor tabs / webview panels.

**Expected**: At most one Architecture Explorer documentation panel throughout (FR-012).

4. Command Palette → **Architecture Explorer: Open Raw Markdown** for document A.

**Expected**: Standard editor tab for A opens; does not create second Architecture panel (FR-015).

5. Close Architecture documentation panel; open document D from tree.

**Expected**: New single panel created for D (FR-014).

6. Activate a search result.

**Expected**: Same panel shows target document; scroll near match when anchor available (FR-016, FR-022).

---

## 6. Manual acceptance — US4 Title-bar search (SC-005)

1. Focus Architecture Explorer tree view.
2. Locate **Search** icon on view title bar (alongside collapse-all).

**Expected**: Search icon visible (FR-018).

3. Click Search; type keyword present in multiple docs.

**Expected**: QuickPick shows matches with category, name, snippet; debounced ~200 ms (FR-020, FR-021).

4. Activate a result.

**Expected**: Document opens in single documentation panel (FR-022).

5. Before index ready (fresh profile / immediately after install): invoke title-bar search.

**Expected**: Non-blocking "Indexing…" placeholder; results populate when ready (FR-023).

6. Command Palette → **Architecture Explorer: Search**.

**Expected**: Identical picker behavior (FR-024).

---

## 7. Manual acceptance — US5 Reload recovery (SC-007)

### 7.1 Normal activation

1. Fresh Extension Development Host with extension installed.
2. Open Architecture Explorer view.

**Expected**: Tree populates without manual command (FR-025).

### 7.2 Reload command

1. Command Palette → **Architecture Explorer: Reload**.

**Expected**:
- Non-modal information notification on success (A17)
- Output channel timestamped entry
- Tree populated; no duplicate documentation panels if one was open (FR-027, FR-028)

### 7.3 Activation failure visibility

If activation fails (simulate by breaking config in dev branch):

**Expected**: Output channel entry names failing step; no modal dialog; no telemetry (FR-026).

---

## 8. Regression checks (V1 behavior preserved)

| Check | Steps | Expected |
|-------|-------|----------|
| CRLF fences | Open doc with CRLF line endings in Mermaid fence | Diagrams render |
| Evidence links | Click evidence link in rendered doc | Source file opens in editor |
| Freshness badge | Tree title shows freshness + workspace label | Unchanged from V1 |
| File watcher | Edit open knowledge file on disk | Panel re-renders; single-panel rule holds |
| No network | DevTools / code review | Zero new outbound calls (SC-009) |

---

## 9. Sample document index for SC-001 sampling

Open one document per top-level `/knowledge` category containing Mermaid:

```text
knowledge/README.md                    (if diagrams present)
knowledge/integrations/external/*.md
knowledge/domains/**/*.md              (as available)
knowledge/flows/**/*.md                (as available)
```

Record pass/fail for legibility per theme in a checklist during QA.

---

## 10. Failure triage

| Symptom | Check |
|---------|-------|
| Diagram still low contrast | Output → verify `theme.kind` in render; inspect `mermaidTheme.ts` mapping |
| `<br/>` still fails | Output → Mermaid error text; verify sanitize applied before render |
| Multiple panels | Breakpoint in `MarkdownDocumentService.open` — confirm singleton path |
| No search icon | `package.json` `menus.view/title` contribution installed in VSIX |
| Reload no-op | Output channel for failed step; tree view disposal |

---

## Done when

- [ ] `npm test` green including V2 unit tests
- [ ] US1–US5 manual scenarios pass
- [ ] SC-004 10-document navigation walk confirms single panel
- [ ] SC-009 verified (no network, no `/knowledge` writes)
- [ ] `.vsix` packages successfully for side-load distribution (A11)
