'use strict';

const fs = require('fs');
const path = require('path');
const { copyTree, ensureDir, pathExists, readText, writeText } = require('../fsutil');
const { installExplorerCommand } = require('./install-explorer');

const KIT_PATHS = [
  '.cursor/skills/docki-knowledge',
  '.cursor/skills/docki-update',
  '.cursor/agents/system-architect.md',
  '.cursor/agents/domain-analyzer.md',
  '.cursor/agents/integration-analyzer.md',
  '.cursor/agents/data-analyzer.md',
  '.cursor/agents/infrastructure-analyzer.md',
  '.cursor/rules/docki.mdc',
  'AGENTS.md',
  'MODEL-RECOMMENDATIONS.md',
];

async function initCommand({ dockiRoot, target, force, dryRun, withExplorer }) {
  const kitRoot = path.join(dockiRoot, 'kit');
  const templateRoot = path.join(dockiRoot, 'templates');

  if (!pathExists(kitRoot)) {
    throw Object.assign(
      new Error(`Docki kit not found at ${kitRoot}. Run from a full Docki checkout or published package.`),
      { exitCode: 1 },
    );
  }

  console.log(`Docki init → ${target}`);
  if (dryRun) console.log('(dry-run)');

  const conflicts = [];
  for (const rel of KIT_PATHS) {
    const dest = path.join(target, rel);
    if (pathExists(dest) && !force) conflicts.push(rel);
  }

  if (conflicts.length && !force) {
    console.error('Refusing to overwrite existing files (pass --force):');
    for (const c of conflicts) console.error(`  - ${c}`);
    throw Object.assign(new Error('Init aborted due to conflicts'), { exitCode: 3 });
  }

  // Copy kit/.cursor tree
  const cursorSrc = path.join(kitRoot, '.cursor');
  const cursorDest = path.join(target, '.cursor');
  if (!dryRun) {
    ensureDir(cursorDest);
    copyTree(path.join(cursorSrc, 'skills'), path.join(cursorDest, 'skills'), { force });
    copyTree(path.join(cursorSrc, 'agents'), path.join(cursorDest, 'agents'), { force });
    copyTree(path.join(cursorSrc, 'rules'), path.join(cursorDest, 'rules'), { force });
  }
  console.log('  + .cursor/skills/docki-*');
  console.log('  + .cursor/agents/*');
  console.log('  + .cursor/rules/docki.mdc');

  // Root guidance files — merge AGENTS.md carefully
  for (const file of ['AGENTS.md', 'MODEL-RECOMMENDATIONS.md']) {
    const src = path.join(kitRoot, file);
    const dest = path.join(target, file);
    if (!pathExists(src)) continue;
    if (!dryRun) {
      if (file === 'AGENTS.md' && pathExists(dest) && !force) {
        // already handled by conflicts; with --force overwrite
      }
      writeText(dest, readText(src));
    }
    console.log(`  + ${file}`);
  }

  // knowledge scaffold
  const knowledgeDest = path.join(target, 'knowledge');
  const scaffoldSrc = path.join(templateRoot, 'knowledge');
  if (!dryRun) {
    ensureDir(knowledgeDest);
    if (pathExists(scaffoldSrc)) {
      // only copy missing scaffold files
      copyTree(scaffoldSrc, knowledgeDest, { force: false, skipExisting: true });
    } else {
      const gitkeep = path.join(knowledgeDest, '.gitkeep');
      if (!pathExists(gitkeep)) writeText(gitkeep, '');
    }
  }
  console.log('  + knowledge/ (scaffold)');

  console.log('');
  console.log('Next steps:');
  console.log('  1. Open the repo in Cursor');
  console.log('  2. Invoke the skill: docki-knowledge');
  console.log('  3. Optional: docki install-explorer');
  console.log('');
  console.log('See docs/getting-started.md');

  if (withExplorer) {
    console.log('');
    await installExplorerCommand({ dockiRoot, target: dockiRoot, skipBuild: false, vsix: null });
  }
}

module.exports = { initCommand, KIT_PATHS };
