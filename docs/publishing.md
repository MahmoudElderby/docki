# Publishing Docki

`gh` may not be installed on every machine. Use either GitHub CLI or the web UI.

## 1. Create the GitHub repository

Suggested name: **`docki`**

```bash
# if you have GitHub CLI
gh repo create MahmoudElderby/docki --public --source=. --remote=origin --push
```

Or:

1. Create an empty repo `docki` on GitHub
2. Locally:

```bash
cd /path/to/docki
git add .
git commit -m "Initial Docki release scaffold"
git branch -M main
git remote add origin https://github.com/MahmoudElderby/docki.git
git push -u origin main
```

Replace the owner only if you fork:

- `package.json` → `repository` / `bugs` / `homepage`
- `docs/contributing.md` clone URL

## 2. Publish the npm package (optional but recommended for `npx docki-cli`)

The npm package name is **`docki-cli`** (not `docki`). The unscoped name `docki` is blocked by the npm registry (too similar to existing packages). The installed command remains **`docki`**.

```bash
npm login
npm publish --access public
```

Until published, consumers can install from GitHub:

```bash
npx github:MahmoudElderby/docki init
# or clone and:
node packages/cli/bin/docki.js init --target /path/to/repo
```

## 3. Release the Explorer VSIX

```bash
cd packages/explorer
npm install
npm run package
```

Attach `docki-explorer-*.vsix` to a GitHub Release, and document:

```bash
npx docki-cli install-explorer
```

Optional later: publish to the VS Code Marketplace / Open VSX under publisher `docki`.

## 4. Versioning

Use semver on the root `package.json`. Bump Explorer `packages/explorer/package.json` when the extension API/UX changes.
