# Autopilot Assumptions

Feature: `001-architecture-explorer` — Architecture Explorer IDE Extension
Session: 2026-08-11
Mode: FULL AUTO (no user questions asked; every gap auto-answered from the constitution, the original feature prompt, and common engineering standards).

Sources consulted:

- `.specify/memory/constitution.md` (v1.0.0)
- Original feature prompt: `c:\Users\MahmoudElderby\Downloads\architecture-explorer-specify-prompt.md`
- Existing `specs/001-architecture-explorer/spec.md` (with its own Assumptions section)
- Existing `specs/001-architecture-explorer/checklists/requirements.md` (all items already passing)

Baseline: the spec contained **zero** `[NEEDS CLARIFICATION]` markers and an already-populated Assumptions section. The gaps listed below are underspecified areas that would still materially affect implementation, test design, or task decomposition.

Confidence key:

- **high** — supported by explicit user text (feature prompt), by an explicit constitution clause, or by an unambiguous industry default with no viable alternative.
- **med** — a reasonable, low-risk default consistent with the constitution and the prompt but with viable alternatives that a reviewer might tune.
- **low** — a defensible default in the absence of guidance; deserves explicit review during `/speckit-plan` or `/speckit-clarify`.

| #  | Topic                                    | Question / Gap                                                                                                          | Assumption chosen                                                                                                                                                                                                                                                                                        | Confidence |
|----|------------------------------------------|-------------------------------------------------------------------------------------------------------------------------|----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|------------|
| 1  | Evidence link detection scope            | Which tokens in a rendered document qualify as evidence links, and what path patterns are eligible?                     | Only tokens inside inline-code spans (backticked) and Markdown link URLs; token must be a repo-relative path (no leading `/`, no URL scheme, no `..`) with a common source-file extension or a trailing `#L<n>` / `#L<n>-L<n>` suffix. Plain body prose is never linkified. Integrated into FR-019/FR-022. | high       |
| 2  | Rendered view surface / activation model | Custom editor override for `.md`, or on-demand panel from the tree/commands?                                            | On-demand IDE-hosted Webview panel opened from the tree or commands. Extension does not register itself as the default `.md` editor; raw editor remains untouched. Integrated into FR-006 and the "Rendering surface" assumption.                                                                          | high       |
| 3  | Tree sort order                          | How is the tree sorted within each folder?                                                                              | Subfolders first, then Markdown files, both case-insensitive ascending; `README.md` and `AI_CONTEXT.md` pinned to top of their containing folder. Integrated into FR-002.                                                                                                                                | med        |
| 4  | Non-Markdown files under `/knowledge`    | The edge-case list mentions non-Markdown files coexist but no policy for tree/search was stated.                        | Non-Markdown files are hidden from the tree and excluded from the search index; they remain reachable through the standard file explorer. Integrated into FR-002/FR-014.                                                                                                                                 | high       |
| 5  | Search matching + snippet size           | Which matching mode (fuzzy/substring/case) and what snippet size?                                                       | Case-insensitive; fuzzy ranking for filenames and headings, substring for body; snippet ~160 chars centered on the match with the matched span highlighted. Integrated into FR-014/FR-015.                                                                                                                | med        |
| 6  | Search input debounce                    | Debounce interval was required by FR-017 but not quantified.                                                            | 200 ms. Integrated into FR-017.                                                                                                                                                                                                                                                                          | med        |
| 7  | File-watcher coalesce window             | FR-029 required batching but did not quantify it.                                                                       | 300 ms coalesce window; at most one index update per window. Integrated into FR-029.                                                                                                                                                                                                                     | med        |
| 8  | Freshness commit-distance derivation     | FR-025 required commit distance "where derivable" without specifying the mechanism.                                     | Best-effort local Git ancestor query (e.g. `git rev-list --count <analyzed>..HEAD`); on failure, distance is omitted but the potentially-stale state is still reported. No Git state is modified (FR-027 preserved). Integrated into FR-025.                                                             | high       |
| 9  | Command namespace + default keybindings  | Command IDs and whether V1 ships default keybindings were unspecified.                                                  | Commands live under the `architectureExplorer.*` namespace; V1 ships no default keybindings — users bind their own through the IDE keymap. Integrated into FR-034.                                                                                                                                       | med        |
| 10 | Symlinked `/knowledge` handling          | Edge case listed but no policy for whether to follow symlinks inside or as `/knowledge`.                                | Follow symlinks only when the resolved target is inside the workspace root; refuse to traverse symlinks that escape the workspace root (aligned with FR-023). Integrated into FR-023.                                                                                                                    | high       |
| 11 | Large-file rendering ceiling             | "Reasonably large" files were required to remain responsive; no explicit ceiling was defined.                            | Files > 5 MB render a truncated head-of-file preview with a "file too large — open raw" call to action; search indexes the same head-of-file window. Integrated into FR-040.                                                                                                                              | med        |
| 12 | Live update while rendered view is open  | "Where appropriate" was unspecified.                                                                                    | External on-disk changes trigger an automatic re-render; developer's own raw-editor edits re-render on file save (not on every keystroke). Integrated into FR-028.                                                                                                                                       | med        |
| 13 | Diagnostic surface                       | Given FR-036 forbids network, how do errors and warnings surface?                                                       | Dedicated "Architecture Explorer" IDE Output channel; no outbound telemetry under any circumstance. Integrated into FR-036. Constitution Principle V (local-first) supports.                                                                                                                             | high       |
| 14 | Localization                             | Not addressed anywhere in the prompt or spec.                                                                           | V1 UI strings are English (`en`) only. Localization is deferred beyond V1. Added to Assumptions.                                                                                                                                                                                                         | low        |
| 15 | Distribution / packaging                 | Not addressed in the prompt or spec.                                                                                    | V1 packaged as a standard `.vsix` and side-loaded / distributed internally; public marketplace publication (VS Code Marketplace, Open VSX) is out of scope for V1. Added to Assumptions.                                                                                                                 | low        |
| 16 | Search index build lifecycle             | What does the search command do before the initial index is ready?                                                      | Show a non-blocking "indexing…" state; complete once the background build finishes; MUST NOT raise an error. Integrated into FR-017.                                                                                                                                                                     | med        |
| 17 | Multi-root selection transparency        | Existing "Single-root V1" assumption chose the first root but did not say how the choice is communicated.                | Chosen root is displayed in the view header (and in the empty state when applicable) and logged to the Output channel. Refined the "Single-root V1" assumption.                                                                                                                                          | med        |
| 18 | Automated-test coverage bar              | Constitution Principle IV demands tests for changes that cross a service boundary; V1 needed an explicit bar for a new client-side project. | Unit tests for each service (workspace/knowledge-root detection, tree provider, search index, evidence resolver, freshness), plus at least one integration test that exercises the tree provider through to Webview rendering. Every acceptance scenario in User Stories 1–6 has at least one automated test. Added to Assumptions. | med        |

