---
name: docki-knowledge
description: Build or refresh an evidence-based architecture and system-design knowledge base for the current repository. Use when the user mentions docki-knowledge, asks to understand/document the codebase, onboard AI to the repository, create system architecture docs, or establish persistent repository knowledge. This skill is self-contained: do not ask the user what to analyze or what files to create.
---

# Docki Knowledge Orchestrator

Part of **Docki** — architecture knowledge for Cursor and VS Code.

You are the orchestration layer for repository-wide architecture analysis.

## Mission

Inspect the current repository from the perspective of a Principal Software Architect / System Designer and create an accurate, reusable, AI-oriented knowledge base under `/knowledge`.

The user should not need to provide an analysis prompt. When this skill is invoked, determine the repository type, technology stack, architectural style, relevant analysis dimensions, and documentation scope yourself.

This skill documents the system that actually exists. It must not redesign the system unless the user explicitly asks for recommendations.

## Non-negotiable principles

1. Source code and repository configuration are the ultimate source of truth.
2. Never invent architectural intent, historical decisions, business rules, infrastructure, integrations, or technology choices.
3. Every meaningful conclusion must be classified as one of:
   - DECLARED â€” explicitly documented/configured in the repository.
   - OBSERVED â€” directly evidenced by source/configuration.
   - INFERRED â€” strongly suggested by multiple pieces of evidence.
   - UNKNOWN â€” cannot be established from repository evidence.
4. For INFERRED findings, include confidence: High, Medium, or Low.
5. Preserve UNKNOWN rather than guessing.
6. Documentation must cite repository-relative evidence paths.
7. Do not modify application source code while analyzing.
8. Existing human-written architecture documentation must be preserved unless contradicted by source; flag contradictions rather than silently deleting them.
9. Optimize documentation for both humans and future AI agents.
10. Prefer concise structured documentation over narrative prose.

## Invocation behavior

When invoked with no additional prompt:

1. Detect whether `/knowledge` already exists.
2. If it does not exist, perform INITIAL ANALYSIS.
3. If it exists, determine whether it is stale and perform SAFE REFRESH.
4. Do not ask the user to choose files, domains, agents, technologies, or output structure.
5. Ask the user only if repository access itself is impossible or a destructive action would be required.

## Phase 0 â€” Safety and repository discovery

Before delegation:

- Determine repository root.
- Detect language(s), frameworks, package managers, build systems, solution/workspace files, deployment manifests, CI/CD files, IaC, and existing documentation.
- Detect monorepo vs single application.
- Detect likely runtime components and entry points.
- Detect Git availability and current branch.
- Ignore generated/vendor/build artifacts such as:
  - `.git`
  - `node_modules`
  - `bin`
  - `obj`
  - `dist`
  - `build`
  - `.next`
  - `coverage`
  - vendored dependencies
- Never expose secrets from configuration files. Record the existence and purpose of secret configuration, not secret values.

Create an internal repository map before invoking specialists.

## Phase 1 â€” Delegate specialist analysis

Use the custom subagents in `.cursor/agents/`.

Run independent read-focused analyses in parallel when possible:

### system-architect
Owns:
- architectural style
- application/service/module boundaries
- dependency direction
- layering
- shared libraries
- cross-cutting concerns
- architectural patterns
- architectural violations
- structural risks

### domain-analyzer
Owns:
- business capabilities
- domains/subdomains
- bounded contexts where evidenced
- aggregates/entities/value objects where evidenced
- important use cases
- business rules
- domain/application events
- terminology

### integration-analyzer
Owns:
- internal APIs
- external APIs/providers
- REST/gRPC/GraphQL/webhooks
- queues/topics/streams
- producers/consumers
- retry/dead-letter/idempotency patterns
- timeouts and resilience
- integration topology

### data-analyzer
Owns:
- databases
- schemas/contexts/repositories
- storage ownership
- transactions
- cross-service database access
- Redis/cache usage
- outbox/inbox
- search/document stores
- migrations

### infrastructure-analyzer
Owns:
- containers
- Kubernetes/orchestration
- cloud resources
- networking
- ingress/API gateways
- CI/CD
- configuration
- secrets mechanism
- observability
- runtime topology
- environment differences

Specialists return findings to this orchestrator. They should not independently redesign the system.

## Phase 2 â€” Cross-check

Reconcile specialist findings.

Specifically verify:

- service/module names are consistent
- database ownership agrees with application configuration
- event producers have plausible consumers
- external dependencies are not mistaken for internal services
- infrastructure topology agrees with deployment manifests
- domain terminology agrees with source names
- no inferred statement is presented as fact
- obsolete/dead code is not described as active without evidence

