import { expect } from 'chai';
import * as fs from 'fs';
import * as Module from 'module';
import * as os from 'os';
import * as path from 'path';

describe('MarkdownDocumentService singleton panel', () => {
  let tmpDir: string;
  let knowledgeRoot: string;
  let extDir: string;
  let panelConstructCount = 0;
  let lastPostRender: unknown;
  let disposeCallback: (() => void) | undefined;
  let originalRequire: typeof Module.prototype.require;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'arch-explorer-test-'));
    knowledgeRoot = path.join(tmpDir, 'knowledge');
    extDir = path.join(tmpDir, 'ext');
    fs.mkdirSync(knowledgeRoot, { recursive: true });
    fs.mkdirSync(path.join(extDir, 'dist', 'webview'), { recursive: true });
    fs.writeFileSync(path.join(extDir, 'dist', 'webview', 'panel.html'), '<html></html>');
    fs.writeFileSync(path.join(knowledgeRoot, 'doc-a.md'), '# Doc A\n\nContent A.');
    fs.writeFileSync(path.join(knowledgeRoot, 'doc-b.md'), '# Doc B\n\nContent B.');
    fs.writeFileSync(path.join(knowledgeRoot, 'doc-c.md'), '# Doc C\n\nContent C.');

    panelConstructCount = 0;
    lastPostRender = undefined;
    disposeCallback = undefined;

    originalRequire = Module.prototype.require;
    (Module.prototype as unknown as { require: (id: string) => unknown }).require = function (
      this: unknown,
      id: string
    ) {
      if (id === 'vscode') {
        return {
          Uri: {
            file: (fsPath: string) => ({ fsPath, toString: () => `file://${fsPath.replace(/\\/g, '/')}` }),
            joinPath: (base: { fsPath: string }, ...segments: string[]) => ({
              fsPath: path.join(base.fsPath, ...segments),
              toString: () => `file://${path.join(base.fsPath, ...segments).replace(/\\/g, '/')}`,
            }),
            parse: (s: string) => ({ fsPath: s.replace('file://', ''), toString: () => s }),
          },
          ColorThemeKind: { Light: 1, Dark: 2, HighContrast: 3, HighContrastLight: 4 },
          ViewColumn: { Beside: 2 },
          window: {
            activeColorTheme: { kind: 2 },
            onDidChangeActiveColorTheme: () => ({ dispose: () => undefined }),
            createWebviewPanel: () => {
              panelConstructCount++;
              return {
                webview: {
                  html: '',
                  cspSource: 'vscode-webview:',
                  postMessage: async (payload: unknown) => {
                    if ((payload as { type?: string }).type === 'render') {
                      lastPostRender = payload;
                    }
                  },
                  onDidReceiveMessage: () => ({ dispose: () => undefined }),
                  asWebviewUri: (u: { fsPath: string; toString: () => string }) => u,
                },
                title: '',
                visible: true,
                reveal: () => undefined,
                onDidDispose: (cb: () => void) => {
                  disposeCallback = cb;
                  return { dispose: () => undefined };
                },
                dispose: () => undefined,
              };
            },
            showTextDocument: async () => undefined,
          },
          workspace: {
            openTextDocument: async (uri: { fsPath: string }) => ({ uri }),
          },
          commands: { executeCommand: async () => undefined },
          EventEmitter: class {
            private listeners: Array<() => void> = [];
            event = (listener: () => void) => {
              this.listeners.push(listener);
              return {
                dispose: () => {
                  this.listeners = this.listeners.filter((l) => l !== listener);
                },
              };
            };
            fire = () => {
              for (const listener of [...this.listeners]) {
                listener();
              }
            };
            dispose = () => {
              this.listeners = [];
            };
          },
        };
      }
      return originalRequire.apply(this, arguments as unknown as [string]);
    };

    delete require.cache[path.resolve(__dirname, '../../src/services/MarkdownDocumentService')];
    delete require.cache[path.resolve(__dirname, '../../src/webview/DocumentationPanel')];
    delete require.cache[path.resolve(__dirname, '../../src/services/EvidenceLinkResolver')];
  });

  afterEach(() => {
    (Module.prototype as unknown as { require: (id: string) => unknown }).require = originalRequire;
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  function createService() {
    const { MarkdownDocumentService } = require('../../src/services/MarkdownDocumentService');
    const { EvidenceLinkResolver } = require('../../src/services/EvidenceLinkResolver');
    return new MarkdownDocumentService(
      new EvidenceLinkResolver(),
      () => ({ fsPath: tmpDir, toString: () => `file://${tmpDir.replace(/\\/g, '/')}` }),
      { fsPath: extDir, toString: () => `file://${extDir.replace(/\\/g, '/')}` }
    );
  }

  function uriFor(name: string) {
    const fsPath = path.join(knowledgeRoot, name);
    return { fsPath, toString: () => `file://${fsPath.replace(/\\/g, '/')}` };
  }

  it('reuses the same panel on second open() without second constructor call', async () => {
    const service = createService();
    await service.open(uriFor('doc-a.md'));
    expect(panelConstructCount).to.equal(1);

    await service.open(uriFor('doc-b.md'));
    expect(panelConstructCount).to.equal(1);
    expect(lastPostRender).to.exist;
    expect((lastPostRender as { title: string }).title).to.equal('doc-b.md');
  });

  it('clears singleton refs on panel dispose', async () => {
    const service = createService();
    await service.open(uriFor('doc-a.md'));
    expect(disposeCallback).to.be.a('function');
    disposeCallback!();

    await service.open(uriFor('doc-b.md'));
    expect(panelConstructCount).to.equal(2);
  });

  it('refreshUri no-ops for non-active URI', async () => {
    const service = createService();
    await service.open(uriFor('doc-a.md'));
    const renderAfterOpen = lastPostRender;
    await service.refreshUri(uriFor('doc-c.md'));
    expect(lastPostRender).to.equal(renderAfterOpen);
  });
});
