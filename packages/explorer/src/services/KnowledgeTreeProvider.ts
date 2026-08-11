import * as vscode from 'vscode';
import {
  CategoryNode,
  DocumentNode,
  EmptyStateNode,
  KnowledgeDocument,
  TreeNode,
} from '../types';
import { KnowledgeWorkspaceService, discoverDocuments } from './KnowledgeWorkspaceService';
import { compareTreeEntries } from '../utils/treeSort';
import { prettifyLabel } from '../utils/labels';
import * as path from 'path';

export class KnowledgeTreeProvider implements vscode.TreeDataProvider<TreeNode> {
  private readonly _onDidChangeTreeData = new vscode.EventEmitter<TreeNode | undefined | void>();
  readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

  private documents: KnowledgeDocument[] = [];
  private categoryMap = new Map<string, CategoryNode>();

  constructor(private readonly workspaceService: KnowledgeWorkspaceService) {}

  refresh(): Promise<void> {
    return this.reload();
  }

  async reload(): Promise<void> {
    const ws = this.workspaceService.getActive();
    if (!ws?.knowledgeRoot || ws.presence !== 'populated') {
      this.documents = [];
      this.categoryMap.clear();
      this._onDidChangeTreeData.fire();
      return;
    }
    this.documents = await discoverDocuments(ws.knowledgeRoot);
    this.buildCategoryMap();
    this._onDidChangeTreeData.fire();
  }

  private buildCategoryMap(): void {
    this.categoryMap.clear();
    for (const doc of this.documents) {
      const parts = doc.categoryPath ? doc.categoryPath.split('/') : [];
      let currentPath = '';
      for (const part of parts) {
        const parentPath = currentPath;
        currentPath = currentPath ? `${currentPath}/${part}` : part;
        if (!this.categoryMap.has(currentPath)) {
          this.categoryMap.set(currentPath, {
            kind: 'category',
            id: currentPath,
            folderName: part,
            displayName: prettifyLabel(part),
            relativePath: currentPath,
          });
        }
        void parentPath;
      }
    }
  }

  getTreeItem(element: TreeNode): vscode.TreeItem {
    if (element.kind === 'empty') {
      const item = new vscode.TreeItem(element.message, vscode.TreeItemCollapsibleState.None);
      item.contextValue = 'emptyState';
      item.description = element.expectedPath;
      item.iconPath = new vscode.ThemeIcon('info');
      return item;
    }
    if (element.kind === 'category') {
      const item = new vscode.TreeItem(
        element.displayName,
        vscode.TreeItemCollapsibleState.Collapsed
      );
      item.contextValue = 'category';
      item.iconPath = new vscode.ThemeIcon('folder');
      return item;
    }
    const item = new vscode.TreeItem(
      element.document.displayName,
      vscode.TreeItemCollapsibleState.None
    );
    item.resourceUri = element.document.uri;
    item.command = {
      command: 'dockiExplorer._openDocument',
      title: 'Open',
      arguments: [element.document.uri],
    };
    item.iconPath = new vscode.ThemeIcon('book');
    item.contextValue = 'document';
    return item;
  }

  async getChildren(element?: TreeNode): Promise<TreeNode[]> {
    const ws = this.workspaceService.getActive();
    if (!ws) {
      return [];
    }

    if (!element) {
      if (ws.presence === 'missing') {
        const expected = `${ws.workspaceRootLabel}/${path.posix.join('knowledge')}`;
        const node: EmptyStateNode = {
          kind: 'empty',
          message: `No /knowledge folder found. Run architecture-knowledge to generate docs.`,
          expectedPath: expected,
        };
        return [node];
      }
      if (ws.presence === 'empty') {
        const node: EmptyStateNode = {
          kind: 'empty',
          message: `/knowledge exists but contains no Markdown files.`,
          expectedPath: ws.knowledgeRoot?.fsPath ?? 'knowledge',
        };
        return [node];
      }
      return this.getCategoryChildren('');
    }

    if (element.kind === 'category') {
      return this.getCategoryChildren(element.relativePath);
    }
    return [];
  }

  private getCategoryChildren(relativePath: string): TreeNode[] {
    const childCategories = [...this.categoryMap.values()]
      .filter((c) => {
        const parent = path.dirname(c.relativePath).replace(/\\/g, '/');
        const normalizedParent = parent === '.' ? '' : parent;
        return normalizedParent === relativePath;
      })
      .sort((a, b) =>
        compareTreeEntries(
          { name: a.folderName, isFolder: true },
          { name: b.folderName, isFolder: true }
        )
      );

    const childDocs = this.documents
      .filter((d) => d.categoryPath === relativePath)
      .sort((a, b) =>
        compareTreeEntries(
          { name: a.fileName, isFolder: false, isPinned: a.isPinnedName },
          { name: b.fileName, isFolder: false, isPinned: b.isPinnedName }
        )
      )
      .map((document): DocumentNode => ({ kind: 'document', document }));

    return [...childCategories, ...childDocs];
  }
}
