# Feature Specification: Architecture Explorer UX + Mermaid Reliability (V2)

**Feature Branch**: `003-architecture-explorer-ux`

**Created**: 2026-08-11

**Status**: Draft

**Input**: User description: "Incremental V2 on the Architecture Explorer IDE extension (Tools/ArchitectureExplorer/, prior feature 001-architecture-explorer). Fix Mermaid low-contrast rendering under dark IDE themes, fix hard failures on Mermaid notes that contain HTML line breaks (`<br/>`), consolidate documentation browsing into a single reusable panel, add a Search action on the knowledge tree view title bar, and investigate/harden the reported 'No data provider registered' recovery path. Constitution: local-only, viewer-only, no knowledge generation, no telemetry."

## Foundation

This specification is an **incremental V2** of the shipped extension delivered under `specs/001-architecture-explorer`. The V1 scope, entities, and non-goals (local-only, viewer-only, no knowledge generation, no telemetry, workspace-scoped root, `/knowledge`-only surface) remain in force and are inherited unchanged. This document adds new requirements and clarifies user-visible behavior only where V2 changes or extends V1.

Prior artifacts referenced:

- `specs/001-architecture-explorer/spec.md` — V1 specification (browse / render / search / evidence links / freshness).
- `Tools/ArchitectureExplorer/` — the shipped extension being updated in place.

## Clarifications

### Session 2026-08-11

Autopilot FULL AUTO applied constitution-aligned defaults for underspecified areas. Each is also recorded in the Assumptions section.

- Q: How should Mermaid diagrams adapt to the active IDE color theme? → A: The Webview MUST select a Mermaid theme (or explicit theme variables) driven by the editor's theme kind (`light`, `dark`, `highContrast`) already provided in the render payload; dark and high-contrast themes MUST produce a legible palette (text and connector contrast ratio meets WCAG AA against the panel background); light themes MUST remain legible.
- Q: What is the acceptable approach for making diagrams whose notes contain HTML line breaks render? → A: The Webview MUST preprocess Mermaid source before rendering to normalise common author-supplied HTML line breaks (`<br>`, `<br/>`, `<br />`, `<BR>`) into Mermaid-safe line breaks, MAY retry once after further sanitization on failure, and MUST NOT relax script-execution protections. If a diagram still cannot be rendered, the Webview MUST surface the underlying Mermaid error message and still show the diagram source for inspection.
- Q: How is "single documentation panel" scoped? → A: A single reusable Architecture Explorer documentation Webview panel is shown for tree and search navigation. Activating another knowledge document replaces the content of that same panel (title, body, diagrams). Opening the raw Markdown source in the standard editor is unaffected. If the developer closes the panel, the next activation creates a new one.
- Q: Where does the Search affordance appear on the tree? → A: A Search action is contributed to the Architecture Explorer knowledge tree view title bar using the IDE's native `view/title` extension point and a search icon; invoking it opens the existing QuickPick-based knowledge search. The existing Command Palette command remains available.
- Q: How does the extension recover from a "No data provider registered" state? → A: The extension MUST register its tree data provider deterministically on activation (not lazily during first tree access), MUST log activation failures to the Architecture Explorer Output channel, and MUST expose a user-invocable command (`Architecture Explorer: Reload`) that re-registers providers without requiring an IDE restart.
- Q: When does an open documentation panel re-render after an IDE theme change? → A: The panel re-renders automatically on theme change if it is visible; if it is hidden, it re-renders on next reveal.
- Q: How does search result activation interact with the single-panel rule? → A: Search results open into the same single documentation panel; where the underlying render supports it, the panel scrolls near the matched line/heading, otherwise it opens at the top and the failure to scroll is not treated as an error.
- Q: How does the search title-bar action behave before the initial index has finished building? → A: It remains available and shows the same non-blocking "indexing…" state defined by V1; results appear automatically once the background build completes.
- Q: How keyboard-accessible must the new tree-view title-bar Search action be? → A: The Search title-bar action MUST inherit the IDE's native `view/title` keyboard behavior (focusable via keyboard, activatable via Enter/Space) and MUST expose an accessible label derived from the command title; no custom keybinding is required beyond IDE defaults.
- Q: How does the Webview render when the IDE theme kind is missing or unrecognised (outside `light` / `dark` / `highContrast`)? → A: The Webview MUST fall back to the `dark` Mermaid palette (safest legibility default on unknown backgrounds), MUST log a single `unknown theme kind: <value>` entry to the Architecture Explorer Output channel, and MUST re-evaluate the theme kind on the next render.
- Q: What user-visible feedback does invoking `Architecture Explorer: Reload` produce? → A: A non-modal IDE notification (information on success, error on failure) summarising the reload outcome; a modal dialog MUST NOT be shown. A corresponding timestamped entry MUST also be written to the Architecture Explorer Output channel.

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Legible diagrams under any IDE theme (Priority: P1)

