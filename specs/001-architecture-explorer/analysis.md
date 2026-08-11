# Specification Analysis Report

**Feature**: `001-architecture-explorer` — Architecture Explorer IDE Extension  
**Date**: 2026-08-11  
**Mode**: Autopilot FULL AUTO (analyze before tasks)  
**Artifacts analyzed**: `spec.md`, `plan.md`, `research.md`, `data-model.md`, `contracts/*`, `quickstart.md`, `.specify/memory/constitution.md`  
**Artifacts absent (expected)**: `tasks.md` — not yet generated; task coverage analysis deferred to `/speckit-tasks`

**Prerequisites check**: `check-prerequisites.ps1 -RequireTasks` failed as expected (`tasks.md` missing). Analysis proceeded per autopilot override on available design artifacts.

---

## Findings Table

| ID | Category | Severity | Location(s) | Summary | Resolution |
|----|----------|----------|-------------|---------|------------|
| F1 | Inconsistency | **CRITICAL** (fixed) | research.md:L125, webview-messages.md | CSP `img-src` included `https:` and `data:`, contradicting FR-037/FR-036/SC-007 zero-network and workspace-only asset policy | **Self-fixed** — `img-src` restricted to `${cspSource}` only; remote/out-of-root images use alt-text fallback |
| I1 | Inconsistency | **HIGH** (fixed) | data-model.md:L34-39 vs spec.md Assumptions | `workspaceRoot` documented as "first folder URI" while spec requires first folder **with** `/knowledge` (fallback: first folder for empty state) | **Self-fixed** — unified field definitions |
| I2 | Inconsistency | **HIGH** (fixed) | service-interfaces.md:L14 vs spec.md | Ambiguous multi-root selection comment ("first folder or first with /knowledge") | **Self-fixed** — aligned with spec/data-model |
| C1 | Coverage | **HIGH** (fixed) | webview-messages.md vs service-interfaces.md, FR-016 | `RenderMessage` missing `lineHint` for body-match scroll-to-section | **Self-fixed** — added `lineHint` to contract and behavior |
| U1 | Underspecification | **HIGH** (fixed) | quickstart.md US5 | Automated validation did not require rename scenario (US5 acceptance #2) | **Self-fixed** — strengthened US5/US2 test notes |
| M1 | Terminology | MEDIUM | extension-contributes.md vs data-model.md | UI badges ("Up to date" / "May be stale") vs internal enum (`up-to-date` / `potentially-stale`) | Acceptable presentation vs domain split; map in tree title template |
| M2 | Coverage | MEDIUM | — (pre-tasks) | No `tasks.md`; FR-001–FR-045 and SC-001–SC-010 not yet mapped to implementation tasks | Expected — run `/speckit-tasks` next |
| M3 | Underspecification | MEDIUM | quickstart.md SC-002/SC-010 | Performance validation relies on synthetic 300–500 file fixture not yet scripted | Defer to tasks phase (`large-knowledge` generator noted in quickstart) |
| M4 | Ambiguity | MEDIUM | spec.md SC-010 | "Comparable to other lightweight documentation extensions" lacks quantitative baseline | Acceptable NFR smoke test; tasks should add idle-CPU observation step |
| M5 | Terminology | MEDIUM | extension-contributes.md vs FR-001 | Activity Bar container title "Architecture" vs requirement name "Architecture Explorer" | Cosmetic; combined container + view name is clear |
| L1 | Duplication | LOW | spec.md FR-017 + FR-041 | Both mention debounce/incremental indexing | Intentional cross-reference (search input vs index rebuild) |
| L2 | Style | LOW | autopilot-assumptions.md | "Remaining blockers: None" predates plan/analyze phases | Historical; superseded by plan-phase and analyze-phase sections |
| L3 | Style | LOW | plan.md:L75 | References `tasks.md` as future artifact | Accurate placeholder |

*No overflow — 12 findings total (≤ 50 limit).*

---

## Requirement Coverage Summary (pre-tasks)

`tasks.md` absent — coverage inferred from plan structure, service interfaces, and quickstart validation map.

| Requirement Key | Design coverage | Notes |
|-----------------|-----------------|-------|
| FR-001–FR-005 (tree) | plan.md, service-interfaces, data-model | ✅ |
| FR-006–FR-010 (viewer) | research.md §2, webview-messages | ✅ |
| FR-011–FR-013 (Mermaid) | research.md §3, webview-messages | ✅ |
| FR-014–FR-018 (search) | research.md §4, SearchIndexService contract | ✅ |
| FR-019–FR-023 (evidence) | research.md §7, EvidenceLinkResolver contract | ✅ |
| FR-024–FR-027 (freshness) | research.md §6, GitFreshnessService contract | ✅ |
| FR-028–FR-030 (watch/refresh) | research.md §5, KnowledgeFileWatcher contract | ✅ |
| FR-031–FR-033 (empty states) | data-model, quickstart US6 | ✅ |
| FR-034–FR-035 (commands/a11y) | extension-contributes | Keyboard: FR-035 implicit via VS Code primitives |
| FR-036–FR-039 (security) | research.md §8 (post-fix), webview-messages | ✅ post F1 fix |
| FR-040–FR-041 (performance) | constants table, research.md §12 | ✅ |
| FR-042–FR-045 (scope) | spec Assumptions, plan Out of Scope | ✅ |
| SC-001–SC-010 | quickstart validation + performance table | SC-010 qualitative only (M4) |

**User story → design test mapping**: quickstart.md maps US1–US6 to unit/integration scenarios; aligns with Constitution Principle IV and spec clarification #18.

---

## Constitution Alignment

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Code/Config Authoritative | ✅ Pass | Read-only viewer; no doc mutation |
| II. Evidence-Based Knowledge | ✅ Pass | No generator/skill edits |
| III. Service Boundary Integrity | ✅ N/A | Standalone client extension |
| IV. Testability | ✅ Pass | Plan + quickstart mandate unit tests per service + ≥1 integration test |
| V. Secret Hygiene / Local-First | ✅ Pass (post F1) | Zero network; Output channel only; CSP corrected |

**Constitution conflicts after self-fixes**: none.

---

## Cross-Artifact Consistency (post-fix)

| Topic | spec | plan | research | data-model | contracts | quickstart |
|-------|------|------|----------|------------|-----------|------------|
| Search debounce 200 ms | FR-017 | ✅ | §4 | constants | service-interfaces | ✅ |
| Watcher coalesce 300 ms | FR-029 | ✅ | §5 | index lifecycle | service-interfaces | ✅ |
| 5 MB file ceiling | FR-040 | ✅ | §12 | KnowledgeDocument | constants | ✅ |
| Multi-root V1 | Assumptions | ✅ | — | ✅ (post I1) | ✅ (post I2) | troubleshooting |
| Evidence link scope | FR-019 | ✅ | §7 | §5 | EvidenceLinkResolver | US3 |
| CSP / zero network | FR-036/037 | risks table | ✅ (post F1) | — | ✅ (post F1) | SC-007 |
| Body-match scroll | FR-016 | ✅ | — | lineHint | ✅ (post C1) | ✅ (post U1) |

---

## Metrics

| Metric | Value |
|--------|-------|
| Total Functional Requirements | 45 (FR-001–FR-045) |
| Total Success Criteria (buildable) | 10 (SC-001–SC-010) |
| User Stories | 6 (P1–P5) |
| Tasks | 0 (`tasks.md` pending) |
| Coverage % (requirements with ≥1 design artifact) | 100% |
| Ambiguity Count (Medium+) | 1 (SC-010) |
| Duplication Count (actionable) | 0 |
| Critical Issues (after fixes) | **0** |
| High Issues (after fixes) | **0** |
| Medium Issues (open) | 4 (M1–M4) |
| Low Issues (open) | 3 (L1–L3) |

---

## Self-Fix Summary

Five Critical/High findings were corrected in-place (logged in [autopilot-assumptions.md](./autopilot-assumptions.md#analyze-phase-self-fixes-2026-08-11)):

1. **F1 (CRITICAL)** — Tightened Webview CSP to block remote image loads.
2. **I1/I2 (HIGH)** — Aligned multi-root workspace selection across data-model and service contract.
3. **C1 (HIGH)** — Added `lineHint` to Webview `render` message for body-match navigation.
4. **U1 (HIGH)** — Strengthened quickstart automated coverage notes for US5 rename and US2 body scroll.

Re-check after fixes: **0 Critical, 0 High** remaining.

---

## Blockers

**None.** The feature may proceed to `/speckit-tasks`.

Recommended follow-ups (non-blocking):

- Generate `tasks.md` with explicit tasks for: CSP enforcement test (SC-007), 300+ file performance fixture, US5 rename integration test, FR-035 keyboard smoke validation.
- Consider quantifying SC-010 during tasks (idle CPU threshold or comparative baseline).

---

## Next Actions

1. **Run `/speckit-tasks`** — decompose plan + contracts into dependency-ordered `tasks.md`; map each FR and acceptance scenario to ≥1 task.
2. **Optional**: Address Medium findings M3–M4 in tasks (performance fixture script, SC-010 observation).
3. **Then** `/speckit-implement` or autopilot implement phase.

---

## Extension Hooks

No `hooks.before_analyze` or `hooks.after_analyze` registered in `.specify/extensions.yml`.
