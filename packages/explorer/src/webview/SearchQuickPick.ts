import * as vscode from 'vscode';
import { SEARCH_DEBOUNCE_MS } from '../constants';
import { MarkdownDocumentService } from '../services/MarkdownDocumentService';
import { SearchIndexService } from '../services/SearchIndexService';

export class SearchQuickPick {
  private debounceTimer: ReturnType<typeof setTimeout> | undefined;

  constructor(
    private readonly searchIndex: SearchIndexService,
    private readonly markdownService: MarkdownDocumentService
  ) {}

  show(): void {
    const quickPick = vscode.window.createQuickPick();
    quickPick.placeholder = 'Search knowledge base…';
    quickPick.matchOnDescription = true;
    quickPick.matchOnDetail = true;

    if (!this.searchIndex.ready) {
      quickPick.busy = true;
      quickPick.placeholder = 'Indexing…';
    }

    const readyListener = this.searchIndex.onDidChangeIndex(() => {
      quickPick.busy = false;
      quickPick.placeholder = 'Search knowledge base…';
    });

    quickPick.onDidChangeValue((value) => {
      if (this.debounceTimer) {
        clearTimeout(this.debounceTimer);
      }
      this.debounceTimer = setTimeout(() => {
        this.updateItems(quickPick, value);
      }, SEARCH_DEBOUNCE_MS);
    });

    quickPick.onDidAccept(() => {
      const selected = quickPick.selectedItems[0];
      if (selected && selected.uri) {
        void this.markdownService.open(selected.uri, {
          scrollAnchor: selected.anchor ?? undefined,
          lineHint: selected.lineHint ?? undefined,
        });
      }
      quickPick.hide();
    });

    quickPick.onDidHide(() => {
      readyListener.dispose();
      if (this.debounceTimer) clearTimeout(this.debounceTimer);
      quickPick.dispose();
    });

    quickPick.show();
  }

  private updateItems(
    quickPick: vscode.QuickPick<SearchQuickPickItem>,
    query: string
  ): void {
    if (!query.trim()) {
      quickPick.items = [];
      return;
    }
    const results = this.searchIndex.search(query);
    quickPick.items = results.map((r) => ({
      label: r.displayName,
      description: r.categoryLabel,
      detail: r.snippet,
      uri: r.uri,
      anchor: r.anchor,
      lineHint: r.lineHint,
    }));
  }
}

interface SearchQuickPickItem extends vscode.QuickPickItem {
  uri?: vscode.Uri;
  anchor?: string | null;
  lineHint?: number | null;
}