A developer is reading a knowledge document containing several Mermaid sequence diagrams (for example, `knowledge/integrations/external/firebase-fcm.md` or a shipment-integration flow). Their IDE is set to a dark or high-contrast color theme. When the document opens in Architecture Explorer, every diagram is legible — participant names, arrows, message labels, and notes all have sufficient contrast against the panel background without hover tooltips or zooming. Switching the IDE theme (dark to light or vice versa) while the panel is open updates the diagrams so they remain legible.

**Why this priority**: Illegible diagrams block the primary reading path that motivates the whole extension. If diagrams cannot be read under the developer's normal theme, the feature is functionally broken for the majority of users, who use dark themes.

**Independent Test**: Open a knowledge document containing at least one Mermaid sequence diagram under each of a dark, light, and high-contrast IDE theme. Confirm all diagram text and connectors are legible in each theme, and that switching themes while the document is open causes the visible panel to update to the new theme's palette (or, if hidden, updates on next reveal).

**Acceptance Scenarios**:

1. **Given** the IDE is on a dark color theme, **When** a knowledge document containing a Mermaid sequence diagram is opened in Architecture Explorer, **Then** every participant label, arrow, message, and note in the diagram is legible against the panel background without hover tools or zooming.
2. **Given** the IDE is on a light color theme, **When** the same document is opened, **Then** diagram elements remain legible against the light background.
3. **Given** a documentation panel is visible with a rendered diagram, **When** the developer switches the IDE color theme, **Then** the panel re-renders and the diagram uses the new theme's palette; if the panel is hidden it re-renders on next reveal.
4. **Given** the IDE is on a high-contrast theme, **When** a diagram is opened, **Then** foreground text and connectors meet high-contrast expectations and no diagram element becomes invisible.

---

### User Story 2 — Diagrams with HTML-break notes still render (Priority: P1)

A developer opens a knowledge document whose author wrote Mermaid notes using HTML line breaks (for example, `Note over Ntf: HTTP 200 checked;<br/>inner catch swallows exceptions`). Instead of the whole diagram failing with a generic "Diagram could not be rendered." message, Architecture Explorer preprocesses the source, renders the diagram with the note broken across lines as intended, and does not weaken script-execution protections. If a diagram still cannot be rendered after preprocessing, the Webview shows the underlying diagnostic message and the original diagram source so the developer can inspect and fix the authoring problem, and the rest of the page (Markdown body and any other diagrams on the same page) still renders.

**Why this priority**: This is currently a hard failure for real knowledge content already in the repository. Every developer who opens the affected files sees a broken diagram, which erodes trust in the extension.

**Independent Test**: With `knowledge/integrations/external/firebase-fcm.md` (or any knowledge document that contains Mermaid notes with HTML `<br/>`), open it in Architecture Explorer. Confirm that the diagram renders with the note text visibly wrapped and that no diagram silently fails. Introduce a deliberately malformed diagram on the same page and confirm the other diagrams and the Markdown body still render, while the failing diagram shows a diagnostic message and its own source.

**Acceptance Scenarios**:

1. **Given** a knowledge document whose Mermaid sequence contains notes with `<br/>` line breaks, **When** the document is opened in Architecture Explorer, **Then** the diagram renders successfully and the note text is visibly broken across lines.
2. **Given** a knowledge page contains one Mermaid diagram that cannot be rendered even after preprocessing, **When** the page is opened, **Then** the failing diagram shows the underlying diagnostic message and its original source, and every other diagram and the Markdown body on the same page still render normally.
3. **Given** a diagram fails to render, **When** the failure occurs, **Then** the extension logs the file path and the underlying error message to the Architecture Explorer Output channel.
4. **Given** a diagram source that would attempt to execute a script through Mermaid or HTML, **When** the document is opened, **Then** the script MUST NOT execute; the diagram either renders with the script content neutralised or is reported as a failure with a diagnostic message.

