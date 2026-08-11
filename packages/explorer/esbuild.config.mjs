import * as esbuild from 'esbuild';
import { copyFileSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const watch = process.argv.includes('--watch');

const extensionCtx = await esbuild.context({
  entryPoints: ['src/extension.ts'],
  bundle: true,
  outfile: 'dist/extension.js',
  platform: 'node',
  format: 'cjs',
  external: ['vscode'],
  sourcemap: true,
  target: 'es2022',
  logLevel: 'info',
});

const webviewCtx = await esbuild.context({
  entryPoints: ['src/webview/panel.ts'],
  bundle: true,
  outfile: 'dist/webview/panel.js',
  platform: 'browser',
  format: 'iife',
  sourcemap: true,
  target: 'es2022',
  logLevel: 'info',
});

function copyWebviewAssets() {
  mkdirSync('dist/webview', { recursive: true });
  copyFileSync('src/webview/panel.html', 'dist/webview/panel.html');
  copyFileSync('src/webview/panel.css', 'dist/webview/panel.css');
}

async function build() {
  await extensionCtx.rebuild();
  await webviewCtx.rebuild();
  copyWebviewAssets();
  console.log('Build complete');
}

if (watch) {
  copyWebviewAssets();
  await extensionCtx.watch();
  await webviewCtx.watch();
  console.log('Watching...');
} else {
  await build();
  await extensionCtx.dispose();
  await webviewCtx.dispose();
}
