# How Docki works

## Two surfaces

1. **Generator (Cursor skills)** — creates and maintains `/knowledge`
2. **Explorer (VS Code/Cursor extension)** — reads `/knowledge` live (tree, search, Mermaid, evidence links)

They share the same folder contract. The Explorer never generates docs; the skills never depend on the Explorer.

## Generation pipeline (`docki-knowledge`)

```text
Parent orchestrator
  → discover repo topology & stack
  → launch specialist agents (parallel where useful)
       • system-architect
       • domain-analyzer
       • integration-analyzer
       • data-analyzer
       • infrastructure-analyzer
  → cross-check & reconcile contradictions
  → write /knowledge tree
  → validate links, classifications, evidence citations
```

## Knowledge tree contract

```text
knowledge/
  AI_CONTEXT.md          # compact orientation for humans + agents
  README.md              # index, freshness (last analyzed commit), UNKNOWNs
  system/                # overview, architecture, component map, deployment
  domains/               # bounded contexts / services
  integrations/          # APIs, events, external systems
  data/                  # databases, ownership, caching
  flows/                 # critical business journeys
  decisions/             # observed & undocumented decisions
  risks/                 # architecture risks & technical debt
```

## Epistemic rules

| Label | Meaning |
|-------|---------|
| DECLARED | Explicit in docs/config |
| OBSERVED | Directly evidenced in source |
| INFERRED | Multiple supporting signals; confidence required |
| UNKNOWN | Not determinable — keep it, do not invent |

## Incremental updates (`docki-update`)

1. Read baseline from `knowledge/README.md` / `AI_CONTEXT.md`
2. Diff from last analyzed commit → HEAD (or branch / recent changes)
3. Map changed paths → knowledge documents
4. Update only impacted files
5. Refresh freshness metadata

## Why `model: inherit`

Specialist agents ship with `model: inherit` so Docki works across Cursor plans and changing model slugs. Teams that want fixed routing pin models in Cursor settings (see `kit/MODEL-RECOMMENDATIONS.md`).
