import { assert } from 'chai';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { resolveWorkspaceRelative, isSymlinkOutsideRoot } from '../../src/utils/paths';

describe('paths', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'arch-expl-'));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('resolves workspace-relative paths', () => {
    const root = { fsPath: tmpDir } as import('vscode').Uri;
    const result = resolveWorkspaceRelative(root, 'knowledge/README.md');
    assert.isFalse(result.rejected);
    assert.equal(result.uri.fsPath, path.join(tmpDir, 'knowledge', 'README.md'));
  });

  it('rejects .. traversal', () => {
    const root = { fsPath: tmpDir } as import('vscode').Uri;
    const result = resolveWorkspaceRelative(root, '../../outside.txt');
    assert.isTrue(result.rejected);
  });

  it('detects symlink outside root', () => {
    if (process.platform === 'win32') {
      // Symlink tests may require elevated privileges on Windows; skip gracefully
      return;
    }
    const outside = fs.mkdtempSync(path.join(os.tmpdir(), 'outside-'));
    const inside = path.join(tmpDir, 'knowledge');
    fs.mkdirSync(inside);
    const linkPath = path.join(inside, 'link');
    fs.symlinkSync(outside, linkPath);
    const root = { fsPath: tmpDir } as import('vscode').Uri;
    assert.isTrue(isSymlinkOutsideRoot(root, linkPath));
    fs.rmSync(outside, { recursive: true, force: true });
  });
});
