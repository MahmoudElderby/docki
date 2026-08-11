# Docki Model Recommendations

These are task-oriented recommendations, not vendor benchmark claims.

Docki keeps subagents portable with `model: inherit`. Pin models in Cursor settings if your team wants fixed routing.

## Recommended high-quality profile

| Role | Recommended Model | Why |
|---|---|---|
| Parent / docki-knowledge orchestrator | Opus 5 **or** GPT-5.6 Sol High/Extra High | Repository-wide synthesis, contradiction resolution, epistemic discipline |
| system-architect | Opus 5 or GPT-5.6 Sol High | System-level reasoning across modules and trade-offs |
| domain-analyzer | Opus 5 or GPT-5.6 Sol High | Business semantics and domain boundaries |
| integration-analyzer | GPT-5.6 Sol High or Composer 2.5 | Evidence tracing across clients, endpoints, events, config |
| data-analyzer | GPT-5.6 Sol High or Composer 2.5 | Schema/consistency/transaction patterns |
| infrastructure-analyzer | Composer 2.5 or GPT-5.6 Sol High | Manifests and deploy topology |
| docki-update | Composer 2.5 for normal diffs; Opus 5/GPT-5.6 Sol High for broad refactors | Incremental updates are usually bounded |

## Recommended balanced-cost profile

- Parent orchestrator: **Opus 5 or GPT-5.6 Sol High**
- system-architect / domain-analyzer: **GPT-5.6 Sol High**
- integration / data / infrastructure: **Composer 2.5**

## Why the parent should not be a cheap model

The parent decides how to decompose the repository, reconciles contradictions, and avoids false claims. That is where stronger reasoning pays off.

## Model pinning

The package uses `model: inherit` intentionally. Avoid hardcoding model slugs into a reusable team package unless you control Cursor versions centrally.
