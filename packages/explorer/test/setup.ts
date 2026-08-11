import * as Module from 'module';

const originalRequire = Module.prototype.require;

class VSCodeEventEmitter<T = void> {
  private listeners: Array<(e: T) => void> = [];
  event = (listener: (e: T) => void) => {
    this.listeners.push(listener);
    return { dispose: () => { this.listeners = this.listeners.filter((l) => l !== listener); } };
  };
  fire(data: T): void {
    for (const l of [...this.listeners]) l(data);
  }
  dispose(): void {
    this.listeners = [];
  }
}

// Minimal vscode mock for Node unit tests
const vscodeMock = {
  Uri: {
    file: (fsPath: string) => ({
      fsPath,
      toString: () => `file://${fsPath.replace(/\\/g, '/')}`,
      with: (change: { scheme?: string; authority?: string; path?: string; query?: string; fragment?: string }) => ({
        fsPath: change.path ?? fsPath,
        toString: () => `file://${(change.path ?? fsPath).replace(/\\/g, '/')}`,
      }),
    }),
    joinPath: (base: { fsPath: string }, ...segments: string[]) => {
      const path = require('path');
      return vscodeMock.Uri.file(path.join(base.fsPath, ...segments));
    },
    parse: (s: string) => vscodeMock.Uri.file(s.replace('file://', '')),
  },
  EventEmitter: VSCodeEventEmitter,
  ColorThemeKind: { Light: 1, Dark: 2, HighContrast: 3, HighContrastLight: 4 },
  TreeItemCollapsibleState: { None: 0, Collapsed: 1, Expanded: 2 },
  ViewColumn: { Beside: 2 },
  TextEditorRevealType: { InCenter: 2 },
  Position: class {
    constructor(public line: number, public character: number) {}
  },
  Selection: class {
    constructor(public start: unknown, public end: unknown) {}
  },
  Range: class {
    constructor(public start: unknown, public end: unknown) {}
  },
  ThemeIcon: class {
    constructor(public id: string) {}
  },
  TreeItem: class {
    label: string;
    collapsibleState: number;
    resourceUri?: unknown;
    command?: unknown;
    iconPath?: unknown;
    contextValue?: string;
    description?: string;
    constructor(label: string, collapsibleState: number) {
      this.label = label;
      this.collapsibleState = collapsibleState;
    }
  },
  RelativePattern: class {
    constructor(public base: unknown, public pattern: string) {}
  },
  window: {
    createOutputChannel: () => ({ appendLine: () => undefined }),
    showWarningMessage: async () => undefined,
    showInformationMessage: async () => undefined,
    showTextDocument: async () => ({ selection: null, revealRange: () => undefined }),
    createWebviewPanel: () => ({
      webview: { html: '', cspSource: 'vscode-webview:', postMessage: async () => undefined, onDidReceiveMessage: () => ({ dispose: () => undefined }), asWebviewUri: (u: { fsPath: string }) => u },
      title: '',
      reveal: () => undefined,
      onDidDispose: () => ({ dispose: () => undefined }),
    }),
    activeColorTheme: { kind: 2 },
    createQuickPick: () => ({
      placeholder: '',
      busy: false,
      items: [],
      onDidChangeValue: () => ({ dispose: () => undefined }),
      onDidAccept: () => ({ dispose: () => undefined }),
      onDidHide: () => ({ dispose: () => undefined }),
      show: () => undefined,
      hide: () => undefined,
      dispose: () => undefined,
    }),
  },
  workspace: {
    workspaceFolders: [],
    openTextDocument: async (uri: { fsPath: string }) => ({
      uri,
      lineCount: 10,
      lineAt: (n: number) => ({ range: { end: { line: n, character: 0 } } }),
    }),
    createFileSystemWatcher: () => ({
      onDidCreate: () => ({ dispose: () => undefined }),
      onDidChange: () => ({ dispose: () => undefined }),
      onDidDelete: () => ({ dispose: () => undefined }),
      dispose: () => undefined,
    }),
    onDidChangeWorkspaceFolders: () => ({ dispose: () => undefined }),
  },
  commands: {
    executeCommand: async () => undefined,
    registerCommand: () => ({ dispose: () => undefined }),
  },
  extensions: {
    getExtension: () => undefined,
  },
};

(Module.prototype as unknown as { require: (id: string) => unknown }).require = function (this: unknown, id: string) {
  if (id === 'vscode') {
    return vscodeMock;
  }
  return originalRequire.apply(this, arguments as unknown as [string]);
};
