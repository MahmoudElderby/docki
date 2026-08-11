# Feature Specification: Architecture Explorer IDE Extension

**Feature Branch**: `001-architecture-explorer`

**Created**: 2026-08-11

**Status**: Draft

**Input**: User description: "Build a reusable VS Code extension compatible with Cursor called \"Architecture Explorer\" that provides local, IDE-native browse/search/visualize/navigate of the architecture knowledge base under a repository's `/knowledge` folder. No backend, cloud, DB, API key, or LLM. Extension is viewer/navigator/search/freshness only — must not generate or rewrite architecture docs."

## Clarifications

### Session 2026-08-11

Autopilot FULL AUTO applied constitution-aligned defaults for the following underspecified areas. Every entry below is also recorded in `autopilot-assumptions.md` with a confidence rating.

- Q: Which tokens in a rendered document are eligible as evidence links, and what path patterns qualify? → A: Only tokens inside inline-code spans (backticked) and Markdown link URLs; the token MUST match a repository-relative path (no leading `/`, no scheme, no `..`) with either a common source-file extension or a trailing `#L<n>` / `#L<n>-L<n>` suffix. Plain body prose is never linkified.
- Q: Is the rendered view a custom editor that replaces the default `.md` editor, or an on-demand panel invoked from the tree/commands? → A: On-demand IDE-hosted Webview panel opened from the tree or commands; the default Markdown editor MUST remain the raw-source editor and MUST NOT be overridden.
- Q: How is the tree sorted within each folder? → A: Subfolders first, then Markdown files, both sorted case-insensitively ascending; `README.md` and `AI_CONTEXT.md` are pinned to the top of their containing folder.
- Q: How does the tree/search treat non-Markdown files under `/knowledge`? → A: Non-Markdown files are hidden from the tree and excluded from the search index (they remain reachable through the normal file explorer).
- Q: What matching mode and snippet size does search use? → A: Case-insensitive matching; filename and heading matches use fuzzy ranking, body matches use substring; each result snippet is centered on the match with roughly 160 characters of surrounding context and highlights the matched span.
- Q: What debounce interval applies to search input? → A: 200 ms.
- Q: What coalesce window is applied to filesystem event bursts? → A: A 300 ms coalesce window; at most one index update fires per window.
- Q: How is the commit distance in the "may be stale" state computed? → A: Best-effort local Git ancestor query (for example, `git rev-list --count <analyzed>..HEAD`); on failure the distance is omitted from the display but the potentially-stale state itself MUST still be reported.
- Q: Which command namespace do commands use, and are default keybindings shipped? → A: Command identifiers live under the `architectureExplorer.*` namespace; V1 ships no default keybindings — users bind their own through the IDE's keymap.
- Q: How does the extension treat symbolic links inside or as `/knowledge`? → A: It follows symlinks only when the resolved target is inside the workspace root; it refuses to traverse symlinks whose target escapes the workspace root, mirroring the FR-023 evidence-link rule.
- Q: What does the rendered view do for very large Markdown files? → A: For any Markdown file larger than 5 MB, the rendered view shows a truncated head-of-file preview with a clear "file too large — open raw" call to action, and the search index only indexes the same head-of-file window rather than the full body.
- Q: When the underlying file changes while its rendered view is open, when does the view refresh? → A: External on-disk changes trigger an automatic re-render; changes originating from the developer's own edits in the raw editor re-render on file save (not on every keystroke).
- Q: Where do runtime errors and diagnostic messages surface, given the zero-network policy? → A: Only in a dedicated "Architecture Explorer" IDE Output channel; no outbound telemetry is emitted under any circumstance.
- Q: Which locales does the V1 UI support? → A: English (`en`) only. Localization is deferred beyond V1.
- Q: How is V1 distributed? → A: Packaged as a standard `.vsix` extension and side-loaded or distributed internally; public marketplace publication is out of scope for V1.
- Q: How does the search command behave before the initial index has finished building? → A: It shows a non-blocking "indexing…" state and completes automatically once the background build finishes; it MUST NOT raise an error.
- Q: When multiple workspace roots contain `/knowledge`, how is the chosen root communicated to the developer? → A: The first workspace root in workspace order is selected; the chosen root is displayed in the view header (and in the empty state when applicable) and is logged to the Output channel.
- Q: What automated-test coverage does V1 require to satisfy Constitution Principle IV? → A: Unit tests for each service (workspace detection, tree provider, search index, evidence resolver, freshness), plus at least one integration test for tree activation and Webview rendering; every User Story 1–6 acceptance scenario is backed by at least one automated test.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Browse and read architecture documentation from the sidebar (Priority: P1)