---

### User Story 3 — One documentation panel, replaced on navigation (Priority: P1)

A developer opens document A from the Architecture Explorer tree; the rendered documentation panel appears. They click document B in the tree; the same panel now shows document B (title, body, diagrams updated) — no additional Architecture Explorer documentation tab has been left behind. They open the raw `.md` for document A in the normal editor; that tab is independent and remains open. They close the Architecture Explorer panel and click document C; a new documentation panel opens for document C. Activating a search result reuses the same single panel.

**Why this priority**: The current behavior leaves a growing stack of panels as the developer explores the knowledge base. This turns normal navigation into cleanup work and is the top UX complaint after the diagram issues.

**Independent Test**: With Architecture Explorer visible, open document A from the tree, then click documents B and C in sequence. Confirm exactly one Architecture Explorer documentation panel is open at each step, with content updated to the most recently activated document. Confirm that opening the raw `.md` source of any of those documents in the standard editor does not affect the single-panel rule. Close the panel, open document D from a search result, confirm a new panel opens and continues to be the single active documentation panel.

**Acceptance Scenarios**:

1. **Given** document A is open in the Architecture Explorer documentation panel, **When** the developer activates document B from the tree, **Then** the same panel updates to show document B and no additional Architecture Explorer documentation panel is created.
2. **Given** the developer opens document A's raw Markdown source in the standard editor, **When** they subsequently navigate to document B in Architecture Explorer, **Then** the standard editor tab for A is preserved and the Architecture Explorer panel switches to document B.
3. **Given** the developer has closed the Architecture Explorer documentation panel, **When** they activate document C from the tree, **Then** a new panel is created showing document C and becomes the single active documentation panel.
4. **Given** a search result is activated, **When** the target document opens, **Then** it opens into the same single documentation panel and, where practical, scrolls near the matched location; failure to scroll near a match is not treated as an error.

---

### User Story 4 — Search from the tree view title bar (Priority: P2)

A developer wants to find every document that mentions a term without leaving the Architecture Explorer view. On the tree view's title bar (the same line that already shows the freshness state and the collapse-all action) they see a search icon. They click it, a native picker appears, they type a term, and see a snippet-rich list of matches from filenames, headings, and body content across every indexed `/knowledge` Markdown file. Activating a result opens the target document in the single documentation panel.

**Why this priority**: Search already exists in V1 via the Command Palette; making it discoverable on the tree view title bar is a productivity improvement rather than a new capability, so it ranks below the rendering fixes and the single-panel change.

**Independent Test**: With Architecture Explorer visible, click the Search action on the tree view title bar. Type a term present in multiple documents. Confirm the picker lists matching documents with category, name, and snippet, and that activating a result opens the target document in the single documentation panel.

**Acceptance Scenarios**:

1. **Given** the Architecture Explorer view is visible, **When** the developer looks at the tree view title bar, **Then** a search action with a recognisable search icon is present alongside any existing title-bar actions.
2. **Given** the developer invokes the title-bar search action, **When** the picker opens and they type a query, **Then** debounced local search returns matches from filenames, headings, and body content across all indexed `/knowledge` Markdown files, each with a snippet and category label.
3. **Given** the developer activates a search result, **When** the result is chosen, **Then** the target document opens in the single Architecture Explorer documentation panel (creating one if none is open).
4. **Given** the initial background index has not yet completed, **When** the developer invokes the title-bar search, **Then** the picker shows the same non-blocking "indexing…" state used by V1 and populates automatically once the index is ready; no error is raised.
5. **Given** the developer's query matches nothing, **When** search runs, **Then** the picker shows an empty-results state without raising an error.
6. **Given** the existing Command Palette command `Architecture Explorer: Search`, **When** the developer invokes it, **Then** it continues to work and shares the same picker experience.

---

### User Story 5 — Resilient tree provider registration and recovery (Priority: P3)

A developer reinstalls or reloads the extension and, on rare occasions, sees the IDE message "There is no data provider registered that can provide view data." Instead of requiring an IDE restart, the developer can either see the tree recover automatically on activation, or invoke a single command (`Architecture Explorer: Reload`) that re-registers the tree provider and restores browsing. Any activation failure is captured in the Architecture Explorer Output channel with enough detail to file an actionable issue.

