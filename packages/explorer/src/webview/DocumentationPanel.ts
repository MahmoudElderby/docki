import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';
import { EvidenceLinkResolver } from '../services/EvidenceLinkResolver';
import { routeWebviewLog } from '../output';

export interface RenderPayload {
  type: 'render';
  generation: number;
  title: string;
  html: string;
  mermaidBlocks: { id: string; source: string }[];
  truncated: boolean;
  truncatedMessage?: string;
  theme: {
    kind: 'light' | 'dark' | 'highContrast';
    cssVariables: Record<string, string>;
  };
  scrollAnchor?: string;
  lineHint?: number;
  documentId?: string;
  documentPath?: string;
}

export class DocumentationPanel {
  private panel: vscode.WebviewPanel;
  private latestRender: RenderPayload | undefined;

  constructor(
    private readonly uri: vscode.Uri,
    private readonly evidenceResolver: EvidenceLinkResolver,
    private readonly onReady: () => void,
    private readonly getWorkspaceRoot: () => vscode.Uri | undefined,
    private readonly extensionUri: vscode.Uri
  ) {
    this.panel = vscode.window.createWebviewPanel(
      'dockiExplorerDoc',
      path.basename(uri.fsPath),
      vscode.ViewColumn.Beside,
      {
        enableScripts: true,
        retainContextWhenHidden: true,
        localResourceRoots: [
          vscode.Uri.joinPath(this.extensionUri, 'dist', 'webview'),
        ],
      }
    );

    this.panel.webview.html = this.getHtml();
    this.panel.webview.onDidReceiveMessage((msg) => this.handleMessage(msg));
    this.panel.onDidDispose(() => {
      this._onDidDispose.fire();
    });
  }

  private readonly _onDidDispose = new vscode.EventEmitter<void>();
  onDidDispose = this._onDidDispose.event;

  reveal(): void {
    this.panel.reveal(vscode.ViewColumn.Beside, true);
  }

  isVisible(): boolean {
    return this.panel.visible;
  }

  dispose(): void {
    this.panel.dispose();
  }

  postRender(payload: RenderPayload): void {
    this.latestRender = payload;
    this.panel.title = payload.title;
    void this.panel.webview.postMessage(payload);
  }

  postDocumentMissing(displayPath: string): void {
    void this.panel.webview.postMessage({ type: 'documentMissing', path: displayPath });
  }

  postError(message: string): void {
    void this.panel.webview.postMessage({ type: 'error', message });
  }

  private handleMessage(msg: { type: string; [key: string]: unknown }): void {
    switch (msg.type) {
      case 'ready':
        if (this.latestRender) {
          void this.panel.webview.postMessage(this.latestRender);
        }
        this.onReady();
        break;
      case 'openEvidence': {
        const root = this.getWorkspaceRoot();
        if (root && typeof msg.rawToken === 'string') {
          void this.evidenceResolver.resolveAndOpen(msg.rawToken, root);
        }
        break;
      }
      case 'openRaw':
        if (typeof msg.documentId === 'string') {
          void vscode.commands.executeCommand(
            'dockiExplorer.openRaw',
            vscode.Uri.parse(msg.documentId)
          );
        } else {
          void vscode.commands.executeCommand('dockiExplorer.openRaw', this.uri);
        }
        break;
      case 'log': {
        const level = msg.level as string;
        const message = String(msg.message);
        routeWebviewLog(level, message);
        break;
      }
    }
  }

  private getHtml(): string {
    const webview = this.panel.webview;
    const extUri = this.extensionUri;
    const scriptUri = webview.asWebviewUri(
      vscode.Uri.joinPath(extUri, 'dist', 'webview', 'panel.js')
    );
    const styleUri = webview.asWebviewUri(
      vscode.Uri.joinPath(extUri, 'dist', 'webview', 'panel.css')
    );
    const nonce = getNonce();

    const htmlPath = path.join(extUri.fsPath, 'dist', 'webview', 'panel.html');
    let html = fs.readFileSync(htmlPath, 'utf8');
    html = html
      .replace(/\{\{cspSource\}\}/g, webview.cspSource)
      .replace(/\{\{nonce\}\}/g, nonce)
      .replace(/\{\{scriptUri\}\}/g, scriptUri.toString())
      .replace(/\{\{styleUri\}\}/g, styleUri.toString());
    return html;
  }
}

function getNonce(): string {
  let text = '';
  const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  for (let i = 0; i < 32; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
}