A developer opening a repository that already has an architecture knowledge base under `/knowledge` opens the Architecture Explorer view from the IDE sidebar. They see a hierarchical tree that mirrors the categories under `/knowledge` (System, Domains, Integrations, Data, Flows, Decisions, Risks, and any other subfolders present). They click a document — for example "Domains → Payments" — and a rich, readable rendering of that Markdown document opens in a document view inside the IDE, including any embedded architecture diagrams, without leaving the editor.

**Why this priority**: This is the primary reason the extension exists. Without a browsable, readable view of the knowledge base, none of the other capabilities matter. A developer landing on the repository for the first time must be able to orient themselves through this flow alone.

**Independent Test**: With a repository containing a populated `/knowledge` tree, install and enable the extension, open the Architecture Explorer view, expand each category, and open at least one document per category. The tree accurately reflects the folder structure, each document opens in a rendered documentation view, and content is readable using the IDE's native theme.

**Acceptance Scenarios**:

1. **Given** a repository containing `knowledge/domains/payments.md`, **When** the developer opens Architecture Explorer, **Then** the "Domains" category is visible and "Payments" appears under it as a selectable item.
2. **Given** the developer clicks "Payments" in the tree, **When** the item is activated, **Then** a rendered documentation view opens showing the file's headings, paragraphs, lists, tables, code blocks, and blockquotes.
3. **Given** a knowledge file contains a fenced Mermaid diagram, **When** the file is opened in the rendered view, **Then** the diagram is displayed visually as a diagram rather than as raw text.
4. **Given** the developer opens the same document, **When** they choose to edit the raw Markdown, **Then** they can open the source `.md` in the normal editor without the rendered view interfering.

---

### User Story 2 - Search across the entire knowledge base (Priority: P2)

A developer needs to find every place a concept (for example, "RabbitMQ", "MSISDN tokenization", or a specific service name) is discussed in the knowledge base. They invoke the Architecture Explorer search from the command palette or the view. They type a term, and within a moment they see a grouped, snippet-rich list of matches drawn from filenames, headings, and body content across every Markdown file under `/knowledge`. Clicking a result opens the target document in the rendered view and scrolls or highlights the matched location where practical.

**Why this priority**: Once documentation exists, discoverability is the next most impactful capability. Search unlocks the knowledge base for developers who do not yet know its shape.

**Independent Test**: With a repository containing at least three knowledge files that mention the same term across different categories, invoke the search and enter that term. Results appear from multiple documents, each with a snippet and category label, and each result opens the correct document when activated.

**Acceptance Scenarios**:

1. **Given** three documents in different categories that each contain the phrase "RabbitMQ", **When** the developer searches for "RabbitMQ", **Then** all three documents appear as results with their category, document name, and a snippet containing the match.
2. **Given** a document whose filename matches the query but whose body does not, **When** the developer searches for that filename, **Then** the document still appears in the results.
3. **Given** a query that matches nothing, **When** the developer performs the search, **Then** an empty-results state is shown, and no error is raised.
4. **Given** the developer clicks a search result, **When** the result is activated, **Then** the target document opens in the rendered view scrolled to the matched section where practical.

---

### User Story 3 - Jump from documentation evidence into source code (Priority: P3)

