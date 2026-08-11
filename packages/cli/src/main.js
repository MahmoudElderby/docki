'use strict';

const path = require('path');
const { initCommand } = require('./commands/init');
const { doctorCommand } = require('./commands/doctor');
const { installExplorerCommand } = require('./commands/install-explorer');
const { version } = require('../../../package.json');

const HELP = `
Docki — architecture knowledge for Cursor and VS Code

Usage:
  docki <command> [options]

Commands:
  init                 Install the Docki Cursor kit into a repository
  doctor               Check that Docki files are present and look healthy
  install-explorer     Build and install the Docki Explorer VS Code/Cursor extension
  help                 Show this help
  version              Show version

Options for init:
  --target <dir>       Target repository root (default: current directory)
  --force              Overwrite existing Docki kit files
  --dry-run            Print actions without writing files
  --with-explorer      Also run install-explorer after init

Options for install-explorer:
  --target <dir>       Repo that owns packages/explorer, or Docki checkout (default: Docki root)
  --skip-build         Install an existing .vsix without rebuilding
  --vsix <path>        Install a specific .vsix file

Examples:
  npx docki init
  npx docki init --target ./my-service --force
  npx docki doctor
  npx docki install-explorer
`.trim();

function parseArgs(argv) {
  const args = { _: [], flags: {} };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--force' || a === '--dry-run' || a === '--with-explorer' || a === '--skip-build') {
      args.flags[a.slice(2)] = true;
    } else if (a === '--target' || a === '--vsix') {
      const key = a.slice(2);
      const val = argv[++i];
      if (!val) throw Object.assign(new Error(`Missing value for ${a}`), { exitCode: 2 });
      args.flags[key] = val;
    } else if (a === '--help' || a === '-h') {
      args.flags.help = true;
    } else if (a === '--version' || a === '-v') {
      args.flags.version = true;
    } else if (a.startsWith('-')) {
      throw Object.assign(new Error(`Unknown option: ${a}`), { exitCode: 2 });
    } else {
      args._.push(a);
    }
  }
  return args;
}

async function main(argv) {
  const args = parseArgs(argv);
  const command = args._[0];

  if (!command || command === 'help' || args.flags.help) {
    console.log(HELP);
    return;
  }
  if (command === 'version' || args.flags.version) {
    console.log(version);
    return;
  }

  const dockiRoot = path.resolve(__dirname, '../../..');

  if (command === 'init') {
    await initCommand({
      dockiRoot,
      target: path.resolve(args.flags.target || process.cwd()),
      force: !!args.flags.force,
      dryRun: !!args.flags['dry-run'],
      withExplorer: !!args.flags['with-explorer'],
    });
    return;
  }

  if (command === 'doctor') {
    await doctorCommand({
      target: path.resolve(args.flags.target || process.cwd()),
    });
    return;
  }

  if (command === 'install-explorer') {
    await installExplorerCommand({
      dockiRoot,
      target: path.resolve(args.flags.target || dockiRoot),
      skipBuild: !!args.flags['skip-build'],
      vsix: args.flags.vsix ? path.resolve(args.flags.vsix) : null,
    });
    return;
  }

  throw Object.assign(new Error(`Unknown command: ${command}\n\n${HELP}`), { exitCode: 2 });
}

module.exports = { main, parseArgs };