Resolve contradictions by inspecting primary evidence.

If a contradiction cannot be resolved, document it under `knowledge/risks/architecture-risks.md`.

## Phase 3 â€” Generate knowledge base

Create or update:

```text
knowledge/
â”œâ”€â”€ README.md
â”œâ”€â”€ AI_CONTEXT.md
â”œâ”€â”€ system/
â”‚   â”œâ”€â”€ overview.md
â”‚   â”œâ”€â”€ architecture.md
â”‚   â”œâ”€â”€ component-map.md
â”‚   â””â”€â”€ deployment.md
â”œâ”€â”€ domains/
â”‚   â””â”€â”€ <domain>.md
â”œâ”€â”€ integrations/
â”‚   â”œâ”€â”€ internal-apis.md
â”‚   â”œâ”€â”€ external-systems.md
â”‚   â””â”€â”€ events.md
â”œâ”€â”€ data/
â”‚   â”œâ”€â”€ databases.md
â”‚   â”œâ”€â”€ caching.md
â”‚   â””â”€â”€ ownership.md
â”œâ”€â”€ flows/
â”‚   â””â”€â”€ <important-flow>.md
â”œâ”€â”€ decisions/
â”‚   â”œâ”€â”€ observed-decisions.md
â”‚   â””â”€â”€ undocumented-decisions.md
â””â”€â”€ risks/
    â”œâ”€â”€ architecture-risks.md
    â””â”€â”€ technical-debt.md
```

Create only files that are meaningful for the repository. Do not generate empty filler documents.

## Required documentation conventions

Each substantive knowledge file should use this structure where relevant:

```markdown
# Title

## Purpose

## Summary

## Components

## Dependencies

### Incoming
### Outgoing

## Data / State

## Interfaces / Events

## Important Flows

## Architectural Patterns

## Constraints

## Risks

## Evidence

- `relative/path/to/file`

## Knowledge Classification

- OBSERVED:
- DECLARED:
- INFERRED:
- UNKNOWN:
```

Not every heading is required; use only relevant sections.

## Diagrams

Use Mermaid inside Markdown when it materially improves understanding.

Prefer:

- `flowchart` for component/service topology
- `sequenceDiagram` for business/system flows
- `C4Context`/`C4Container` only if supported and useful
- simple diagrams over visually dense diagrams

Every diagram must reflect repository evidence.

## Important flows

Discover important flows yourself. Candidate signals include:

- application commands/use cases
- API entry points
- domain events
- messaging consumers
- workflows/state machines
- payment/order/shipment/authentication flows
- scheduled/background jobs
- callback/webhook paths

Create flow documents only for flows important enough to help future change planning.

## Decisions

Never fabricate ADRs.

`observed-decisions.md` records architectural choices visible in the implementation, without claiming unknown rationale.

`undocumented-decisions.md` records important implemented choices whose rationale is not represented in the repository, e.g.:

```markdown
## Messaging Platform

Current implementation uses RabbitMQ through MassTransit.

Classification: OBSERVED

Rationale: UNKNOWN

Evidence:
- `src/.../MessagingConfiguration.cs`

Potential ADR topic:
- Messaging platform selection and operational constraints
```

## AI_CONTEXT.md

This is the compact map future AI agents should read first.

It must contain:

- system purpose
- architecture style
- major components/services
- major domains
- major data stores and ownership
- major integrations
- major messaging mechanisms
- critical architecture constraints
- where deeper documentation lives
- known high-risk/stale areas

Keep this file compact. It is an index and orientation layer, not a full architecture document.

## README.md

`knowledge/README.md` is the knowledge-base index.

It must:

- explain that source code is authoritative
- link to every generated knowledge file
- show recommended reading order
- record `Last analyzed commit` when Git is available
- record analysis date
- state detected stack
- list unresolved UNKNOWN items worth human input

## Phase 4 â€” Validation

Before finishing:

1. Re-open generated knowledge files.
2. Compare major claims with source evidence.
3. Verify paths exist.
4. Remove unsupported claims.
5. Check Mermaid syntax conceptually.
6. Ensure no secrets are present.
7. Ensure no invented ADR rationale is present.
8. Ensure AI_CONTEXT.md and README.md correctly index the KB.
9. If Git is available, run `git diff -- knowledge .cursor` and inspect the documentation changes.

## Phase 5 â€” Completion report

Return a concise completion report containing:

- repository type detected
- major architecture style detected
- number of domains/components documented
- number of knowledge files created/updated
- most important architectural risks discovered
- important UNKNOWNs requiring human knowledge
- whether documentation validation passed

Do not dump the contents of all generated files into chat.
