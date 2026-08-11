# Docki repository agent guidance

This repository is the **Docki** product itself (CLI, Cursor kit, Explorer extension).

- Product docs: `README.md`, `docs/`
- Installable kit templates: `kit/`
- Explorer extension: `packages/explorer`
- CLI: `packages/cli`

When changing kit skills or agents, keep them **repo-agnostic** — no customer product names.

Consumer repositories that install Docki receive a copy of `kit/AGENTS.md` at their root.
