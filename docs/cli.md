# CLI reference

Entry point: `docki` (via `npx docki-cli` or `node packages/cli/bin/docki.js`).

## `docki init`

Install the Cursor kit into a target repository.

| Flag | Description |
|------|-------------|
| `--target <dir>` | Repository root (default: cwd) |
| `--force` | Overwrite existing Docki kit files |
| `--dry-run` | Print actions only |
| `--with-explorer` | Run `install-explorer` afterward |

Exit codes: `0` ok, `2` bad args, `3` conflicts without `--force`.

## `docki doctor`

Check that required kit files exist under `--target` (default: cwd).

Exit codes: `0` healthy (warnings allowed), `1` missing required files.

## `docki install-explorer`

Build `packages/explorer` into a `.vsix` and install it with the Cursor or VS Code CLI if found on `PATH`.

| Flag | Description |
|------|-------------|
| `--skip-build` | Use an existing `.vsix` in the explorer package |
| `--vsix <path>` | Install a specific VSIX |
| `--target <dir>` | Docki checkout containing `packages/explorer` |

If no editor CLI is found, the command still builds the VSIX and prints the manual install command.

## `docki version` / `docki help`

Print version or help text.