While reading an architecture document, a developer sees an Evidence section listing repository-relative source paths (for example, `src/Payments/Application/PaymentService.cs` or `src/Payments/Application/PaymentService.cs#L120-L184`). Each such path appears as a clickable link inside the rendered view. Clicking it opens the referenced file in the normal editor, and when a line or line range is present, the editor reveals and selects that location.

**Why this priority**: Evidence-to-source navigation is what makes the knowledge base actionable rather than descriptive. It closes the gap between "what the architecture says" and "where the code lives."

**Independent Test**: With a knowledge document containing at least three evidence paths (one plain, one with a single line reference, one with a line range) that all resolve to existing files, open the document, click each link, and verify each opens the correct file (and correct line region for the referenced forms).

**Acceptance Scenarios**:

1. **Given** an evidence line `src/Payments/Application/PaymentService.cs` and the file exists in the workspace, **When** the developer clicks the link, **Then** that source file opens in the editor.
2. **Given** an evidence line `src/Payments/Application/PaymentService.cs#L120-L184`, **When** the developer clicks the link, **Then** the file opens with lines 120–184 revealed and selected where practical.
3. **Given** an evidence link points to a file that does not exist in the workspace, **When** the developer clicks it, **Then** a clear "file not found" message is displayed and no file is created.
4. **Given** an inline code span contains something that is not a valid workspace file path, **When** the document is rendered, **Then** it is NOT rendered as a clickable file link.

---

### User Story 4 - Know at a glance whether the knowledge is fresh (Priority: P4)

Before trusting what the knowledge base says, the developer wants to know how current it is. When the Architecture Explorer view opens, a freshness indicator shows whether the `/knowledge` content is up to date relative to the repository's current Git HEAD, using the "Last analyzed commit" (or equivalent) metadata inside `knowledge/README.md`. If the metadata is missing or Git is unavailable, the indicator shows an "unknown" state instead of an error.

**Why this priority**: Freshness protects developers from acting on stale documentation. It is high-value but a smaller surface than browsing/search/evidence, so it sits below them.

**Independent Test**: Point the extension at a repository whose `knowledge/README.md` records a commit that differs from the current HEAD, and confirm the indicator reads "may be stale" with the analyzed and current commit identifiers. Then repeat with a repository whose commit metadata matches HEAD (up to date), and with a repository that has no such metadata (unknown), and with a folder that is not a Git repository (unknown).

**Acceptance Scenarios**:

1. **Given** `knowledge/README.md` records a commit that matches the current Git HEAD, **When** Architecture Explorer loads, **Then** the freshness indicator shows an "up to date" state.
2. **Given** `knowledge/README.md` records a commit different from HEAD, **When** Architecture Explorer loads, **Then** the freshness indicator shows a "may be stale" state naming both commit identifiers.
3. **Given** `knowledge/README.md` contains no "Last analyzed commit" line, **When** Architecture Explorer loads, **Then** the freshness indicator shows an "unknown" state without raising an error.
4. **Given** the workspace is not a Git repository, or Git tooling is unavailable, **When** Architecture Explorer loads, **Then** the freshness indicator shows an "unknown" state and the rest of the extension continues to function.

---

### User Story 5 - Stay in sync when the knowledge base changes (Priority: P4)

While the IDE is open, the underlying `/knowledge` files may change — a document is added, renamed, edited, or deleted (for example, because the developer switched Git branches, pulled changes, or ran a knowledge-refresh workflow). The tree, the search results, and — where appropriate — the currently open rendered document all update to reflect the new state without requiring an IDE restart. The extension also exposes a manual refresh command for cases where the developer wants to force a rescan.

**Why this priority**: Live refresh preserves trust in what the tree and search return. Without it, developers quickly stop trusting the extension.

**Independent Test**: With the extension open on a populated knowledge base, add, rename, and delete a Markdown file under `/knowledge`. Confirm the tree and subsequent searches reflect each change within a short delay and without an IDE restart. Invoke the manual refresh command and confirm it completes cleanly.

