import { expect } from 'chai';
import {
  logReloadFailure,
  logReloadSuccess,
  resetWebviewLogState,
  routeWebviewLog,
} from '../../src/output';

describe('extension reload logging', () => {
  let lines: string[] = [];
  let outputModule: typeof import('../../src/output');

  beforeEach(() => {
    lines = [];
    resetWebviewLogState();
    const vscode = require('vscode');
    vscode.window.createOutputChannel = () => ({
      appendLine: (line: string) => lines.push(line),
    });
    delete require.cache[require.resolve('../../src/output')];
    outputModule = require('../../src/output');
  });

  it('logs reload success with ISO timestamp path', () => {
    outputModule.logReloadSuccess();
    expect(lines.some((l) => l.includes('[reload] succeeded at'))).to.equal(true);
    expect(lines.some((l) => /\d{4}-\d{2}-\d{2}T/.test(l))).to.equal(true);
  });

  it('logs reload failure with failing step to Output channel', () => {
    outputModule.logReloadFailure('indexRebuild', new Error('index timeout'));
    expect(lines.some((l) => l.includes('[reload] indexRebuild failed: index timeout'))).to.equal(
      true
    );
  });
});

describe('webview log routing', () => {
  let lines: string[] = [];
  let outputModule: typeof import('../../src/output');

  beforeEach(() => {
    lines = [];
    const vscode = require('vscode');
    vscode.window.createOutputChannel = () => ({
      appendLine: (line: string) => lines.push(line),
    });
    delete require.cache[require.resolve('../../src/output')];
    outputModule = require('../../src/output');
    outputModule.resetWebviewLogState();
  });

  it('dedupes unknown theme kind warnings per session', () => {
    outputModule.routeWebviewLog('warn', 'unknown theme kind: custom');
    outputModule.routeWebviewLog('warn', 'unknown theme kind: custom');
    const themeLines = lines.filter((l) => l.includes('unknown theme kind: custom'));
    expect(themeLines).to.have.length(1);
  });

  it('routes Mermaid failure logs as errors', () => {
    outputModule.routeWebviewLog(
      'error',
      'Mermaid render failed: integrations/foo.md block mermaid-0: parse error'
    );
    expect(lines.some((l) => l.includes('[error]') && l.includes('Mermaid render failed'))).to.equal(
      true
    );
  });
});
