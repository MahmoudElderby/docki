import MarkdownIt from 'markdown-it';
import markdownItAnchor from 'markdown-it-anchor';
import { MermaidBlock } from '../types';

export interface MarkdownRenderResult {
  html: string;
  mermaidBlocks: MermaidBlock[];
}

interface MermaidRenderEnv {
  mermaidBlocks: MermaidBlock[];
}

/**
 * Build a markdown-it instance that turns ```mermaid fences into placeholders
 * and collects diagram source for Webview-side Mermaid rendering.
 * Handles LF and CRLF line endings via the markdown parser (not a raw regex).
 */
export function createMarkdownRenderer(): MarkdownIt {
  const md = new MarkdownIt({ html: false, linkify: false });
  md.use(markdownItAnchor, { permalink: false });

  const defaultFence = md.renderer.rules.fence?.bind(md.renderer.rules);
  md.renderer.rules.fence = (tokens, idx, options, env, self) => {
    const token = tokens[idx];
    const lang = (token.info || '').trim().split(/\s+/)[0]?.toLowerCase();
    if (lang === 'mermaid') {
      const renderEnv = env as MermaidRenderEnv;
      if (!renderEnv.mermaidBlocks) {
        renderEnv.mermaidBlocks = [];
      }
      const id = `mermaid-${renderEnv.mermaidBlocks.length}`;
      // Normalize CRLF in diagram source for Mermaid
      const source = token.content.replace(/\r\n/g, '\n').replace(/\r/g, '\n').trim();
      renderEnv.mermaidBlocks.push({ id, source });
      return `<div class="mermaid-placeholder" data-mermaid-id="${id}"></div>\n`;
    }
    if (defaultFence) {
      return defaultFence(tokens, idx, options, env, self);
    }
    return self.renderToken(tokens, idx, options);
  };

  return md;
}

export function renderKnowledgeMarkdown(
  md: MarkdownIt,
  content: string
): MarkdownRenderResult {
  const env: MermaidRenderEnv = { mermaidBlocks: [] };
  const html = md.render(content, env);
  return { html, mermaidBlocks: env.mermaidBlocks };
}