**Acceptance Scenarios**:

1. **Given** the extension is open on `/knowledge`, **When** a new file `knowledge/domains/settlement.md` is added, **Then** it appears in the tree and becomes searchable without an IDE restart.
2. **Given** a file is renamed, **When** the rename completes, **Then** the tree reflects the new name and the old name no longer appears.
3. **Given** a file is deleted while it is open in the rendered view, **When** the deletion is detected, **Then** the rendered view shows a clear "document no longer exists" state and does not raise an error.
4. **Given** the developer invokes the manual refresh command, **When** the command completes, **Then** the tree and search index reflect the current state of `/knowledge`.

---

### User Story 6 - Get a useful empty state when knowledge is missing (Priority: P5)

The developer opens a repository that has no `/knowledge` folder yet, or one that exists but contains no Markdown files. Instead of failing or showing a blank pane, the Architecture Explorer view displays an actionable empty state that names the expected `/knowledge` path and points the developer at the repository's knowledge-generation workflow. The extension does not create the folder automatically.

**Why this priority**: Predictable, friendly behavior on empty repositories protects first-run trust and reduces confusion. It is small in scope but essential for a viewer.

**Independent Test**: Open the extension in a workspace that has no `/knowledge`. Confirm an empty state message appears naming the expected path, no folder is created, and no errors are raised. Repeat with a `/knowledge` folder that contains only non-Markdown files.

**Acceptance Scenarios**:

1. **Given** the workspace has no `/knowledge` folder, **When** the developer opens Architecture Explorer, **Then** the view shows a helpful empty state naming the expected path and pointing at the repository's architecture-knowledge workflow, and no folder is created.
2. **Given** `/knowledge` exists but contains no Markdown files, **When** the developer opens Architecture Explorer, **Then** an equivalent empty state is shown.
3. **Given** an empty state is displayed and the developer later adds knowledge files, **When** the files appear on disk, **Then** the view transitions to a populated state without an IDE restart.

---

### Edge Cases

- `/knowledge` folder is entirely absent, or exists but has zero Markdown files.
- The workspace is not a Git repository, or the Git command-line is unavailable at runtime.
- `knowledge/README.md` exists but has no "Last analyzed commit" line, or has a malformed one.
- A Mermaid block contains invalid Mermaid syntax — the surrounding document must still render.
- An evidence path resolves outside the workspace root (e.g. `../../secrets.txt`) — MUST NOT be opened via the evidence-link mechanism.
- An evidence path is a plausible workspace-relative path but the file does not exist.
- A Markdown file is very large (multi-megabyte); rendering and searching must remain responsive or gracefully degrade.
- Many filesystem events fire in a burst (e.g. `git checkout` swapping many files); indexing must not thrash.
- Two knowledge files share the same short name in different subdirectories (must remain distinguishable in the tree and in search results).
- The developer opens the same Markdown file in both the raw editor and the rendered view simultaneously.
- The workspace has multiple roots — one or more of which contain a `/knowledge` folder.
- The workspace `/knowledge` folder is a symbolic link.
- Non-Markdown files (images, JSON, etc.) coexist inside `/knowledge`.

## Requirements *(mandatory)*

### Functional Requirements

**Tree and navigation**

- **FR-001**: The extension MUST expose an "Architecture Explorer" entry in the IDE Activity Bar (or equivalent primary sidebar surface) that opens a dedicated view.
- **FR-002**: The view MUST render a hierarchical tree that mirrors the actual directory structure of the workspace's `/knowledge` folder, discovering Markdown files dynamically rather than relying on a hardcoded set of filenames beyond widely-used conventions (such as `README.md` and `AI_CONTEXT.md`). Within each folder, subfolders MUST be listed before files, both sorted case-insensitively ascending, with `README.md` and `AI_CONTEXT.md` pinned to the top of their containing folder. Non-Markdown files MUST NOT appear in the tree.
- **FR-003**: The tree MUST display friendly, human-readable labels for files and folders where practical (for example, converting kebab-case or snake_case filenames to Title Case), while still resolving to the exact source filename when opened.
- **FR-004**: The tree MUST preserve the on-disk directory hierarchy and MUST NOT flatten or reorder categories.
- **FR-005**: The extension MUST offer a manual "Refresh" command that rebuilds the tree from the current filesystem state.

