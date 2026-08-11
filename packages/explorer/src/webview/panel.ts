import mermaid from 'mermaid';
import { MERMAID_SECURITY_LEVEL } from '../constants';
import { resolveMermaidTheme } from '../utils/mermaidTheme';
import { sanitizeMermaidSource } from '../utils/mermaidSanitize';

declare const acquireVsCodeApi: () => {
  postMessage: (msg: unknown) => void;
};

const vscode = acquireVsCodeApi();

const MERMAID_SECURITY_LEVEL_LOCAL = MERMAID_SECURITY_LEVEL;

interface RenderMessage {
  type: 'render';
  generation: number;
  title: string;
  html: string;
  mermaidBlocks: { id: string; source: string }[];
  truncated: boolean;
  truncatedMessage?: string;
  theme: {
    kind: string;
    cssVariables: Record<string, string>;
  };
  scrollAnchor?: string;
  lineHint?: number;
  documentId?: string;
  documentPath?: string;
}

let latestRender: RenderMessage | undefined;
let currentDocumentId: string | undefined;
let lastThemeKind: string | undefined;

const KNOWN_THEME_KINDS = new Set(['light', 'dark', 'highContrast']);

function applyMermaidTheme(kind: string | undefined): void {
  if (kind && !KNOWN_THEME_KINDS.has(kind)) {
    vscode.postMessage({
      type: 'log',
      level: 'warn',
      message: `unknown theme kind: ${kind}`,
    });
  }
  const config = resolveMermaidTheme(kind);
  mermaid.initialize({
    startOnLoad: false,
    securityLevel: MERMAID_SECURITY_LEVEL_LOCAL,
    theme: config.theme as 'dark' | 'default',
    ...(config.themeVariables ? { themeVariables: config.themeVariables } : {}),
  });
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

let mermaidRenderSeq = 0;

async function renderMermaidBlocks(
  blocks: { id: string; source: string }[],
  documentPath?: string
): Promise<void> {
  const pathLabel = documentPath ?? 'unknown';

  for (const block of blocks) {
    const placeholder = document.querySelector(`[data-mermaid-id="${block.id}"]`);
    if (!placeholder) continue;

    // Unique DOM ids per render — reusing a single panel would otherwise collide.
    const uid = `mmd-${++mermaidRenderSeq}`;

    try {
      const sanitized = sanitizeMermaidSource(block.source, 'normal');
      const { svg } = await mermaid.render(`${uid}-a`, sanitized);
      placeholder.innerHTML = svg;
    } catch (firstErr) {
      try {
        const strictSanitized = sanitizeMermaidSource(block.source, 'strict');
        const { svg } = await mermaid.render(`${uid}-b`, strictSanitized);
        placeholder.innerHTML = svg;
      } catch (secondErr) {
        const errMsg =
          secondErr instanceof Error
            ? secondErr.message
            : firstErr instanceof Error
              ? firstErr.message
              : String(secondErr);
        const displayMsg = errMsg || 'Diagram could not be rendered.';
        placeholder.outerHTML = `
        <div class="mermaid-error" data-block-id="${block.id}">
          <p class="mermaid-error-message">${escapeHtml(displayMsg)}</p>
          <pre class="mermaid-error-source">${escapeHtml(block.source)}</pre>
        </div>`;
        vscode.postMessage({
          type: 'log',
          level: 'error',
          message: `Mermaid render failed: ${pathLabel} block ${block.id}: ${errMsg}`,
        });
      }
    }
  }
}

function scrollToAnchor(
  options: { scrollAnchor?: string; lineHint?: number; resetToTop: boolean }
): void {
  const content = document.getElementById('content');
  if (!content) return;

  if (options.scrollAnchor) {
    const el =
      document.getElementById(options.scrollAnchor) ??
      document.querySelector(`[id="${options.scrollAnchor}"]`);
    if (el) {
      el.scrollIntoView({ behavior: 'auto', block: 'start' });
      return;
    }
  }
  if (options.lineHint && options.lineHint > 0) {
    const approx = Math.min(content.scrollHeight, options.lineHint * 24);
    content.scrollTop = approx;
    return;
  }
  if (options.resetToTop) {
    // Single-panel navigation reuses the webview scroll container — always reset
    // when opening a different document without an explicit search target.
    content.scrollTop = 0;
    window.scrollTo(0, 0);
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
  }
}

async function handleRender(msg: RenderMessage): Promise<void> {
  const previousDocumentId = currentDocumentId;
  const documentChanged =
    !previousDocumentId || previousDocumentId !== msg.documentId;

  latestRender = msg;
  currentDocumentId = msg.documentId;
  document.title = msg.title;

  const themeKind = msg.theme?.kind;
  if (themeKind !== lastThemeKind) {
    applyMermaidTheme(themeKind);
    lastThemeKind = themeKind;
  }

  const content = document.getElementById('content');
  if (content) {
    // Reset scroll before replacing HTML so the singleton panel does not keep
    // the previous document's offset.
    if (documentChanged && !msg.scrollAnchor && !msg.lineHint) {
      content.scrollTop = 0;
    }
    content.innerHTML = msg.html;
  }

  const banner = document.getElementById('banner');
  const truncatedMsg = document.getElementById('truncated-message');
  if (banner && truncatedMsg) {
    if (msg.truncated && msg.truncatedMessage) {
      banner.classList.remove('hidden');
      truncatedMsg.textContent = msg.truncatedMessage;
    } else {
      banner.classList.add('hidden');
    }
  }

  await renderMermaidBlocks(msg.mermaidBlocks, msg.documentPath);
  scrollToAnchor({
    scrollAnchor: msg.scrollAnchor,
    lineHint: msg.lineHint,
    resetToTop: documentChanged && !msg.scrollAnchor && !msg.lineHint,
  });
  // After heavy Mermaid SVG insert, ensure top again (layout height changed).
  if (documentChanged && !msg.scrollAnchor && !msg.lineHint) {
    requestAnimationFrame(() => {
      const el = document.getElementById('content');
      if (el) el.scrollTop = 0;
      window.scrollTo(0, 0);
    });
  }
  attachEvidenceHandlers();
}

function attachEvidenceHandlers(): void {
  document.querySelectorAll('.evidence-link').forEach((el) => {
    el.addEventListener('click', (e) => {
      e.preventDefault();
      const token = (el as HTMLElement).dataset.evidence;
      if (token) {
        vscode.postMessage({ type: 'openEvidence', rawToken: token });
      }
    });
  });
}

document.getElementById('open-raw-btn')?.addEventListener('click', () => {
  if (currentDocumentId) {
    vscode.postMessage({ type: 'openRaw', documentId: currentDocumentId });
  }
});

window.addEventListener('message', (event) => {
  const msg = event.data;
  if (!msg?.type) return;

  switch (msg.type) {
    case 'render':
      void handleRender(msg as RenderMessage);
      break;
    case 'documentMissing':
      {
        const content = document.getElementById('content');
        if (content) {
          content.innerHTML = `<div class="document-missing"><p>Document no longer exists:</p><p><code>${escapeHtml(msg.path)}</code></p></div>`;
        }
      }
      break;
    case 'error':
      {
        const content = document.getElementById('content');
        if (content) {
          content.innerHTML = `<div class="document-missing"><p>Error rendering document:</p><p>${escapeHtml(msg.message)}</p></div>`;
        }
      }
      break;
  }
});

vscode.postMessage({ type: 'ready' });

if (latestRender) {
  void handleRender(latestRender);
}