**Why this priority**: Reported by only one developer and may not be reproducible outside a specific reinstall sequence; still, providing a documented recovery path costs little and removes a class of "restart the IDE" support tickets.

**Independent Test**: Simulate a delayed activation (for example, by installing the extension into a fresh profile and opening the Architecture Explorer view immediately). Confirm the tree eventually populates without an IDE restart, or that invoking `Architecture Explorer: Reload` restores the tree. Confirm the Output channel contains a message describing the activation event and any recovery.

**Acceptance Scenarios**:

1. **Given** a fresh IDE profile with the extension installed, **When** the developer opens the Architecture Explorer view for the first time, **Then** the tree data provider is registered as part of activation and the tree renders without requiring any manual command.
2. **Given** the tree view shows "No data provider registered", **When** the developer invokes `Architecture Explorer: Reload`, **Then** the provider is re-registered and the tree populates without an IDE restart.
3. **Given** activation encounters an error, **When** the error occurs, **Then** the Architecture Explorer Output channel contains a timestamped entry naming the failing step; no dialog is shown and no telemetry is emitted.

---

### Edge Cases

- A document contains many Mermaid diagrams and only one is malformed — every other diagram and the Markdown body must still render.
- A diagram source contains `<br/>` inside a note that itself spans multiple lines authored with CRLF endings — the preprocess step must not corrupt other content.
- A diagram source contains `<script>` or event handlers — script execution MUST NOT occur regardless of preprocess outcome.
- The IDE theme changes rapidly (dark → light → dark) — the panel converges on the last theme; intermediate states are allowed as long as the final render matches the current theme.
- The developer opens document A, closes the panel, then opens document A again — a new single panel is created.
- The developer drags the documentation panel to a different editor group — it remains the single Architecture Explorer documentation panel and continues to be reused.
- The tree view title bar already contains other actions (freshness, collapse-all, refresh) — the search icon must integrate without displacing them.
- The initial search index is still building when the tree title-bar search is invoked — the picker must show the V1 "indexing…" state and populate when the index is ready.
- The developer invokes `Architecture Explorer: Reload` while a documentation panel is open — the panel content may be preserved or re-rendered but must not become orphaned or duplicated.
- A knowledge file is renamed on disk while its rendered view is open — the existing V1 behavior (external change triggers re-render) continues to apply; the single-panel rule is not broken by the rename.

## Requirements *(mandatory)*

### Functional Requirements

#### Mermaid theme adaptation (Bug A)

- **FR-001**: The documentation Webview MUST select a Mermaid theme or explicit theme variables driven by the IDE theme kind (`light`, `dark`, `highContrast`) at render time, using the theme kind value already supplied in the render payload.
- **FR-002**: Under dark and high-contrast IDE themes, rendered Mermaid diagram text and connectors MUST meet WCAG AA contrast against the panel background; under light themes, they MUST remain legible.
- **FR-003**: The Mermaid theme MUST NOT depend on remote assets; all theme resources MUST be bundled with the extension or expressed as inline configuration.
- **FR-004**: When the IDE color theme changes while a documentation panel is visible, the panel MUST re-render Mermaid content to match the new theme; if the panel is hidden at the time of the change, it MUST re-render on next reveal.
- **FR-005**: The surrounding panel chrome (backgrounds, foreground, code block styling) MUST continue to use IDE theme CSS variables as in V1.
- **FR-005a**: When the IDE theme kind supplied to the Webview is missing or outside `light` / `dark` / `highContrast`, the Webview MUST fall back to the `dark` Mermaid palette, MUST log a single `unknown theme kind: <value>` entry to the Architecture Explorer Output channel, and MUST re-evaluate the theme kind on the next render.

#### Mermaid robustness with author-supplied HTML (Bug B)

