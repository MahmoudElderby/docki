# Autopilot Assumptions — 003-architecture-explorer-ux

**Mode**: FULL AUTO (`speckit-autopilot-full`)
**Phase**: `/speckit-clarify`
**Recorded**: 2026-08-11
**Feature spec**: [spec.md](./spec.md)

This document records clarifications that FULL AUTO auto-resolved without
interactive user input. Each entry captures the ambiguity that was detected,
the answer applied, the rationale (grounded in the project constitution and
V1 behavior), and the spec sections that were updated as a result. All entries
are also mirrored into the spec's `## Clarifications` section (Session
2026-08-11) so downstream phases see them as first-class decisions.

## Constitution alignment

The three auto-answers below preserve every applicable Core Principle from
`.specify/memory/constitution.md`:

- **Principle I (Code and Configuration Are Authoritative)** — no assumption
  invents behavior that would conflict with what V1 already implements.
- **Principle II (Evidence-Based Architecture Knowledge)** — every assumption
  is either `DECLARED` (spec-derived) or `INFERRED` (best-practice default);
  none silently promote speculation to fact.
- **Principle V (Local-First Developer Tooling)** — every default is local,
  offline, and free of telemetry.

## Prior-session clarifications (context only, not auto-resolved here)

The following 8 clarifications were already resolved during `/speckit-specify`
and are listed here only for traceability. They are not new autopilot
assumptions; they are the specify-phase output.

1. Mermaid theme selection is driven by the render payload's IDE theme kind.
2. Mermaid source is preprocessed to normalise HTML line breaks; script
   protection is preserved; unrenderable diagrams surface the underlying
   error and source.
3. "Single documentation panel" scope: one reusable Webview reused for tree
   and search navigation; raw Markdown editors unaffected.
4. Search affordance placement: `view/title` extension point, search icon,
   opens existing QuickPick.
5. Recovery from "No data provider registered": deterministic registration
   on activation, Output-channel logging, `Architecture Explorer: Reload`
   command.
6. Theme change while a panel is open: visible panel re-renders; hidden panel
   re-renders on next reveal.
7. Search result activation reuses the single panel and scrolls near the
   match where practical.
8. Title-bar search before initial index build: shows V1 "indexing…" state;
   populates automatically when ready.

## Auto-resolved clarifications (this session)

### AC1 — Keyboard accessibility for the new title-bar Search action

- **Ambiguity**: FR-018 required a Search action on the tree view title bar
  but did not specify how keyboard-only or assistive-technology users invoke
  it. Acceptance scenarios for User Story 4 spoke in terms of clicks.
- **Question**: How keyboard-accessible must the new tree-view title-bar
  Search action be?
- **Answer applied**: The Search title-bar action MUST inherit the IDE's
  native `view/title` keyboard behavior (focusable via keyboard, activatable
  via Enter/Space) and MUST expose an accessible label derived from the
  command title. No custom keybinding is required beyond IDE defaults.
- **Rationale**: The IDE's `view/title` extension point already provides
  focusable, keyboard-activatable actions with an accessible label sourced
  from the contributed command's title (`OBSERVED` in V1 Command Palette
  behavior and IDE contribution model). Adding custom keybindings would
  expand surface area for no user-observable benefit and could collide with
  developer keymaps.
- **Spec updates**: `## Clarifications` (new bullet), `FR-018` extended, new
  `A15 (accessibility inheritance for title-bar Search)`.
- **Confidence**: High.

### AC2 — Fallback when IDE theme kind is missing or unrecognised

- **Ambiguity**: FR-001 assumed the render payload always supplies a theme
  kind in `{light, dark, highContrast}`. The behavior when the value is
  absent (e.g., host regression) or takes an unknown value (e.g., a future
  IDE theme kind) was unspecified, so the acceptance test matrix for User
  Story 1 could not cover it.
- **Question**: How does the Webview render when the IDE theme kind is
  missing or unrecognised (outside `light` / `dark` / `highContrast`)?
- **Answer applied**: The Webview MUST fall back to the `dark` Mermaid
  palette, MUST log a single `unknown theme kind: <value>` entry to the
  Architecture Explorer Output channel, and MUST re-evaluate the theme kind
  on the next render.
