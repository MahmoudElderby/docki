---
name: docki-update
description: Incrementally refresh the repository architecture knowledge base after code changes. Use after feature implementation, refactoring, integration changes, infrastructure changes, or when the user mentions docki-update. Determine architecture impact automatically and update only affected knowledge.
---

# Docki Incremental Updater

Part of **Docki** — architecture knowledge for Cursor and VS Code.

## Mission

Keep `/knowledge` synchronized with the current repository without performing an unnecessary full re-analysis.

The user does not need to identify affected documents.

## Source of truth

Source code and repository configuration override generated knowledge.

Never alter application source code as part of this skill.

## Workflow

### 1. Establish baseline

Read:

- `knowledge/README.md`
- `knowledge/AI_CONTEXT.md`
- relevant existing knowledge files

Determine the last analyzed commit from `knowledge/README.md` if present.

### 2. Determine changes

Use Git when available.

Prefer:

- diff from last analyzed commit to current HEAD
- otherwise current branch diff
- otherwise inspect recently changed repository areas

Categorize changed files into:

- domain/business logic
- API/contracts
- messaging/events
- data/persistence
- integration/provider
- infrastructure/deployment
- configuration/security
- observability
- shared platform/library
- documentation only

### 3. Architecture impact gate

If changes have no architecture/system-design impact, do not rewrite the KB.

Architecture impact includes changes to:

- boundaries
- dependencies
- business capabilities
- contracts
- events
- persistence ownership/schema
- external systems
- security/authentication
- runtime topology
- deployment
- resilience
- significant flows
- architectural patterns

Small internal implementation changes generally do not require KB changes.

### 4. Delegate targeted re-analysis

Invoke only the required specialists from `.cursor/agents/`.

Examples:

- event contract changed â†’ integration-analyzer + relevant domain analysis
- DbContext/database changed â†’ data-analyzer + relevant domain analysis
- Kubernetes/IaC changed â†’ infrastructure-analyzer
- service boundary/project reference changed â†’ system-architect
- business workflow changed â†’ domain-analyzer + integration-analyzer as needed

### 5. Update affected knowledge only

Do not regenerate all files.

Preserve human-authored notes unless contradicted.

Update:
- affected domain files
- affected integration/data/flow files
- system docs only if system-wide architecture changed
- risks/unknowns where needed
- `knowledge/AI_CONTEXT.md` only when orientation-level facts changed
- `knowledge/README.md` metadata/index

### 6. Validate

Check updated documentation against code and inspect `git diff -- knowledge`.

### 7. Report

Report:
- whether architecture impact was detected
- impacted areas
- files updated
- major new/removed architecture facts
- unresolved UNKNOWNs
