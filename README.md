# Docki

**Architecture knowledge for Cursor and VS Code.**

Docki analyzes a repository, writes a persistent evidence-based knowledge base under `/knowledge`, and ships an Explorer so your team can browse, search, and follow evidence links — including Mermaid diagrams.

```text
npx docki-cli init
# then in Cursor:  docki-knowledge
```

## What you get

| Piece | Purpose |
|-------|---------|
| **docki-knowledge** skill | Full architecture analysis → `/knowledge` |
| **docki-update** skill | Incremental refresh after code changes |
| **5 specialist agents** | System, domain, integration, data, infrastructure |
| **Cursor rule** | Reminds agents to read `/knowledge` on cross-cutting work |
| **Docki Explorer** | VS Code / Cursor extension: tree, search, Mermaid, evidence links |

## Install into a repository

### Prerequisites

- Node.js 18+
- [Cursor](https://cursor.com) (for skills) and/or VS Code (for Explorer)

### One command

From the repository you want to document:

```bash
npx docki-cli init
```

Or from a local Docki checkout:

```bash
node path/to/docki/packages/cli/bin/docki.js init --target /path/to/your-repo
```

Options:

```bash
docki init --force              # overwrite existing Docki kit files
docki init --dry-run            # show what would be written
docki init --with-explorer      # also build & install Docki Explorer
docki doctor                    # verify kit files
docki install-explorer          # build .vsix and install into Cursor/VS Code
```

### After init

1. Open the repo in **Cursor**
2. Invoke the skill **`docki-knowledge`** (no custom prompt required)
3. Optionally install the Explorer: `npx docki-cli install-explorer`
4. After meaningful code changes, invoke **`docki-update`**

## Knowledge classifications

Every meaningful claim is labeled:

- **DECLARED** — explicitly documented/configured
- **OBSERVED** — directly evidenced in the repo
- **INFERRED** — supported by evidence (with confidence)
- **UNKNOWN** — not determinable

Source code always wins over generated docs. Secrets must never be copied into `/knowledge`.

## Repository layout (this product)

```text
docki/
  kit/                      # files copied by `docki init`
    .cursor/skills/
    .cursor/agents/
    .cursor/rules/
    AGENTS.md
    MODEL-RECOMMENDATIONS.md
  packages/
    cli/                    # `docki` command
    explorer/               # Docki Explorer extension
  templates/knowledge/      # empty scaffold
  docs/                     # full documentation
```

## Documentation

- [Getting started](docs/getting-started.md)
- [How Docki works](docs/how-it-works.md)
- [CLI reference](docs/cli.md)
- [Docki Explorer](docs/explorer.md)
- [Contributing](docs/contributing.md)
- [Publishing to GitHub / npm](docs/publishing.md)
- [Spec Kit artifacts (Explorer design)](specs/README.md)

## Safety

Analysis is read-focused. Docki skills must not modify application source — only `/knowledge` (and the kit files you install).

## License

MIT — see [LICENSE](LICENSE).
