# Getting started with Docki

## 1. Install the kit into your repo

```bash
cd your-repo
npx docki-cli init
```

This copies:

- `.cursor/skills/docki-knowledge`
- `.cursor/skills/docki-update`
- `.cursor/agents/*` (five specialists)
- `.cursor/rules/docki.mdc`
- `AGENTS.md` and `MODEL-RECOMMENDATIONS.md`
- an empty `knowledge/` scaffold

Verify:

```bash
npx docki-cli doctor
```

## 2. Generate knowledge

Open the repo in **Cursor** and invoke:

```text
docki-knowledge
```

No prompt is required. Docki discovers the stack, delegates specialists, cross-checks findings, and writes `/knowledge`.

First run on a large monorepo can take a while. Prefer a strong model for the parent orchestrator (see `MODEL-RECOMMENDATIONS.md`).

## 3. Browse with Docki Explorer (optional)

From a Docki checkout (or after publishing):

```bash
npx docki-cli install-explorer
```

Then in Cursor/VS Code:

- Activity bar → **Docki**
- or Command Palette → **Docki Explorer: Open** / **Search**

## 4. Keep it fresh

After architecture-relevant changes:

```text
docki-update
```

The updater diffs against the last analyzed commit recorded in `knowledge/README.md` and updates only impacted docs.

## Typical team workflow

1. Someone runs `docki init` once per repo
2. Someone runs `docki-knowledge` for the baseline
3. Engineers use Docki Explorer (or the markdown files) during design/review
4. After large PRs, run `docki-update` (or ask the agent to)
5. Agents read `knowledge/AI_CONTEXT.md` first on cross-cutting work (enforced by the Cursor rule)
