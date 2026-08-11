import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';
import { ALLOWED_EVIDENCE_EXTENSIONS, EVIDENCE_PATH_REGEX } from '../constants';
import { EvidenceLink, EvidenceStatus } from '../types';
import { resolveWorkspaceRelative } from '../utils/paths';

export class EvidenceLinkResolver {
  classify(rawToken: string): EvidenceLink {
    const token = rawToken.trim();
    const match = token.match(EVIDENCE_PATH_REGEX);
    if (!match) {
      return {
        rawToken: token,
        filePath: token,
        lineStart: null,
        lineEnd: null,
        status: 'rejected',
      };
    }

    const filePath = match[1];
    const ext = path.extname(filePath).toLowerCase();
    if (ext && !ALLOWED_EVIDENCE_EXTENSIONS.has(ext)) {
      return {
        rawToken: token,
        filePath,
        lineStart: null,
        lineEnd: null,
        status: 'rejected',
      };
    }

    const lineStart = match[2] ? parseInt(match[2], 10) : null;
    const lineEnd = match[3] ? parseInt(match[3], 10) : lineStart;

    return {
      rawToken: token,
      filePath,
      lineStart,
      lineEnd,
      status: 'resolved',
    };
  }

  async resolveAndOpen(rawToken: string, workspaceRoot: vscode.Uri): Promise<void> {
    const link = this.classify(rawToken);
    if (link.status === 'rejected') {
      vscode.window.showWarningMessage(`Path rejected: ${rawToken}`);
      return;
    }

    const { uri, rejected } = resolveWorkspaceRelative(workspaceRoot, link.filePath);
    if (rejected) {
      vscode.window.showWarningMessage(`Path rejected: ${rawToken}`);
      return;
    }

    if (!fs.existsSync(uri.fsPath)) {
      vscode.window.showWarningMessage(`File not found: ${link.filePath}`);
      return;
    }

    const doc = await vscode.workspace.openTextDocument(uri);
    const editor = await vscode.window.showTextDocument(doc, { preview: false });

    if (link.lineStart !== null) {
      const startLine = Math.max(0, link.lineStart - 1);
      const endLine = link.lineEnd !== null ? link.lineEnd - 1 : startLine;
      const start = new vscode.Position(startLine, 0);
      const end = doc.lineAt(Math.min(endLine, doc.lineCount - 1)).range.end;
      editor.selection = new vscode.Selection(start, end);
      editor.revealRange(new vscode.Range(start, end), vscode.TextEditorRevealType.InCenter);
    }
  }

  enrichHtml(html: string, workspaceRoot: vscode.Uri): string {
    return html
      .replace(/<code>([^<]+)<\/code>/g, (_m, inner: string) => {
        const token = inner.trim();
        const link = this.classify(token);
        if (link.status === 'rejected') {
          return `<code>${inner}</code>`;
        }
        const escaped = this.escapeAttr(token);
        return `<code class="evidence-link" data-evidence="${escaped}">${inner}</code>`;
      })
      .replace(/<a href="([^"]+)">/g, (_m, href: string) => {
        const token = decodeURIComponent(href);
        const link = this.classify(token);
        if (link.status === 'rejected' || href.startsWith('http')) {
          return `<a href="${href}">`;
        }
        const escaped = this.escapeAttr(token);
        return `<a href="#" class="evidence-link" data-evidence="${escaped}">`;
      });
  }

  private escapeAttr(value: string): string {
    return value
      .replace(/&/g, '&amp;')
      .replace(/"/g, '&quot;')
      .replace(/</g, '&lt;');
  }
}

export function classifyEvidence(rawToken: string): EvidenceLink {
  return new EvidenceLinkResolver().classify(rawToken);
}

export function enrichEvidenceHtml(html: string, workspaceRootPath?: string): string {
  const resolver = new EvidenceLinkResolver();
  const root = { fsPath: workspaceRootPath ?? process.cwd() } as import('vscode').Uri;
  return resolver.enrichHtml(html, root);
}
