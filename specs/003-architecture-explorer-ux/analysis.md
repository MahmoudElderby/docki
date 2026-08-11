# Specification Analysis Report

**Feature**: `003-architecture-explorer-ux`  
**Date**: 2026-08-11  
**Mode**: Autopilot FULL AUTO — analyze (pre-tasks)  
**Artifacts analyzed**: `spec.md`, `plan.md`, `research.md`, `data-model.md`, `quickstart.md`, `contracts/*`, `constitution.md`  
**Artifacts missing**: `tasks.md` (not yet generated — `/speckit-tasks` pending)

---

## Findings

| ID | Category | Severity | Location(s) | Summary | Resolution |
|----|----------|----------|-------------|---------|------------|
| C1 | Coverage | CRITICAL | — | — | None open |
| H1 | Inconsistency | HIGH | spec.md FR-032, SC-008; research.md §9; quickstart.md §2 | FR-032/SC-008 mandated automated tests for **every** acceptance scenario, but US1 visual-legibility scenarios and some live-IDE checks cannot run in Node; research already deferred visual checks to manual quickstart | **Fixed** — FR-032/SC-008 split automated vs manual; quickstart US4/US5 tests required; plan + research aligned |
| H2 | Inconsistency | HIGH | spec.md SC-005 | SC-005 claimed ≤3 interactions but enumerated four steps | **Fixed** — SC-005 now ≤4 unfocused / ≤3 when view focused |
| H3 | Inconsistency | HIGH | contracts/service-interfaces.md | `DocumentationPanel.getCurrentUri()` implied constructor URI updates on navigation, contradicting single-panel reuse where service owns `activeUri` | **Fixed** — removed `getCurrentUri()`; service `activeUri` + render payload authoritative |
| M1 | Underspecification | MEDIUM | spec.md FR-002 | Dark/high-contrast require WCAG AA; light theme requires only "legible" without explicit WCAG threshold | Accepted — intentional lighter bar for light backgrounds (A2); manual quickstart covers |
| M2 | Coverage | MEDIUM | (all) | `tasks.md` absent — 0% task decomposition | **Blocker for `/speckit-implement`** — run `/speckit-tasks` next |
| M3 | Ambiguity | MEDIUM | quickstart.md §6 | US4 manual steps describe click-only path; FR-018 also requires keyboard/AT accessibility | Manual IDE verification sufficient post-FR-032 split; optional quickstart keyboard step in tasks phase |
| L1 | Duplication | LOW | spec.md FR-016, FR-022 | Scroll-to-match repeated in single-panel and search sections | Acceptable cross-reference; same behavior |
| L2 | Terminology | LOW | data-model.md vs contracts | `MermaidThemeConfig.mermaidTheme` vs utility `theme` field name | Cosmetic; implement maps in `mermaidTheme.ts` |

**Overflow**: No additional findings beyond the 8 rows above.

---

## Constitution Alignment

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Code and Configuration Are Authoritative | ✅ Pass | Plan documents observed V1 gaps (`panel.ts`, `MarkdownDocumentService` Map) as fix targets |
| II. Evidence-Based Architecture Knowledge | ✅ Pass | Viewer-only; FR-030/FR-029; no `/knowledge` writes |
| III. Service Boundary Integrity | ✅ N/A | Standalone IDE extension |
| IV. Testability and Contract Discipline | ✅ Pass (after H1 fix) | Automated tests for logic; manual quickstart for visual/IDE scenarios |
| V. Secret Hygiene and Local-First | ✅ Pass | FR-003 bundled themes; FR-029 local-only; Reload non-modal |

**Constitution conflicts**: None.

---

## Requirements Coverage Summary

`tasks.md` not present — coverage mapped to **plan + contracts + quickstart** instead of tasks.

| Requirement Key | Has Plan/Contract? | Validation path | Notes |
|-----------------|-------------------|-----------------|-------|
| FR-001–FR-005a (Mermaid theme) | ✅ | `mermaidTheme.ts`, `panel.ts`, quickstart §3 | US1 |
| FR-006–FR-011 (HTML sanitize) | ✅ | `mermaidSanitize.ts`, quickstart §4 | US2 |
| FR-012–FR-017 (single panel) | ✅ | `MarkdownDocumentService.ts`, quickstart §5 | US3 |
| FR-018–FR-024 (title search) | ✅ | `package.json`, `package/contributes.test.ts` | US4 |
| FR-025–FR-028 (reload) | ✅ | `extension.ts`, `extension.reload.test.ts` | US5 |
| FR-029–FR-031 (guardrails) | ✅ | Code review / SC-009 | Cross-cutting |
| FR-032 (test coverage) | ✅ | quickstart §2 + §3–§7 manual matrix | After H1 fix |
| SC-001–SC-009 | ✅ | quickstart + tests | SC-001/006 manual; SC-008 clarified |

**Coverage**: 33/33 functional requirements (100%) have plan/contract/quickstart backing. **Task coverage**: 0/33 (pending `tasks.md`).

---

## User Story → Validation Mapping

| Story | Acceptance scenarios | Automated | Manual (quickstart) |
|-------|---------------------|-----------|---------------------|
| US1 | 4 | Theme mapping, fallback, re-init on kind change | §3.1–3.4 visual legibility + theme switch |
| US2 | 4 | Sanitize br variants, strict retry, isolation | §4.1–4.3 corpus + Output channel |
| US3 | 4 | Singleton open/dispose | §5 navigation walk (SC-004) |
| US4 | 6 | Manifest contributes test | §6 picker + indexing state |
| US5 | 3 | Reload handler mocked | §7.1–7.3 activation + Reload |

---

## Unmapped Tasks

None — `tasks.md` does not exist yet. All requirements await task decomposition.

---

## Metrics

| Metric | Value |
|--------|-------|
| Total functional requirements | 33 (FR-001…FR-032 incl. FR-005a) |
| Total success criteria | 9 |
| Total user stories | 5 |
| Total acceptance scenarios | 21 |
| Total tasks | 0 (`tasks.md` missing) |
| Requirement plan/contract coverage | 100% |
| Task coverage | 0% (expected pre-tasks) |
| Ambiguity count (open) | 0 |
| Duplication count (actionable) | 0 |
| **Critical issues (open)** | **0** |
| **High issues (open)** | **0** |
| High issues fixed this session | 3 |
| Medium issues (accepted/deferred) | 3 |
| Low issues | 2 |

---

## Blockers

| Blocker | Severity | Action |
|---------|----------|--------|
| `tasks.md` missing | Pipeline | Run `/speckit-tasks` before `/speckit-implement` |

No spec/plan/contract blockers remain after H1–H3 fixes.

---

## Next Actions

1. ✅ Analysis complete — Critical/High = 0  
2. **Run `/speckit-tasks`** to produce dependency-ordered `tasks.md` from plan + contracts  
3. Re-run analyze after tasks (optional) to verify task↔requirement mapping  
4. Proceed to `/speckit-implement`

---

## Remediation Log

Fixes applied during FULL AUTO analyze (also recorded in [autopilot-assumptions.md](./autopilot-assumptions.md) AA1–AA3):

- **AA1**: Clarified FR-032 / SC-008 automated vs manual test split  
- **AA2**: Corrected SC-005 interaction count  
- **AA3**: Removed stale `getCurrentUri()` from service contract
