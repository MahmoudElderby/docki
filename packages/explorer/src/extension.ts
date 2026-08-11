import * as path from 'path';
import * as vscode from 'vscode';
import {
  COMMAND_OPEN,
  COMMAND_OPEN_AI_CONTEXT,
  COMMAND_OPEN_RAW,
  COMMAND_OPEN_README,
  COMMAND_REFRESH,
  COMMAND_RELOAD,
  COMMAND_SEARCH,
  VIEW_KNOWLEDGE_TREE,
} from './constants';
import {
  logActivationFailure,
  logActivating,
  logInfo,
  logReloadFailure,
  logReloadSuccess,
  resetWebviewLogState,
} from './output';
import { buildDocument, discoverDocuments, KnowledgeWorkspaceService } from './services/KnowledgeWorkspaceService';
import { KnowledgeTreeProvider } from './services/KnowledgeTreeProvider';
import { SearchIndexService } from './services/SearchIndexService';
import { MarkdownDocumentService } from './services/MarkdownDocumentService';
import { EvidenceLinkResolver } from './services/EvidenceLinkResolver';
import { GitFreshnessService } from './services/GitFreshnessService';
import { KnowledgeFileWatcher } from './services/KnowledgeFileWatcher';
import { SearchQuickPick } from './webview/SearchQuickPick';

interface ExtensionServices {
  workspaceService: KnowledgeWorkspaceService;
  treeProvider: KnowledgeTreeProvider;
  searchIndex: SearchIndexService;
  markdownService: MarkdownDocumentService;
  freshnessService: GitFreshnessService;
  fileWatcher: KnowledgeFileWatcher;
  searchQuickPick: SearchQuickPick;
}

interface Registration {
  services: ExtensionServices;
  treeView: vscode.TreeView<unknown>;
  disposables: vscode.Disposable[];
}

let registration: Registration | undefined;

function registerdockiExplorer(context: vscode.ExtensionContext): Registration {
  logActivating();

  const workspaceService = new KnowledgeWorkspaceService();
  const treeProvider = new KnowledgeTreeProvider(workspaceService);
  const searchIndex = new SearchIndexService();
  const evidenceResolver = new EvidenceLinkResolver();
  const markdownService = new MarkdownDocumentService(
    evidenceResolver,
    () => workspaceService.getActive()?.workspaceRoot,
    context.extensionUri
  );
  const freshnessService = new GitFreshnessService();
  const fileWatcher = new KnowledgeFileWatcher();
  const searchQuickPick = new SearchQuickPick(searchIndex, markdownService);

  const services: ExtensionServices = {
    workspaceService,
    treeProvider,
    searchIndex,
    markdownService,
    freshnessService,
    fileWatcher,
    searchQuickPick,
  };

  const treeView = vscode.window.createTreeView(VIEW_KNOWLEDGE_TREE, {
    treeDataProvider: treeProvider,
    showCollapseAll: true,
  });

  const disposables: vscode.Disposable[] = [
    treeView,
    fileWatcher,
    vscode.commands.registerCommand(COMMAND_OPEN, async () => {
      await vscode.commands.executeCommand('workbench.view.extension.dockiExplorer');
    }),
    vscode.commands.registerCommand(COMMAND_REFRESH, () => refreshAll(services)),
    vscode.commands.registerCommand(COMMAND_SEARCH, () => searchQuickPick.show()),
    vscode.commands.registerCommand(COMMAND_OPEN_AI_CONTEXT, async () => {
      const ws = workspaceService.getActive();
      if (ws?.knowledgeRoot) {
        const uri = vscode.Uri.joinPath(ws.knowledgeRoot, 'AI_CONTEXT.md');
        await markdownService.open(uri);
      } else {
        vscode.window.showInformationMessage('No knowledge folder found.');
      }
    }),
    vscode.commands.registerCommand(COMMAND_OPEN_README, async () => {
      const ws = workspaceService.getActive();
      if (ws?.knowledgeRoot) {
        const uri = vscode.Uri.joinPath(ws.knowledgeRoot, 'README.md');
        await markdownService.open(uri);
      } else {
        vscode.window.showInformationMessage('No knowledge folder found.');
      }
    }),
    vscode.commands.registerCommand(COMMAND_OPEN_RAW, async (uri?: vscode.Uri) => {
      if (uri) {
        await markdownService.openRaw(uri);
      }
    }),
    vscode.commands.registerCommand('dockiExplorer._openDocument', async (uri: vscode.Uri) => {
      await markdownService.open(uri);
    }),
    vscode.commands.registerCommand(COMMAND_RELOAD, () => reloadExtension(context)),
    vscode.workspace.onDidChangeWorkspaceFolders(() => refreshAll(services)),
  ];

  wireFileWatcher(services);
  freshnessService.onDidChangeFreshness(() => void updateTreeTitle(services, treeView));
  workspaceService.onDidChangeWorkspace(() => void refreshAll(services));

  return { services, treeView, disposables };
}

