import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';
import { KNOWLEDGE_DIR } from '../constants';
import { logInfo, logWarn } from '../output';
import { KnowledgeDocument, KnowledgePresence, KnowledgeWorkspace } from '../types';
import { isSymlinkOutsideRoot, knowledgeUri, toPosixRelative } from '../utils/paths';
import { prettifyLabel } from '../utils/labels';
import { compareTreeEntries, isPinnedFile } from '../utils/treeSort';
import MarkdownIt from 'markdown-it';

const md = new MarkdownIt();

async function scanMarkdownFiles(dir: string): Promise<string[]> {
  const results: string[] = [];
  if (!fs.existsSync(dir)) {
    return results;
  }
  const entries = await fs.promises.readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isSymbolicLink() && isSymlinkOutsideRoot(vscode.Uri.file(dir), full)) {
      continue;
    }
    if (entry.isDirectory()) {
      results.push(...(await scanMarkdownFiles(full)));
    } else if (entry.isFile() && entry.name.toLowerCase().endsWith('.md')) {
      results.push(full);
    }
  }
  return results;
}

function extractHeadings(content: string): KnowledgeDocument['headings'] {
  const headings: KnowledgeDocument['headings'] = [];
  const lines = content.split('\n');
  let offset = 0;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const match = line.match(/^(#{1,6})\s+(.+)$/);
    if (match) {
      const text = match[2].trim();
      const slug = text
        .toLowerCase()
        .replace(/[^\w\s-]/g, '')
        .replace(/\s+/g, '-');
      headings.push({
        level: match[1].length,
        text,
        slug,
        offset,
        line: i + 1,
      });
    }
    offset += line.length + 1;
  }
  return headings;
}

export function buildDocument(
  knowledgeRoot: vscode.Uri,
  filePath: string,
  stat?: fs.Stats
): KnowledgeDocument {
  const uri = vscode.Uri.file(filePath);
  const id = toPosixRelative(knowledgeRoot, uri);
  const fileName = path.basename(filePath);
  const categoryPath = path.dirname(id === fileName ? '' : id).replace(/\\/g, '/');
  const categoryLabel = categoryPath
    ? prettifyLabel(path.basename(categoryPath))
    : 'Knowledge';
  const fileStat = stat ?? fs.statSync(filePath);
  let content = '';
  try {
    const buf = fs.readFileSync(filePath);
    content = buf.slice(0, Math.min(buf.length, 512 * 1024)).toString('utf8');
  } catch {
    content = '';
  }
  return {
    id,
    uri,
    fileName,
    displayName: prettifyLabel(fileName),
    categoryPath: categoryPath === '.' ? '' : categoryPath,
    categoryLabel,
    headings: extractHeadings(content),
    byteSize: fileStat.size,
    indexedByteLength: Math.min(fileStat.size, 5_242_880),
    lastModified: fileStat.mtimeMs,
    isPinnedName: isPinnedFile(fileName),
  };
}

export async function discoverDocuments(
  knowledgeRoot: vscode.Uri
): Promise<KnowledgeDocument[]> {
  const files = await scanMarkdownFiles(knowledgeRoot.fsPath);
  return files
    .map((f) => buildDocument(knowledgeRoot, f))
    .sort((a, b) =>
      compareTreeEntries(
        { name: a.fileName, isFolder: false, isPinned: a.isPinnedName },
        { name: b.fileName, isFolder: false, isPinned: b.isPinnedName }
      )
    );
}

export class KnowledgeWorkspaceService {
  private workspace: KnowledgeWorkspace | undefined;
  private readonly _onDidChangeWorkspace = new vscode.EventEmitter<KnowledgeWorkspace>();
  readonly onDidChangeWorkspace = this._onDidChangeWorkspace.event;

  getActive(): KnowledgeWorkspace | undefined {
    return this.workspace;
  }

  async refresh(): Promise<KnowledgeWorkspace> {
    const folders = vscode.workspace.workspaceFolders ?? [];
    if (folders.length === 0) {
      throw new Error('No workspace folders');
    }

    let chosen = folders[0];
    let chosenIndex = 0;
    for (let i = 0; i < folders.length; i++) {
      const kPath = path.join(folders[i].uri.fsPath, KNOWLEDGE_DIR);
      if (fs.existsSync(kPath)) {
        chosen = folders[i];
        chosenIndex = i;
        break;
      }
    }

    const knowledgePath = path.join(chosen.uri.fsPath, KNOWLEDGE_DIR);
    let presence: KnowledgePresence = 'missing';
    let knowledgeRoot: vscode.Uri | null = null;
    let followsSymlink = false;

    if (fs.existsSync(knowledgePath)) {
      if (isSymlinkOutsideRoot(chosen.uri, knowledgePath)) {
        logWarn(`Knowledge folder symlink escapes workspace: ${knowledgePath}`);
        presence = 'missing';
      } else {
        knowledgeRoot = knowledgeUri(chosen.uri);
        followsSymlink = fs.lstatSync(knowledgePath).isSymbolicLink();
        const mdFiles = await scanMarkdownFiles(knowledgePath);
        presence = mdFiles.length > 0 ? 'populated' : 'empty';
      }
    }

    const workspace: KnowledgeWorkspace = {
      workspaceRoot: chosen.uri,
      workspaceRootLabel: chosen.name,
      knowledgeRoot,
      presence,
      activeRootIndex: chosenIndex,
      followsSymlink,
    };

    const changed =
      !this.workspace ||
      this.workspace.workspaceRoot.fsPath !== workspace.workspaceRoot.fsPath ||
      this.workspace.presence !== workspace.presence;

    this.workspace = workspace;
    logInfo(
      `Knowledge workspace: ${workspace.workspaceRootLabel} (${presence})` +
        (folders.length > 1 ? ' [multi-root: first folder with /knowledge]' : '')
    );

    if (changed) {
      this._onDidChangeWorkspace.fire(workspace);
    }
    return workspace;
  }
}

export { scanMarkdownFiles, extractHeadings };