**Rich rendered viewer**

- **FR-006**: Activating a document in the tree MUST open a rich rendered view of that document inside the IDE, without modifying the source Markdown file. The rendered view MUST be an on-demand Webview panel; the extension MUST NOT register itself as the default editor for `.md` files.
- **FR-007**: The rendered view MUST correctly render at least: headings, paragraphs, ordered and unordered lists, tables, fenced code blocks, blockquotes, inline code, links, and inline images already embedded in the document.
- **FR-008**: The rendered view MUST use IDE-native styling based on the current theme, so the documentation feels like part of the editor rather than a separately branded web page.
- **FR-009**: The raw Markdown file MUST remain openable and editable through the normal editor, independently of the rendered view.
- **FR-010**: The extension MUST NOT modify Markdown content or the source file during rendering.

**Mermaid diagrams**

- **FR-011**: The rendered view MUST detect fenced ```mermaid``` blocks in Markdown and render them locally as visual diagrams, with no external network fetch.
- **FR-012**: If a Mermaid block fails to render (syntax error or unsupported feature), the view MUST show a clear diagnostic message together with the original Mermaid source, and MUST continue rendering the remainder of the document.
- **FR-013**: Mermaid rendering MUST be configured safely — arbitrary script content embedded in Markdown or in Mermaid definitions MUST NOT execute.

**Search**

- **FR-014**: The extension MUST provide a search capability that queries filenames, headings, and Markdown body content across every Markdown file under `/knowledge`, entirely via local computation with no external service. Matching MUST be case-insensitive; filename and heading matches MUST use fuzzy ranking, and body matches MUST use substring matching. Only Markdown (`.md`) files are indexed; non-Markdown files under `/knowledge` MUST NOT be indexed.
- **FR-015**: Search MUST return results grouped or labeled by document and category, and each result MUST include a snippet showing the match in context. Each snippet MUST be centered on the match with roughly 160 characters of surrounding context and MUST highlight the matched span.
- **FR-016**: Activating a search result MUST open the target document in the rendered view and, where practical, scroll to or highlight the matched section.
- **FR-017**: Search MUST remain responsive for a knowledge base of at least several hundred Markdown documents and MUST NOT rebuild the full index on every keystroke — incremental update and event debouncing are required. Search input MUST be debounced with a 200 ms window. While the initial index is still building, the search command MUST show a non-blocking "indexing…" state and MUST NOT raise an error.
- **FR-018**: When a query matches nothing, the extension MUST show a clean empty-results state and MUST NOT raise an error.

**Evidence links to source code**

- **FR-019**: In the rendered view, the extension MUST detect workspace-relative source path references (with optional `#Lnn` or `#Lnn-Lmm` line references) and MUST render them as clickable links. Detection MUST be limited to tokens that appear inside inline-code spans (backticked) and Markdown link URLs; a token MUST match a repository-relative path (no leading `/`, no URL scheme, no `..` segments) with either a common source-file extension or a trailing `#L<n>` / `#L<n>-L<n>` suffix. Plain body prose MUST NOT be linkified.
- **FR-020**: Activating an evidence link MUST resolve the path relative to the workspace root and open the target file in the editor; if a line or line range is present, the editor MUST reveal and select that region where practical.
- **FR-021**: If an evidence link's target file does not exist in the workspace, the extension MUST display a clear "file not found" notification and MUST NOT create the file.
- **FR-022**: The extension MUST NOT treat arbitrary inline code spans as file links — a span MUST only render as a link when it resolves to an actual file in the workspace.
- **FR-023**: Evidence-link resolution MUST reject paths that escape the workspace root (for example, `..`-traversal paths) rather than opening files outside the workspace. The extension MUST also refuse to traverse filesystem symbolic links — inside `/knowledge`, at evidence-resolution time, or in the `/knowledge` folder itself — whose resolved target lies outside the workspace root.

