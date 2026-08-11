import Fuse from 'fuse.js';
import * as fs from 'fs';
import * as vscode from 'vscode';
import { MAX_FILE_BYTES } from '../constants';
import { KnowledgeDocument, SearchResult } from '../types';
import { buildSnippet } from '../utils/snippets';

interface IndexEntry {
  document: KnowledgeDocument;
  bodyRaw: string;
  bodyLower: string;
  headingTexts: string[];
}

export class SearchIndexService {
  private entries = new Map<string, IndexEntry>();
  private fuse: Fuse<IndexEntry> | null = null;
  private _ready = false;
  private readonly _onDidChangeIndex = new vscode.EventEmitter<void>();
  readonly onDidChangeIndex = this._onDidChangeIndex.event;

  get ready(): boolean {
    return this._ready;
  }

  async rebuild(documents: KnowledgeDocument[]): Promise<void> {
    this._ready = false;
    this.entries.clear();
    for (const doc of documents) {
      await this.loadEntry(doc);
    }
    this.rebuildFuse();
    this._ready = true;
    this._onDidChangeIndex.fire();
  }

  upsert(document: KnowledgeDocument, body?: string): void {
    const content = body ?? this.readBody(document.uri.fsPath);
    const truncated = content.slice(0, MAX_FILE_BYTES);
    this.entries.set(document.id, {
      document,
      bodyRaw: truncated,
      bodyLower: truncated.toLowerCase(),
      headingTexts: document.headings.map((h) => h.text),
    });
    this.rebuildFuse();
    this._onDidChangeIndex.fire();
  }

  remove(documentId: string): void {
    if (this.entries.delete(documentId)) {
      this.rebuildFuse();
      this._onDidChangeIndex.fire();
    }
  }

  search(query: string, limit = 50): SearchResult[] {
    if (!query.trim()) {
      return [];
    }
    const q = query.trim();
    const qLower = q.toLowerCase();
    const results: SearchResult[] = [];
    const seen = new Set<string>();

    if (this.fuse) {
      for (const r of this.fuse.search(q, { limit: limit * 2 })) {
        const doc = r.item.document;
        const key = `${doc.id}:filename`;
        if (seen.has(key)) continue;
        seen.add(key);
        results.push({
          documentId: doc.id,
          uri: doc.uri,
          displayName: doc.displayName,
          categoryLabel: doc.categoryLabel,
          matchKind: 'filename',
          score: r.score ?? 0,
          snippet: doc.displayName,
          anchor: null,
          lineHint: null,
        });
      }
    }

    for (const entry of this.entries.values()) {
      for (const heading of entry.document.headings) {
        if (heading.text.toLowerCase().includes(qLower)) {
          const key = `${entry.document.id}:heading:${heading.slug}`;
          if (seen.has(key)) continue;
          seen.add(key);
          results.push({
            documentId: entry.document.id,
            uri: entry.document.uri,
            displayName: entry.document.displayName,
            categoryLabel: entry.document.categoryLabel,
            matchKind: 'heading',
            score: 0.1,
            snippet: heading.text,
            anchor: heading.slug,
            lineHint: heading.line,
          });
        }
      }

      const idx = entry.bodyLower.indexOf(qLower);
      if (idx >= 0) {
        const key = `${entry.document.id}:body`;
        if (!seen.has(key)) {
          seen.add(key);
          const lineHint = entry.bodyRaw.slice(0, idx).split('\n').length;
          results.push({
            documentId: entry.document.id,
            uri: entry.document.uri,
            displayName: entry.document.displayName,
            categoryLabel: entry.document.categoryLabel,
            matchKind: 'body',
            score: 0.5,
            snippet: buildSnippet(entry.bodyRaw, idx, q.length),
            anchor: null,
            lineHint,
          });
        }
      }
    }

    return results
      .sort((a, b) => a.score - b.score)
      .slice(0, limit);
  }

  private async loadEntry(doc: KnowledgeDocument): Promise<void> {
    const content = this.readBody(doc.uri.fsPath);
    this.entries.set(doc.id, {
      document: doc,
      bodyRaw: content,
      bodyLower: content.toLowerCase(),
      headingTexts: doc.headings.map((h) => h.text),
    });
  }

  private readBody(filePath: string): string {
    try {
      const buf = fs.readFileSync(filePath);
      return buf.slice(0, MAX_FILE_BYTES).toString('utf8');
    } catch {
      return '';
    }
  }

  private rebuildFuse(): void {
    const list = [...this.entries.values()];
    this.fuse = new Fuse(list, {
      keys: [
        { name: 'document.fileName', weight: 0.4 },
        { name: 'document.displayName', weight: 0.3 },
        { name: 'headingTexts', weight: 0.3 },
      ],
      threshold: 0.4,
      includeScore: true,
    });
  }
}
