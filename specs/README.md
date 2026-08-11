# Spec Kit artifacts

These Spec-Driven Development artifacts document how **Docki Explorer** was designed and evolved (originally under the Architecture Explorer name in the source monorepo).

| Feature | Folder | Focus |
|---------|--------|--------|
| Explorer v1 | [`001-architecture-explorer`](001-architecture-explorer/) | Core viewer: tree, search, Mermaid, evidence links, freshness |
| Explorer UX | [`003-architecture-explorer-ux`](003-architecture-explorer-ux/) | UX hardening (reload, menus, search affordances, etc.) |

They are kept for contributors who want the original requirements, plans, tasks, and contracts. Runtime product code lives under `packages/explorer/`.

Command IDs and publisher in these docs may still say `architectureExplorer` / `mtn` in places — the shipped extension uses `dockiExplorer` / `docki`. Prefer `packages/explorer/package.json` as the source of truth for current IDs.