**Knowledge freshness**

- **FR-024**: The extension MUST read the "Last analyzed commit" (or equivalent) metadata from `knowledge/README.md` and compare it against the workspace's current Git HEAD to derive a freshness state.
- **FR-025**: The freshness indicator MUST expose at least three states: up-to-date, potentially-stale, and unknown; the potentially-stale state MUST include the analyzed commit identifier, the current HEAD identifier, and — where derivable — the number of commits between them. Commit distance MUST be derived via a best-effort local Git ancestor query (for example, `git rev-list --count <analyzed>..HEAD`); if the query fails, the distance MUST be omitted from the display but the potentially-stale state itself MUST still be reported.
- **FR-026**: If Git is unavailable, the workspace is not a Git repository, or the `/knowledge/README.md` metadata is missing or unreadable, the freshness state MUST fall back to "unknown" and MUST NOT be treated as an error.
- **FR-027**: The extension MUST NOT modify Git state (no commits, tags, checkouts, resets, index changes, or hook installations) as part of freshness detection.

**File watching and refresh**

- **FR-028**: The extension MUST watch `/knowledge/**/*.md` and automatically refresh the tree, search index, and — where appropriate — the currently open rendered document when files are added, renamed, moved, edited, or deleted. While a document is open in the rendered view, external on-disk changes MUST trigger an automatic re-render; changes originating from the developer's own edits in the raw editor MUST re-render on file save (not on every keystroke).
- **FR-029**: The extension MUST batch or debounce filesystem events so that bursts of changes (for example, a Git branch switch) do not repeatedly rebuild the full index. The coalesce window MUST be at most 300 ms, and at most one index update MUST fire per window.
- **FR-030**: Updates MUST take effect without requiring an IDE window reload or extension restart.

**Empty and missing states**

- **FR-031**: When `/knowledge` does not exist in the workspace, the view MUST display an actionable empty state that names the expected `/knowledge` path and points the developer at the repository's knowledge-generation workflow, and MUST NOT automatically create the folder.
- **FR-032**: When `/knowledge` exists but contains no Markdown files, the view MUST display an equivalent empty state.
- **FR-033**: The extension MUST transition seamlessly from an empty state to a populated state when knowledge files are added while the IDE is open.

**Commands**

- **FR-034**: The extension MUST expose IDE commands (accessible via the command palette) for at least: open the Architecture Explorer view, refresh the knowledge tree, run a knowledge search, open `AI_CONTEXT.md`, and open the knowledge `README.md`. Command identifiers MUST live under the `architectureExplorer.*` namespace. The extension MUST NOT ship default keybindings in V1; users bind their own through the IDE's keymap.
- **FR-035**: All primary interactions — tree navigation, opening a document, invoking search, following an evidence link — MUST be operable via keyboard as well as pointer.

**Security and privacy**

- **FR-036**: The extension MUST NOT transmit repository content, file paths, diagnostic data, telemetry, or any workspace-derived data over the network in normal operation. Runtime errors, warnings, and diagnostic messages MUST surface only in a dedicated "Architecture Explorer" IDE Output channel.
- **FR-037**: The rendered viewer MUST enforce a strict Content Security Policy, MUST disallow execution of arbitrary scripts embedded in Markdown, and MUST restrict Webview resource access to the current workspace's knowledge assets.
- **FR-038**: The extension MUST NOT display the contents of files it references purely because they are named in a knowledge document (for example, `appsettings*.json` mentioned as evidence) — such files remain reachable only via the standard editor after an explicit evidence-link activation.
- **FR-039**: The extension MUST NOT execute any script or command whose source is a Markdown document or a Mermaid definition.