- **FR-006**: The documentation Webview MUST preprocess each Mermaid diagram source before rendering to normalise common HTML line-break tokens (`<br>`, `<br/>`, `<br />`, `<BR>` — case-insensitive) into Mermaid-safe line breaks; other author content MUST be preserved.
- **FR-007**: Preprocessing MUST NOT weaken script-execution protections; scripts embedded in diagram source or notes MUST NOT execute.
- **FR-008**: If the initial render fails, the Webview MAY retry once after additional sanitization (for example, escaping remaining disallowed tags); if that also fails, the diagram MUST be reported as a rendering failure.
- **FR-009**: A rendering failure for one diagram MUST NOT prevent other diagrams on the same page from rendering and MUST NOT prevent the Markdown body from rendering.
- **FR-010**: A rendering failure MUST display the underlying diagnostic message and the original diagram source in place of the failed diagram, replacing the previous generic "Diagram could not be rendered." message.
- **FR-011**: Every Mermaid rendering failure MUST be logged to the Architecture Explorer Output channel with the source file path and the underlying error message; no failure MUST be silently swallowed.

#### Single documentation panel (Enhancement 1)

- **FR-012**: The extension MUST maintain at most one Architecture Explorer documentation Webview panel at a time for tree- and search-driven navigation.
- **FR-013**: Activating a different knowledge document from the tree or a search result MUST replace the existing panel's content (title, HTML body, and diagrams) rather than open a new panel.
- **FR-014**: If the single panel has been closed by the developer, the next activation MUST create a new panel and that panel MUST become the single active panel.
- **FR-015**: Opening the raw Markdown source of any knowledge document in the standard editor MUST remain available and MUST NOT be affected by the single-panel rule.
- **FR-016**: When opening a document from a search result, the panel MUST attempt to scroll near the matched location where the render supports it; failure to scroll near a match MUST NOT be treated as an error.
- **FR-017**: The single-panel behavior MUST apply consistently regardless of whether activation originates from the tree, from the Command Palette search, or from the tree view title-bar search.

#### Search on tree view title bar (Enhancement 2)

- **FR-018**: The extension MUST contribute a Search action to the Architecture Explorer knowledge tree view's title menu using the IDE's `view/title` extension point, presented with a recognisable search icon. The action MUST inherit the IDE's native `view/title` keyboard behavior (focusable and activatable via keyboard) and MUST expose an accessible label derived from the command title; no custom keybinding is required beyond IDE defaults.
- **FR-019**: Invoking the title-bar Search action MUST open the same QuickPick-based knowledge search experience already used by the Command Palette command.
- **FR-020**: The search MUST cover, across all indexed `/knowledge` Markdown files: filenames and display names, headings and titles, and body content; each result MUST include the document path or category label, the document name, and a snippet showing the match.
- **FR-021**: Query input MUST be debounced consistently with the V1 search (200 ms); an empty query MUST return an empty result set; the search MUST NOT make any network request.
- **FR-022**: Activating a search result MUST open the target document in the single Architecture Explorer documentation panel (creating it if none is open) and, where practical, scroll near the matched location.
- **FR-023**: If the initial background index has not yet completed when the title-bar search is invoked, the picker MUST show the non-blocking "indexing…" state defined by V1 and populate automatically when the index is ready; no error MUST be raised.
- **FR-024**: The existing Command Palette command `Architecture Explorer: Search` MUST continue to work and MUST share the same picker experience as the title-bar action.

#### Tree provider registration and recovery (Bug C)

- **FR-025**: The extension MUST register its knowledge tree data provider (`architectureExplorer.knowledgeTree`) deterministically during activation, before the tree view is first requested to render.
- **FR-026**: If registration or activation fails, the extension MUST log a timestamped entry to the Architecture Explorer Output channel that names the failing step and includes the underlying error message; no user-facing dialog is required and no telemetry MUST be emitted.
- **FR-027**: The extension MUST expose a user-invocable command `Architecture Explorer: Reload` that re-registers the tree data provider and re-initialises supporting services without requiring an IDE restart. Invoking the command MUST show a non-modal IDE notification (information on success, error on failure) summarising the reload outcome; a modal dialog MUST NOT be used, and a corresponding timestamped entry MUST be written to the Architecture Explorer Output channel.
- **FR-028**: After a successful reload, the tree MUST populate and the single documentation panel (if any) MUST NOT be duplicated or orphaned.

#### Cross-cutting constitutional guardrails

