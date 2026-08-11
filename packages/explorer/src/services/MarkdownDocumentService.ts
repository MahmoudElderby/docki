import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';
import MarkdownIt from 'markdown-it';
import { KNOWLEDGE_DIR, MAX_FILE_BYTES } from '../constants';
import { EvidenceLinkResolver } from './EvidenceLinkResolver';
import { DocumentationPanel } from '../webview/DocumentationPanel';
import { createMarkdownRenderer, renderKnowledgeMarkdown } from './markdownRender';

export class MarkdownDocumentService {
  private readonly md: MarkdownIt;
  private activePanel: DocumentationPanel | undefined;
  private activeUri: vscode.Uri | undefined;
  private themeChangeDisposable: vscode.Disposable | undefined;
  private generation = 0;

  constructor(
    private readonly evidenceResolver: EvidenceLinkResolver,
    private readonly getWorkspaceRoot: () => vscode.Uri | undefined,
    private readonly extensionUri: vscode.Uri
  ) {
    this.md = createMarkdownRenderer();
  }

  async open(
    uri: vscode.Uri,
    options?: { scrollAnchor?: string; lineHint?: number }
  ): Promise<void> {
    if (!this.activePanel) {
      this.activePanel = new DocumentationPanel(
        uri,
        this.evidenceResolver,
        () => {
          if (this.activeUri && this.activePanel) {
            void this.renderPanel(this.activePanel, this.activeUri);
          }
        },
        this.getWorkspaceRoot,
        this.extensionUri
      );
      this.activePanel.onDidDispose(() => {
        this.activePanel = undefined;
        this.activeUri = undefined;
      });
      this.ensureThemeListener();
    }
    this.activeUri = uri;
    await this.renderPanel(this.activePanel, uri, options);
    this.activePanel.reveal();
  }

  async refreshUri(uri: vscode.Uri): Promise<void> {
    if (this.activeUri?.toString() !== uri.toString() || !this.activePanel) {
      return;
    }
    await this.renderPanel(this.activePanel, uri);
  }

  handleDeleted(uri: vscode.Uri): void {
    if (this.activeUri?.toString() !== uri.toString() || !this.activePanel) {
      return;
    }
    this.activePanel.postDocumentMissing(uri.fsPath);
  }

  async openRaw(uri: vscode.Uri): Promise<void> {
    const doc = await vscode.workspace.openTextDocument(uri);
    await vscode.window.showTextDocument(doc, { preview: false, preserveFocus: true });
  }

  dispose(): void {
    this.themeChangeDisposable?.dispose();
    this.themeChangeDisposable = undefined;
    if (this.activePanel) {
      this.activePanel.dispose();
      this.activePanel = undefined;
      this.activeUri = undefined;
    }
  }

  private ensureThemeListener(): void {
    if (this.themeChangeDisposable) {
      return;
    }
    this.themeChangeDisposable = vscode.window.onDidChangeActiveColorTheme(() => {
      if (this.activePanel?.isVisible() && this.activeUri) {
        void this.renderPanel(this.activePanel, this.activeUri);
      }
    });
  }

  private resolveDocumentPath(uri: vscode.Uri): string | undefined {
    const root = this.getWorkspaceRoot();
    if (!root) {
      return undefined;
    }
    const knowledgeRoot = path.join(root.fsPath, KNOWLEDGE_DIR);
    const normalizedUri = path.normalize(uri.fsPath);
    const normalizedKnowledge = path.normalize(knowledgeRoot);
    if (!normalizedUri.startsWith(normalizedKnowledge)) {
      return undefined;
    }
    return path.relative(normalizedKnowledge, normalizedUri).replace(/\\/g, '/');
  }

  private async renderPanel(
    panel: DocumentationPanel,
    uri: vscode.Uri,
    options?: { scrollAnchor?: string; lineHint?: number }
  ): Promise<void> {
    if (!fs.existsSync(uri.fsPath)) {
      panel.postDocumentMissing(uri.fsPath);
      return;
    }

    try {
      const stat = fs.statSync(uri.fsPath);
      const truncated = stat.size > MAX_FILE_BYTES;
      const buf = fs.readFileSync(uri.fsPath);
      const content = buf.slice(0, MAX_FILE_BYTES).toString('utf8');

      const { html: renderedHtml, mermaidBlocks } = renderKnowledgeMarkdown(this.md, content);
      let html = renderedHtml;
      const root = this.getWorkspaceRoot();
      if (root) {
        html = this.evidenceResolver.enrichHtml(html, root);
      }

      this.generation++;
      panel.postRender({
        type: 'render',
        generation: this.generation,
        title: path.basename(uri.fsPath),
        html,
        mermaidBlocks,
        truncated,
        truncatedMessage: truncated
          ? `Document exceeds ${MAX_FILE_BYTES / (1024 * 1024)} MB; showing first portion only.`
          : undefined,
        theme: this.getTheme(),
        scrollAnchor: options?.scrollAnchor,
        lineHint: options?.lineHint,
        documentId: uri.toString(),
        documentPath: this.resolveDocumentPath(uri),
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      panel.postError(message);
    }
  }

  private getTheme(): {
    kind: 'light' | 'dark' | 'highContrast';
    cssVariables: Record<string, string>;
  } {
    const kind = vscode.window.activeColorTheme.kind;
    let themeKind: 'light' | 'dark' | 'highContrast' = 'light';
    if (kind === vscode.ColorThemeKind.Dark) themeKind = 'dark';
    if (kind === vscode.ColorThemeKind.HighContrast ||
        kind === vscode.ColorThemeKind.HighContrastLight) {
      themeKind = 'highContrast';
    }
    return { kind: themeKind, cssVariables: {} };
  }
}
