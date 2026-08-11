import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';

export function toPosixRelative(fromRoot: vscode.Uri, target: vscode.Uri): string {
  const rootPath = fromRoot.fsPath.replace(/\\/g, '/');
  const targetPath = target.fsPath.replace(/\\/g, '/');
  if (!targetPath.startsWith(rootPath)) {
    return targetPath;
  }
  return targetPath.slice(rootPath.length).replace(/^\//, '');
}

export function resolveWorkspaceRelative(
  workspaceRoot: vscode.Uri,
  rawPath: string
): { uri: vscode.Uri; rejected: boolean } {
  const normalized = rawPath.replace(/\\/g, '/').split('#')[0];
  if (normalized.includes('..')) {
    return { uri: vscode.Uri.file(''), rejected: true };
  }
  const absolute = path.resolve(workspaceRoot.fsPath, normalized);
  const rootResolved = path.resolve(workspaceRoot.fsPath);
  if (!absolute.startsWith(rootResolved + path.sep) && absolute !== rootResolved) {
    return { uri: vscode.Uri.file(''), rejected: true };
  }
  return { uri: vscode.Uri.file(absolute), rejected: false };
}

export function isSymlinkOutsideRoot(
  workspaceRoot: vscode.Uri,
  targetPath: string
): boolean {
  try {
    const stat = fs.lstatSync(targetPath);
    if (!stat.isSymbolicLink()) {
      return false;
    }
    const resolved = fs.realpathSync(targetPath);
    const rootResolved = fs.realpathSync(workspaceRoot.fsPath);
    return !resolved.startsWith(rootResolved + path.sep) && resolved !== rootResolved;
  } catch {
    return false;
  }
}

export function knowledgeUri(workspaceRoot: vscode.Uri): vscode.Uri {
  return vscode.Uri.joinPath(workspaceRoot, 'knowledge');
}
