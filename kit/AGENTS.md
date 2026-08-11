# Repository Agent Guidance (Docki)

## Architecture knowledge

This repository may contain an AI-oriented architecture knowledge base under `/knowledge`, maintained by **Docki**.

For architecture-sensitive work, start with:

1. `knowledge/AI_CONTEXT.md`
2. `knowledge/README.md`
3. the specific domain/integration/data/flow documents relevant to the task

Source code and active configuration remain authoritative.

## Docki skills

- Use the Cursor skill **`docki-knowledge`** to create or comprehensively refresh the knowledge base.
- Use the Cursor skill **`docki-update`** after architecture-relevant changes.
- Never invent architectural rationale that is not represented in repository evidence.

## Classifications

Generated findings use: **DECLARED**, **OBSERVED**, **INFERRED**, **UNKNOWN**.

Do not silently promote INFERRED or UNKNOWN information to fact.