**Performance and scale**

- **FR-040**: The extension MUST remain responsive on knowledge bases containing dozens of folders and several hundred Markdown documents, including reasonably large individual Markdown files. For an individual Markdown file larger than 5 MB, the rendered view MUST show a truncated head-of-file preview with a clear "file too large — open raw" call to action, and the search index MUST index only the same head-of-file window rather than the full body.
- **FR-041**: Search input MUST be debounced and index updates MUST be incremental where feasible; the extension MUST NOT rebuild the full search index for every keystroke or every individual filesystem event.

**Decoupling and scope**

- **FR-042**: The extension MUST NOT generate, rewrite, or restructure content under `/knowledge` at any time.
- **FR-043**: The extension MUST NOT depend on any specific external tool, agent, skill, cloud service, hosted LLM, external database, or embedding/vector store to function.
- **FR-044**: The extension MUST work for any repository that follows the `/knowledge` Markdown structure, regardless of whether those files were produced manually or by any specific AI tool.
- **FR-045**: In V1, the extension MUST behave predictably against a single workspace root (see Assumptions on multi-root handling).

### Key Entities

- **Knowledge Workspace**: A workspace root that contains a `/knowledge` folder. Attributes: workspace root path, knowledge root path, presence flag (exists / missing / empty).
- **Knowledge Category**: A subdirectory under `/knowledge` (for example, `system/`, `domains/`, `integrations/`, `data/`, `flows/`, `decisions/`, `risks/`). Attributes: display name, source folder name, parent category, child categories, child documents.
- **Knowledge Document**: A single Markdown file under `/knowledge`. Attributes: display name, source filename, category path, on-disk path, headings, evidence references, embedded Mermaid blocks, last-modified time.
- **Search Index Entry**: A per-document searchable record. Attributes: document reference, title/headings, filename, body content or content shards, category path, and any additional keys needed for fuzzy or full-text local search.
- **Evidence Link**: A repository-relative path referenced inside a knowledge document. Attributes: raw path token, resolved absolute path, optional line reference, optional line range, resolution status (resolves / missing / rejected-out-of-root).
- **Freshness Status**: The current freshness of the knowledge base relative to the workspace's Git HEAD. Attributes: state (up-to-date / potentially-stale / unknown), analyzed commit identifier (if known), current HEAD identifier (if known), commit distance (if derivable), reason string when unknown.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A developer who has never seen the repository before can locate and open any specific knowledge document from the Activity Bar view within 15 seconds of opening the IDE.
- **SC-002**: On a knowledge base of at least 300 Markdown files, a search executed after a query is typed returns visible results within one second on typical developer hardware, at least 95% of the time.
- **SC-003**: Adding, renaming, or deleting a Markdown file under `/knowledge` while the IDE is open is reflected in the tree and in subsequent search results within 3 seconds, without any IDE restart, at least 95% of the time.
- **SC-004**: In a fixture set covering valid diagrams and at least three classes of invalid Mermaid syntax, 100% of valid diagrams render as diagrams and 100% of invalid diagrams surface a clear diagnostic with the original source without preventing the rest of the document from rendering.
- **SC-005**: In a fixture set of evidence links — plain path, path with single-line reference, path with line-range reference, non-existent path, and out-of-workspace path — 100% of the well-formed, in-workspace links open the correct file (and reveal the correct line region when specified), and 100% of the malformed or unresolved links produce a clear non-error message.
- **SC-006**: Across the four freshness scenarios (metadata matches HEAD, metadata differs from HEAD, metadata missing, no Git available), the freshness indicator reports the correct one of up-to-date / potentially-stale / unknown in 100% of cases and does not raise an error.
- **SC-007**: In normal operation over a one-hour session against a populated `/knowledge` folder, the extension issues zero outbound network requests (verifiable by observation on a network-isolated environment).
- **SC-008**: Opening the Architecture Explorer view against a workspace with no `/knowledge` folder shows an actionable empty state within 2 seconds and does not create any files or folders.
- **SC-009**: A developer can find, from a cold start, the source-code evidence backing a documented architecture claim (open the doc, click the evidence link, land in the source at the referenced range) in under 30 seconds.
- **SC-010**: With a knowledge base of ~500 Markdown files, the extension consumes memory and CPU comparable to other lightweight documentation extensions and does not visibly degrade IDE responsiveness during idle or during a typical browse/search session.