- **Rationale**: A `dark` palette is the safer legibility default when the
  background is unknown, because most IDE themes in the target audience
  (Cursor / VS Code) are dark and dark-palette Mermaid text remains legible
  on a light background more reliably than the reverse. Logging the unknown
  value satisfies Principle II (evidence retention) and does not weaken
  Principle V (no telemetry). Re-evaluating on the next render avoids
  latching a stale fallback if the host later supplies a recognised value.
- **Spec updates**: `## Clarifications` (new bullet), new `FR-005a`, new
  `A16 (theme fallback default)`.
- **Confidence**: Medium-high.

### AC3 — User-visible feedback for `Architecture Explorer: Reload`

- **Ambiguity**: FR-026 covered Output-channel logging on activation failure,
  but User Story 5 did not state whether a successful or failed
  `Architecture Explorer: Reload` invocation surfaces any user-visible
  feedback beyond the tree eventually repopulating. This made the
  independent-test wording for US5 hard to encode as a deterministic
  acceptance scenario.
- **Question**: What user-visible feedback does invoking
  `Architecture Explorer: Reload` produce?
- **Answer applied**: A non-modal IDE notification (information on success,
  error on failure) summarising the reload outcome. A modal dialog MUST NOT
  be shown. A corresponding timestamped entry MUST also be written to the
  Architecture Explorer Output channel.
- **Rationale**: Non-modal notifications are the IDE-native pattern for
  transient command feedback and align with V1's general behavior of not
  interrupting the developer (`OBSERVED` in V1: no modal dialogs are shown
  for tree/search actions). A modal dialog would violate the local-first
  ergonomics of Principle V. Retaining the Output-channel entry preserves
  the durable diagnostic record required by FR-026.
- **Spec updates**: `## Clarifications` (new bullet), `FR-027` extended, new
  `A17 (Reload command feedback style)`.
- **Confidence**: High.

## Deferred / not auto-answered

- No high-impact ambiguities remain unresolved. Remaining low-impact items
  (e.g., Mermaid preprocess log verbosity, search-result count caps) are
  either inherited from V1 unchanged (per `A9 (search behavior unchanged)`)
  or are plan-phase implementation choices that do not change acceptance
  behavior.

## Downstream impact

- The re-validated specification quality checklist at
  `checklists/requirements.md` should continue to pass; the added FRs are
  strictly refinements of existing acceptance-testable requirements and do
  not introduce new `[NEEDS CLARIFICATION]` markers.
- `/speckit-plan` may proceed. No blockers.

---

## Auto-resolved clarifications (analyze phase — 2026-08-11)

### AA1 — FR-032 / SC-008 vs visual acceptance scenarios

- **Ambiguity**: FR-032 and SC-008 required an automated test for every
  acceptance scenario, but US1 scenarios verify WCAG visual legibility and
  cannot be asserted in Node. Research §9 already deferred visual checks to
  quickstart manual matrix, creating a cross-artifact conflict.
- **Answer applied**: FR-032 and SC-008 now require automated regression
  tests for unit-testable scenarios and documented manual quickstart checks
  for visual-legibility and live-IDE scenarios (Principle IV alignment).
- **Spec updates**: `FR-032`, `SC-008`; aligned `plan.md`, `research.md` §9,
  `quickstart.md` §2 (US4/US5 tests no longer optional).
- **Confidence**: High.

### AA2 — SC-005 interaction count

- **Ambiguity**: SC-005 stated ≤3 interactions but listed four steps
  (focus view → search icon → type → activate).
- **Answer applied**: SC-005 now reads ≤4 when unfocused, ≤3 when the
  Architecture Explorer view is already focused.
- **Spec updates**: `SC-005`.
- **Confidence**: High.

### AA3 — DocumentationPanel.getCurrentUri contract drift

- **Ambiguity**: `service-interfaces.md` documented `getCurrentUri()` on
  `DocumentationPanel` returning constructor URI, but V2 single-panel reuse
  updates document via service `activeUri` without recreating the panel —
  the method would return stale state.
- **Answer applied**: Removed `getCurrentUri()` from the contract; service
  `activeUri` and render-payload `documentId`/`documentPath` are authoritative.
- **Spec updates**: `contracts/service-interfaces.md`.
- **Confidence**: High.