## Remaining blockers

None. No `[NEEDS CLARIFICATION]` markers remain. All 18 auto-answers have been integrated into `spec.md` (Clarifications section plus the corresponding Functional Requirements and Assumptions bullets). The feature is ready to proceed to `/speckit-plan`.

## Notes for `/speckit-plan`

- Items with `low` confidence (localization, distribution) can be revisited during planning without spec churn — they carry no downstream FR that would need to change if the decision flips.
- The `med`-confidence quantitative choices (200 ms search debounce, 300 ms watcher coalesce, 5 MB large-file ceiling, ~160-char snippet) are intentionally conservative starting values. The plan document should either accept them as-is or record an explicit override with rationale.
- No cross-service contracts are introduced (this extension is a standalone client-side tool), so Constitution Principle IV applies via the local test coverage described in row 18 rather than through inter-service contract tests.

## Plan-phase stack decisions (2026-08-11)

Recorded during `/speckit-plan` — beyond the explicit user tech-direction prompt.

| # | Topic | Decision | Confidence |
|---|-------|----------|------------|
| 19 | Repository placement | `Tools/ArchitectureExplorer/` standalone npm package (follows existing `Tools/` convention) | med |
| 20 | Build bundler | `esbuild` dual bundle (host CJS + webview IIFE) | med |
| 21 | Test runner | Mocha — Node for unit tests, `@vscode/test-electron` for integration | med |
| 22 | Git HEAD access | Prefer built-in `vscode.git` extension API; `child_process git` fallback read-only | med |
| 23 | Markdown parse location | Extension host (`markdown-it`), not client-side in Webview | high |
| 24 | Search UI | `QuickPick` with custom index results (not built-in fuzzy filter) | med |
| 25 | Heading anchors | `markdown-it-anchor` or equivalent slugifier for scroll-to-match | med |
| 26 | VS Code engine | `^1.85.0` minimum | med |

Quantitative spec defaults (rows 5–7, 11 in table above) accepted as-is in [research.md](./research.md) — no override.

## Analyze-phase self-fixes (2026-08-11)

Autopilot `/speckit-analyze` (pre-tasks) detected and corrected the following Critical/High inconsistencies. `tasks.md` did not exist yet; coverage gaps are noted for the tasks phase.

| ID | Severity | Issue | Fix applied |
|----|----------|-------|-------------|
| F1 | CRITICAL | [research.md](./research.md) CSP included `img-src … https: data:` — would allow remote image fetch, violating FR-037 (workspace knowledge assets only) and SC-007 (zero outbound network). | Removed `https:` and `data:` from `img-src`; restricted to `${cspSource}` only; aligned [webview-messages.md](./contracts/webview-messages.md) resource table. |
| I1 | HIGH | [data-model.md](./data-model.md) `workspaceRoot` described as "first folder URI" while `activeRootIndex` said "first with knowledge" — conflicted with spec Assumption "Single-root V1". | Unified: `workspaceRoot` = first folder in order with `/knowledge`, else first folder; `activeRootIndex` = index of that folder. |
| I2 | HIGH | [service-interfaces.md](./contracts/service-interfaces.md) `KnowledgeWorkspaceService` comment "first folder or first with /knowledge" was ambiguous. | Clarified selection rule to match spec/data-model. |
| C1 | HIGH | [webview-messages.md](./contracts/webview-messages.md) `RenderMessage` lacked `lineHint` though [service-interfaces.md](./contracts/service-interfaces.md) and data-model define it for body-match scroll (FR-016). | Added `lineHint?: number` to `RenderMessage` and scroll behavior. |
| U1 | HIGH | [quickstart.md](./quickstart.md) US5 automated coverage did not require rename scenario (acceptance #2) or body-match `lineHint`. | Strengthened US2/US5 automated validation notes. |

Post-fix Critical count: **0**. Post-fix High count: **0** (remaining findings are Medium/Low only).
