'use strict';

const fs = require('fs');
const path = require('path');
const { pathExists, readText } = require('../fsutil');

const REQUIRED = [
  { path: '.cursor/skills/docki-knowledge/SKILL.md', label: 'docki-knowledge skill' },
  { path: '.cursor/skills/docki-update/SKILL.md', label: 'docki-update skill' },
  { path: '.cursor/agents/system-architect.md', label: 'system-architect agent' },
  { path: '.cursor/agents/domain-analyzer.md', label: 'domain-analyzer agent' },
  { path: '.cursor/agents/integration-analyzer.md', label: 'integration-analyzer agent' },
  { path: '.cursor/agents/data-analyzer.md', label: 'data-analyzer agent' },
  { path: '.cursor/agents/infrastructure-analyzer.md', label: 'infrastructure-analyzer agent' },
  { path: '.cursor/rules/docki.mdc', label: 'docki rule' },
  { path: 'knowledge', label: 'knowledge/ directory', dir: true },
];

async function doctorCommand({ target }) {
  console.log(`Docki doctor → ${target}`);
  let ok = 0;
  let warn = 0;
  let fail = 0;

  for (const item of REQUIRED) {
    const full = path.join(target, item.path);
    const exists = pathExists(full);
    if (!exists) {
      console.log(`  ✗ missing ${item.label} (${item.path})`);
      fail++;
      continue;
    }
    if (item.dir) {
      const hasMd = fs.readdirSync(full).some((f) => f.endsWith('.md'));
      if (!hasMd) {
        console.log(`  ○ ${item.label} exists but has no .md yet (run docki-knowledge)`);
        warn++;
      } else {
        console.log(`  ✓ ${item.label}`);
        ok++;
      }
      continue;
    }
    console.log(`  ✓ ${item.label}`);
    ok++;
  }

  const agentsMd = path.join(target, 'AGENTS.md');
  if (pathExists(agentsMd)) {
    const text = readText(agentsMd);
    if (/docki-knowledge|\/knowledge/.test(text)) {
      console.log('  ✓ AGENTS.md mentions Docki / knowledge');
      ok++;
    } else {
      console.log('  ○ AGENTS.md present but does not mention docki-knowledge');
      warn++;
    }
  } else {
    console.log('  ○ AGENTS.md missing (optional but recommended)');
    warn++;
  }

  console.log('');
  console.log(`Result: ${ok} ok, ${warn} warnings, ${fail} failed`);
  if (fail > 0) {
    throw Object.assign(new Error('Docki doctor found missing required files. Run: docki init'), {
      exitCode: 1,
    });
  }
}

module.exports = { doctorCommand };