- **FR-029**: All V2 behavior MUST remain local-only: no outbound network requests, no telemetry, no remote asset fetches at render time.
- **FR-030**: V2 MUST NOT generate, rewrite, or modify `/knowledge` Markdown files; all sanitization and preprocessing MUST occur in memory at render time only.
- **FR-031**: V2 MUST NOT change the workspace-scoped root resolution, the tree sort order, the evidence-link resolution rules, or the freshness computation defined by V1 unless explicitly required by a V2 requirement above.
- **FR-032**: V2 MUST extend the V1 automated-test coverage with unit tests for Mermaid theme mapping, HTML-note sanitize, single-panel open semantics, title-bar search manifest wiring, and reload registration semantics where unit-testable. Every V2 User Story acceptance scenario MUST be backed by at least one automated regression test **or** a documented manual check in [quickstart.md](./quickstart.md) when the scenario verifies visual legibility (WCAG contrast, high-contrast expectations) or live IDE chrome behavior that cannot be stubbed in Node (Principle IV).

### Key Entities *(unchanged from V1; recapped for reference)*

- **Knowledge document**: A single Markdown file under `/knowledge`, addressable by its repository-relative path, with headings, body, code fences, and (optionally) Mermaid diagrams.
- **Documentation panel**: The rendered documentation Webview surface. In V2 there is at most one such panel active per session for tree/search navigation.
- **Mermaid diagram**: A fenced code block whose language is `mermaid`; its source is preprocessed and rendered as an inline SVG diagram inside the documentation panel.
- **Search index**: The V1 in-memory index over `/knowledge` Markdown files covering filenames, headings, and bodies.
- **Freshness state**: The V1 indicator (UP TO DATE / may be stale) shown on the tree view header; unchanged in V2.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: On a dark or high-contrast IDE theme, 100% of Mermaid diagrams in the current `/knowledge` corpus render with legible text and connectors (text and connector contrast ratio meets WCAG AA against the panel background). Verified by opening a representative sampled document per knowledge category.
- **SC-002**: At least 95% of Mermaid diagrams in the current `/knowledge` corpus that previously failed to render because of author-supplied HTML line breaks render successfully after V2, without weakening script-execution protections. The remaining ≤5% surface an underlying diagnostic message plus original source in place of a generic error.
- **SC-003**: When a single Mermaid diagram on a page cannot be rendered, 100% of the other diagrams on that page and the Markdown body still render successfully.
- **SC-004**: Navigating between any two knowledge documents from the tree or from search never leaves more than one Architecture Explorer documentation panel open at a time (verified by inspecting open editor tabs after a 10-document navigation walk).
- **SC-005**: A developer can locate a keyword-matching knowledge document from the Architecture Explorer tree view in ≤4 interactions when starting from an unfocused state (focus Architecture Explorer view → click search icon → type query → activate result), or ≤3 when the view is already focused — without leaving the Architecture Explorer view.
- **SC-006**: When the IDE theme is switched while an Architecture Explorer documentation panel is visible, the panel visibly updates to the new theme's Mermaid palette within one refresh cycle (no manual reopen required).
- **SC-007**: When the tree view enters a "No data provider registered" state, invoking `Architecture Explorer: Reload` restores the tree within a single command invocation and without an IDE restart in 100% of local reproductions.
- **SC-008**: The V2 test suite adds automated regression tests for every acceptance scenario that is unit- or integration-testable in Node, and documents manual quickstart checks for visual-legibility and live-IDE scenarios; all automated V2 tests pass in the extension's existing local test runner.
- **SC-009**: V2 introduces zero new outbound network calls, zero new telemetry emissions, and zero writes to files under `/knowledge` (verified by code review and by the extension's existing lint/test guardrails).

## Assumptions

- **A1 (theme kind availability)**: The Webview host already forwards the IDE theme kind (`light`, `dark`, `highContrast`) into the render payload, as observed in V1 `src/webview/panel.ts`. V2 relies on that signal; no new host API is introduced.
- **A2 (Mermaid theme choice)**: Selecting Mermaid's built-in themes (or supplying explicit `themeVariables`) is sufficient to meet the WCAG AA contrast requirement in FR-002. Fine-grained per-diagram color overrides are out of scope.
- **A3 (HTML-break normalisation)**: Normalising `<br>` / `<br/>` / `<br />` / `<BR>` inside Mermaid source to Mermaid's own line-break token (or to a space where a line break is not supported by the diagram type) is an acceptable, minimal preprocess. Broader HTML sanitization inside diagrams is out of scope beyond retry-with-escape on failure.
- **A4 (script blocking preserved)**: The extension continues to run Mermaid at a security posture that blocks arbitrary script execution; V2 MUST NOT downgrade this even if that means a small number of exotic diagrams remain unrenderable and are reported with their diagnostic message.
- **A5 (single panel scope)**: The single-panel rule applies to the Architecture Explorer documentation Webview only. Standard Markdown editors, source code editors, and other extensions' panels are unaffected.
- **A6 (panel disposal)**: If the developer closes the single panel, subsequent activation opens a new panel; the extension does not attempt to "restore" a closed panel outside of a normal reopen action.
- **A7 (scroll-to-match best effort)**: Scrolling near a search match on activation is best-effort; when the underlying render lacks stable anchors for the match line, opening at the top of the document is acceptable.
- **A8 (title-bar space)**: The Architecture Explorer tree view's title menu has room for an additional icon alongside existing actions (freshness indicator, collapse-all, refresh). If a future title-bar action is added in a separate change, the Search action MUST remain visible or reachable via an overflow menu, following the IDE's standard behavior.
- **A9 (search behavior unchanged)**: The underlying search algorithm, ranking, debounce (200 ms), snippet window (~160 chars), and index coverage are inherited from V1 without modification. V2 only surfaces the entry point on the tree view title bar and routes activations into the single panel.
- **A10 (Reload command scope)**: `Architecture Explorer: Reload` re-registers the tree data provider and re-initialises supporting services (workspace detection, tree provider, search index, evidence resolver, freshness) but MUST NOT re-download, re-generate, or modify any `/knowledge` files.
- **A11 (packaging)**: V2 is distributed as an updated `.vsix` following the V1 distribution model; public marketplace publication remains out of scope.
- **A12 (localisation)**: All new UI strings (search action label, reload command label, diagnostic messages) are English-only, consistent with V1.
- **A13 (theme change signal)**: The IDE's active color theme change is observable to the Webview host (either via the extension host's theme-change event or by re-inspecting the theme kind on next render). No polling is required.
- **A14 (existing corpus scope)**: The `/knowledge` corpus used to validate SC-001 through SC-003 is the corpus present in the repository at the time of V2 acceptance. Future knowledge additions are covered by the same rules but not part of the acceptance measurement.
- **A15 (accessibility inheritance for title-bar Search)**: The IDE's `view/title` extension point provides default keyboard focus and activation for contributed actions; V2 does not define a custom keybinding, and the accessible label surfaced to assistive technology is the command title.
- **A16 (theme fallback default)**: A `dark` Mermaid palette is the safest legibility fallback when the render payload's theme kind is absent or unrecognised; the fallback is corrected on the next render as soon as a recognised theme kind (`light` / `dark` / `highContrast`) becomes available.
- **A17 (Reload command feedback style)**: Non-modal IDE notifications (information on success, error on failure) are the appropriate user-visible feedback for `Architecture Explorer: Reload`; the developer is not blocked by a modal dialog, and the Output channel entry remains the durable diagnostic record.

