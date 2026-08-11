import * as vscode from 'vscode';
import { OUTPUT_CHANNEL_NAME } from './constants';

let channel: vscode.OutputChannel | undefined;

export function getOutputChannel(): vscode.OutputChannel {
  if (!channel) {
    channel = vscode.window.createOutputChannel(OUTPUT_CHANNEL_NAME);
  }
  return channel;
}

export function logInfo(message: string): void {
  getOutputChannel().appendLine(`[info] ${message}`);
}

export function logWarn(message: string): void {
  getOutputChannel().appendLine(`[warn] ${message}`);
}

export function logError(message: string): void {
  getOutputChannel().appendLine(`[error] ${message}`);
}

export function logActivating(): void {
  logInfo('Docki Explorer activating…');
}

export function logActivationFailure(step: string, err: unknown): void {
  const message = err instanceof Error ? err.message : String(err);
  logError(`[activation] ${step} failed: ${message}`);
}

export function logReloadSuccess(): void {
  logInfo(`[reload] succeeded at ${new Date().toISOString()}`);
}

export function logReloadFailure(step: string, err: unknown): void {
  const message = err instanceof Error ? err.message : String(err);
  logError(`[reload] ${step} failed: ${message}`);
}

const unknownThemeKindsLogged = new Set<string>();

export function routeWebviewLog(level: string, message: string): void {
  if (level === 'warn' && message.startsWith('unknown theme kind: ')) {
    const kind = message.slice('unknown theme kind: '.length);
    if (unknownThemeKindsLogged.has(kind)) {
      return;
    }
    unknownThemeKindsLogged.add(kind);
    logWarn(`[webview] ${message}`);
    return;
  }

  if (level === 'error' && message.startsWith('Mermaid render failed:')) {
    logError(`[webview] ${message}`);
    return;
  }

  if (level === 'warn') {
    logWarn(`[webview] ${message}`);
  } else if (level === 'error') {
    logError(`[webview] ${message}`);
  } else {
    logInfo(`[webview] ${message}`);
  }
}

export function resetWebviewLogState(): void {
  unknownThemeKindsLogged.clear();
}
