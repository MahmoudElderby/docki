import * as vscode from 'vscode';
import { WATCHER_COALESCE_MS } from '../constants';
import { KnowledgeChangeEvent, KnowledgeWorkspace } from '../types';

export class CoalescingEmitter {
  private timer: ReturnType<typeof setTimeout> | undefined;
  private pending: vscode.Uri[] = [];
  private pendingKind: KnowledgeChangeEvent['kind'] = 'change';

  constructor(
    private readonly delayMs: number,
    private readonly fire: (event: KnowledgeChangeEvent) => void
  ) {}

  push(kind: KnowledgeChangeEvent['kind'], uris: vscode.Uri[]): void {
    this.pendingKind = kind;
    this.pending.push(...uris);
    if (this.timer) {
      clearTimeout(this.timer);
    }
    this.timer = setTimeout(() => {
      const event: KnowledgeChangeEvent = {
        kind: this.pendingKind,
        uris: [...this.pending],
      };
      this.pending = [];
      this.timer = undefined;
      this.fire(event);
    }, this.delayMs);
  }

  dispose(): void {
    if (this.timer) {
      clearTimeout(this.timer);
    }
  }
}

export class KnowledgeFileWatcher implements vscode.Disposable {
  private watcher: vscode.FileSystemWatcher | undefined;
  private coalescer: CoalescingEmitter | undefined;
  private readonly _onDidChangeKnowledge = new vscode.EventEmitter<KnowledgeChangeEvent>();
  readonly onDidChangeKnowledge = this._onDidChangeKnowledge.event;

  reset(workspace: KnowledgeWorkspace): void {
    this.disposeWatcher();
    if (!workspace.knowledgeRoot) {
      return;
    }
    const pattern = new vscode.RelativePattern(
      workspace.knowledgeRoot,
      '**/*.md'
    );
    this.watcher = vscode.workspace.createFileSystemWatcher(pattern);
    this.coalescer = new CoalescingEmitter(WATCHER_COALESCE_MS, (event) =>
      this._onDidChangeKnowledge.fire(event)
    );

    this.watcher.onDidCreate((uri) => this.coalescer!.push('create', [uri]));
    this.watcher.onDidChange((uri) => this.coalescer!.push('change', [uri]));
    this.watcher.onDidDelete((uri) => this.coalescer!.push('delete', [uri]));
  }

  private disposeWatcher(): void {
    this.coalescer?.dispose();
    this.coalescer = undefined;
    this.watcher?.dispose();
    this.watcher = undefined;
  }

  dispose(): void {
    this.disposeWatcher();
    this._onDidChangeKnowledge.dispose();
  }
}
