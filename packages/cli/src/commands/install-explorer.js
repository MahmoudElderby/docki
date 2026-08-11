'use strict';

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const { pathExists } = require('../fsutil');

function run(cmd, args, opts = {}) {
  const result = spawnSync(cmd, args, {
    stdio: 'inherit',
    shell: process.platform === 'win32',
    ...opts,
  });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw Object.assign(new Error(`${cmd} ${args.join(' ')} failed with exit ${result.status}`), {
      exitCode: result.status || 1,
    });
  }
}

function findCli() {
  // Prefer Cursor, then VS Code / code-insiders / codium
  const candidates =
    process.platform === 'win32'
      ? ['cursor.cmd', 'cursor', 'code.cmd', 'code', 'code-insiders.cmd', 'codium.cmd']
      : ['cursor', 'code', 'code-insiders', 'codium'];
  for (const c of candidates) {
    const which = spawnSync(process.platform === 'win32' ? 'where' : 'which', [c], {
      encoding: 'utf8',
      shell: true,
    });
    if (which.status === 0 && which.stdout.trim()) return c.replace(/\.cmd$/, '');
  }
  return null;
}

function latestVsix(explorerDir) {
  const files = fs
    .readdirSync(explorerDir)
    .filter((f) => /^docki-explorer-.*\.vsix$/i.test(f) || /^architecture-explorer-.*\.vsix$/i.test(f))
    .map((f) => ({ f, t: fs.statSync(path.join(explorerDir, f)).mtimeMs }))
    .sort((a, b) => b.t - a.t);
  return files.length ? path.join(explorerDir, files[0].f) : null;
}

async function installExplorerCommand({ dockiRoot, target, skipBuild, vsix }) {
  const explorerDir = pathExists(path.join(target, 'packages', 'explorer'))
    ? path.join(target, 'packages', 'explorer')
    : pathExists(path.join(dockiRoot, 'packages', 'explorer'))
      ? path.join(dockiRoot, 'packages', 'explorer')
      : null;

  if (!explorerDir && !vsix) {
    throw Object.assign(
      new Error('Could not find packages/explorer. Run install-explorer from a Docki checkout.'),
      { exitCode: 1 },
    );
  }

  let vsixPath = vsix;
  if (!vsixPath) {
    if (!skipBuild) {
      console.log(`Building Docki Explorer in ${explorerDir}`);
      if (!pathExists(path.join(explorerDir, 'node_modules'))) {
        run('npm', ['install'], { cwd: explorerDir });
      }
      run('npm', ['run', 'package'], { cwd: explorerDir });
    }
    vsixPath = latestVsix(explorerDir);
    if (!vsixPath) {
      throw Object.assign(new Error('No .vsix produced. Check packages/explorer package script.'), {
        exitCode: 1,
      });
    }
  }

  if (!pathExists(vsixPath)) {
    throw Object.assign(new Error(`VSIX not found: ${vsixPath}`), { exitCode: 1 });
  }

  const cli = findCli();
  if (!cli) {
    console.log(`Built VSIX: ${vsixPath}`);
    console.log('No Cursor/VS Code CLI found on PATH.');
    console.log('Install manually:');
    console.log(`  cursor --install-extension "${vsixPath}"`);
    console.log(`  code --install-extension "${vsixPath}"`);
    return;
  }

  console.log(`Installing ${path.basename(vsixPath)} via ${cli}`);
  run(cli, ['--install-extension', vsixPath]);
  console.log('Docki Explorer installed. Reload the window if it does not appear.');
}

module.exports = { installExplorerCommand };
