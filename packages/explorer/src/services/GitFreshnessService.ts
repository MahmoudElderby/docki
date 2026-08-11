import { execFile } from 'child_process';
import * as fs from 'fs';
import * as util from 'util';
import * as vscode from 'vscode';
import {
  FRESHNESS_BADGE_STALE,
  FRESHNESS_BADGE_UNKNOWN,
  FRESHNESS_BADGE_UP_TO_DATE,
} from '../constants';
import { FreshnessStatus } from '../types';
import { parseFreshnessMetadata } from '../utils/freshnessParser';
import { logInfo, logWarn } from '../output';

const execFileAsync = util.promisify(execFile);

export class GitFreshnessService {
  private current: FreshnessStatus = createUnknown();
  private readonly _onDidChangeFreshness = new vscode.EventEmitter<FreshnessStatus>();
  readonly onDidChangeFreshness = this._onDidChangeFreshness.event;

  getCurrent(): FreshnessStatus {
    return this.current;
  }

  async evaluate(readmeUri: vscode.Uri | null): Promise<FreshnessStatus> {
    if (!readmeUri || !fs.existsSync(readmeUri.fsPath)) {
      this.current = createUnknown();
      this._onDidChangeFreshness.fire(this.current);
      return this.current;
    }

    let readmeCommit: string | null = null;
    try {
      const content = fs.readFileSync(readmeUri.fsPath, 'utf8');
      readmeCommit = parseFreshnessMetadata(content).commit;
    } catch {
      this.current = createUnknown();
      this._onDidChangeFreshness.fire(this.current);
      return this.current;
    }

    if (!readmeCommit) {
      this.current = createUnknown();
      this._onDidChangeFreshness.fire(this.current);
      return this.current;
    }

    const headCommit = await this.getHeadCommit(readmeUri);
    if (!headCommit) {
      logWarn('Git unavailable; freshness unknown');
      this.current = createUnknown();
      this._onDidChangeFreshness.fire(this.current);
      return this.current;
    }

    const normalizedReadme = readmeCommit.slice(0, 40);
    const normalizedHead = headCommit.slice(0, 40);

    if (
      normalizedHead.startsWith(normalizedReadme) ||
      normalizedReadme.startsWith(normalizedHead)
    ) {
      this.current = {
        state: 'up-to-date',
        readmeCommit: normalizedReadme,
        headCommit: normalizedHead,
        commitDistance: 0,
        badge: FRESHNESS_BADGE_UP_TO_DATE,
      };
    } else {
      const distance = await this.getCommitDistance(readmeUri, normalizedReadme, normalizedHead);
      this.current = {
        state: 'potentially-stale',
        readmeCommit: normalizedReadme,
        headCommit: normalizedHead,
        commitDistance: distance,
        badge: FRESHNESS_BADGE_STALE,
      };
    }

    logInfo(`Freshness: ${this.current.state} (readme=${normalizedReadme}, head=${normalizedHead})`);
    this._onDidChangeFreshness.fire(this.current);
    return this.current;
  }

  private async getHeadCommit(readmeUri: vscode.Uri): Promise<string | null> {
    const gitExt = vscode.extensions.getExtension('vscode.git');
    if (gitExt?.isActive) {
      try {
        const git = gitExt.exports.getAPI(1);
        const repo = git.getRepository(readmeUri);
        if (repo?.state?.HEAD?.commit) {
          return repo.state.HEAD.commit;
        }
      } catch {
        // fallback below
      }
    }

    try {
      const cwd = vscode.Uri.joinPath(readmeUri, '..', '..').fsPath;
      const { stdout } = await execFileAsync('git', ['rev-parse', 'HEAD'], { cwd });
      return stdout.trim();
    } catch {
      return null;
    }
  }

  private async getCommitDistance(
    readmeUri: vscode.Uri,
    fromCommit: string,
    toCommit: string
  ): Promise<number | null> {
    try {
      const cwd = vscode.Uri.joinPath(readmeUri, '..', '..').fsPath;
      const { stdout } = await execFileAsync(
        'git',
        ['rev-list', '--count', `${fromCommit}..${toCommit}`],
        { cwd }
      );
      return parseInt(stdout.trim(), 10);
    } catch {
      return null;
    }
  }
}

function createUnknown(): FreshnessStatus {
  return {
    state: 'unknown',
    readmeCommit: null,
    headCommit: null,
    commitDistance: null,
    badge: FRESHNESS_BADGE_UNKNOWN,
  };
}

export async function evaluateFreshnessFromReadme(
  readmeContent: string,
  headCommit: string | null
): Promise<FreshnessStatus> {
  const readmeCommit = parseFreshnessMetadata(readmeContent).commit;
  if (!readmeCommit || !headCommit) {
    return createUnknown();
  }
  const nr = readmeCommit.slice(0, 40);
  const nh = headCommit.slice(0, 40);
  if (nh.startsWith(nr) || nr.startsWith(nh)) {
    return {
      state: 'up-to-date',
      readmeCommit: nr,
      headCommit: nh,
      commitDistance: 0,
      badge: FRESHNESS_BADGE_UP_TO_DATE,
    };
  }
  return {
    state: 'potentially-stale',
    readmeCommit: nr,
    headCommit: nh,
    commitDistance: null,
    badge: FRESHNESS_BADGE_STALE,
  };
}