## Assumptions

- **Viewer-only scope**: The extension is strictly a viewer, navigator, search layer, and freshness checker. Generating, rewriting, or restructuring `/knowledge` content is out of scope and remains the responsibility of the repository's separate architecture-knowledge workflow.
- **Single-root V1**: V1 targets a single workspace root. If multiple roots are open, the extension will operate against the first workspace root (in workspace order) that contains a `/knowledge` folder, correctly resolving evidence links relative to that root. The chosen root MUST be displayed in the view header (and in the empty state when applicable) and MUST be logged to the "Architecture Explorer" Output channel so the developer can see which root is active. Full multi-root grouping (showing all roots' knowledge bases side by side) is explicitly deferred to a later version.
- **Local-only, no telemetry**: The extension runs entirely locally. There is no cloud backend, no hosted API, no external database, no vector store, no LLM, and no telemetry collection in V1. This aligns with the platform constitution's local-first tooling principle.
- **No secret disclosure**: Files referenced by name as evidence (for example, `appsettings*.json`) are not opened or displayed by the extension merely by virtue of being mentioned. They only become accessible when the developer explicitly activates an evidence link, at which point they open in the standard editor with whatever access controls the editor already applies.
- **Freshness metadata format**: The extension reads a line resembling `Last analyzed commit: <sha>` (case-insensitive, whitespace-tolerant) from `knowledge/README.md`. If this line is absent or malformed, the freshness state falls back to "unknown" without raising an error.
- **Git access**: Git presence is detected best-effort (either via a runtime check or via the IDE's built-in Git integration if available). If Git is unavailable, freshness falls back to "unknown"; all other features remain fully functional.
- **File-name conventions**: Category names in the tree are derived from folder names on disk (with lightweight prettification such as kebab-case → Title Case). No enforced taxonomy is assumed beyond the folder-and-Markdown layout described in the feature request.
- **Rendering surface**: The rich rendered view uses an IDE-hosted Webview panel opened on demand from the tree or from a command, with a strict Content Security Policy, disallowed remote content, and no arbitrary script execution. The extension does not register itself as the default `.md` editor, so the standard raw-source editor remains available for editing. Mermaid rendering runs inside that same locked-down Webview using a bundled library, without any external fetch.
- **Primary target**: The primary target IDE is Cursor; Visual Studio Code compatibility is expected because the extension consumes only the standard extension API surface and does not rely on Cursor-specific APIs. This is a non-functional expectation rather than a functional requirement.
- **Explicit V1 non-goals**: AI chat, LLM integration, embeddings, semantic/vector search, architecture generation, automatic rewriting of `/knowledge`, cloud sync, user accounts, remote documentation hosting, architecture metrics dashboards, dependency-graph editing, automatic triggering of Cursor agents, CI/CD integration, and repository-wide source-code indexing outside evidence navigation are all out of scope for V1 and are not addressed by this specification.
- **Localization**: V1 ships English (`en`) UI strings only; localization of labels, commands, and messages is deferred beyond V1.
- **Distribution**: V1 is packaged as a standard `.vsix` extension and side-loaded or distributed internally. Public marketplace publication (VS Code Marketplace / Open VSX) is out of scope for V1.
- **Testing bar (Constitution Principle IV)**: V1 ships with unit tests for each service boundary — workspace/knowledge-root detection, tree provider, search index, evidence-link resolver, and freshness reader — plus at least one integration test that exercises the tree provider through to Webview rendering. Every acceptance scenario in User Stories 1–6 is backed by at least one automated test.
