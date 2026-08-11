# Contributing to Docki

Thanks for helping. Keep Docki **repo-agnostic**: no customer product names in `kit/`.

## Dev setup

```bash
git clone https://github.com/MahmoudElderby/docki.git
cd docki
node packages/cli/bin/docki.js --help
cd packages/explorer && npm install && npm test
```

## Layout

| Path | Change when… |
|------|----------------|
| `kit/` | Skills, agents, rules, consumer AGENTS.md |
| `packages/cli/` | Installer / doctor / explorer install |
| `packages/explorer/` | Viewer extension |
| `docs/` | User-facing documentation |
| `templates/knowledge/` | Empty scaffold copied by `init` |

## Guidelines

1. Skills must remain read-only on application source (write only under `/knowledge`).
2. Never instruct agents to copy secrets into knowledge docs.
3. Keep specialist agents on `model: inherit` unless documenting an optional pin.
4. Explorer must stay viewer-only (no generation).
5. Update docs when CLI flags or kit paths change.
6. Prefer small PRs: kit vs CLI vs Explorer.

## Testing checklist

- [ ] `node packages/cli/bin/docki.js init --target <tmp> --force` then `doctor`
- [ ] `npm test` in `packages/explorer`
- [ ] Manual: invoke `docki-knowledge` on a sample repo in Cursor
- [ ] Manual: Explorer opens Mermaid + evidence links

## Commit style

Use short imperative subjects, e.g. `fix(cli): refuse init without --force on conflicts`.