function wireFileWatcher(services: ExtensionServices): void {
  services.fileWatcher.onDidChangeKnowledge(async (event) => {
    const ws = services.workspaceService.getActive();
    if (!ws?.knowledgeRoot) return;

    for (const uri of event.uris) {
      if (event.kind === 'delete') {
        const rel = path.relative(ws.knowledgeRoot.fsPath, uri.fsPath).replace(/\\/g, '/');
        services.searchIndex.remove(rel);
        services.markdownService.handleDeleted(uri);
      } else {
        try {
          const doc = buildDocument(ws.knowledgeRoot, uri.fsPath);
          services.searchIndex.upsert(doc);
          await services.markdownService.refreshUri(uri);
        } catch {
          // file may have been deleted between event and read
        }
      }
    }

    const readmeChanged = event.uris.some(
      (u) => path.basename(u.fsPath).toLowerCase() === 'readme.md'
    );
    if (readmeChanged && ws.knowledgeRoot) {
      await services.freshnessService.evaluate(vscode.Uri.joinPath(ws.knowledgeRoot, 'README.md'));
    }

    await services.treeProvider.reload();
  });
}

async function updateTreeTitle(
  services: ExtensionServices,
  treeView: vscode.TreeView<unknown>
): Promise<void> {
  const ws = services.workspaceService.getActive();
  if (!ws) return;
  const freshness = services.freshnessService.getCurrent();
  treeView.title = `${freshness.badge}  (${ws.workspaceRootLabel})`;
}

async function rebuildIndex(services: ExtensionServices): Promise<void> {
  const ws = services.workspaceService.getActive();
  if (!ws?.knowledgeRoot || ws.presence !== 'populated') {
    await services.searchIndex.rebuild([]);
    return;
  }
  const start = Date.now();
  const docs = await discoverDocuments(ws.knowledgeRoot);
  await services.searchIndex.rebuild(docs);
  logInfo(`Search index rebuilt (${docs.length} documents) in ${Date.now() - start}ms`);
}

async function refreshAll(services: ExtensionServices): Promise<void> {
  await services.workspaceService.refresh();
  const ws = services.workspaceService.getActive();
  services.fileWatcher.reset(ws!);
  await services.treeProvider.reload();
  await rebuildIndex(services);
  if (ws?.knowledgeRoot) {
    const readmeUri = vscode.Uri.joinPath(ws.knowledgeRoot, 'README.md');
    await services.freshnessService.evaluate(readmeUri);
  } else {
    await services.freshnessService.evaluate(null);
  }
  if (registration?.treeView) {
    await updateTreeTitle(services, registration.treeView);
  }
}

function disposeRegistration(reg: Registration): void {
  reg.services.markdownService.dispose();
  for (const disposable of reg.disposables) {
    disposable.dispose();
  }
  reg.treeView.dispose();
}

async function reloadExtension(context: vscode.ExtensionContext): Promise<void> {
  try {
    if (registration) {
      disposeRegistration(registration);
      registration = undefined;
    }

    const reg = registerdockiExplorer(context);
    registration = reg;
    context.subscriptions.push(...reg.disposables);

    await refreshAll(reg.services);

    logReloadSuccess();
    await vscode.window.showInformationMessage('Docki Explorer reloaded successfully.');
  } catch (err) {
    logReloadFailure('reload', err);
    const message = err instanceof Error ? err.message : String(err);
    await vscode.window.showErrorMessage(`Docki Explorer reload failed: ${message}`);
  }
}

export async function activate(context: vscode.ExtensionContext): Promise<void> {
  try {
    const reg = registerdockiExplorer(context);
    registration = reg;
    context.subscriptions.push(...reg.disposables);

    await refreshAll(reg.services);

    logInfo('Docki Explorer activated');
  } catch (err) {
    logActivationFailure('treeRegistration', err);
    throw err;
  }
}

export function deactivate(): void {
  if (registration) {
    disposeRegistration(registration);
    registration = undefined;
  }
  resetWebviewLogState();
}