## Dependencies

- **D1**: Shipped V1 extension at `Tools/ArchitectureExplorer/` with services `KnowledgeTreeProvider`, `MarkdownDocumentService`, `SearchIndexService`, `EvidenceLinkResolver`, `GitFreshnessService`, and the Webview stack (`DocumentationPanel`, `panel.ts`, `panel.css`, `panel.html`, `SearchQuickPick`).
- **D2**: Existing `/knowledge` corpus, in particular files with Mermaid diagrams and notes containing HTML line breaks (e.g. `knowledge/integrations/external/firebase-fcm.md`), used as V2 acceptance fixtures.
- **D3**: The prior feature specification `specs/001-architecture-explorer/spec.md` for inherited requirements, entities, and non-goals.
- **D4**: `.specify/memory/constitution.md` — in particular Principle V (secret hygiene, local-first developer tooling), which V2 explicitly upholds by remaining local-only and viewer-only.

## Non-Goals (V2)

- Regenerating, rewriting, or modifying any `/knowledge` Markdown for Mermaid compatibility.
- LLM-assisted rendering, embeddings, cloud sync, or telemetry.
- Multi-root redesign beyond V1's single-active-root rule.
- Introducing a second full-page web-app chrome; the extension remains IDE-native.
- Adding a decorative inline search input inside the tree view header (the native QuickPick invoked from a title-bar icon is the preferred pattern).
- Publishing to a public marketplace.
- Changing V1 evidence-link, freshness, tree sort, or non-Markdown handling rules.
