import { expect } from 'chai';
import { createMarkdownRenderer, renderKnowledgeMarkdown } from '../../src/services/markdownRender';

const DIAGRAM = `sequenceDiagram
    participant P as Provider
    participant Pay as Payment
    P->>Pay: callback
`;

describe('markdownRender mermaid', () => {
  const md = createMarkdownRenderer();

  it('extracts mermaid fences with LF line endings', () => {
    const content = `# Title\n\n\`\`\`mermaid\n${DIAGRAM}\`\`\`\n\nAfter\n`;
    const { html, mermaidBlocks } = renderKnowledgeMarkdown(md, content);

    expect(mermaidBlocks).to.have.length(1);
    expect(mermaidBlocks[0].id).to.equal('mermaid-0');
    expect(mermaidBlocks[0].source).to.include('sequenceDiagram');
    expect(mermaidBlocks[0].source).to.include('P->>Pay: callback');
    expect(html).to.include('data-mermaid-id="mermaid-0"');
    expect(html).to.not.include('sequenceDiagram');
    expect(html).to.include('After');
  });

  it('extracts mermaid fences with CRLF line endings (Windows knowledge files)', () => {
    const content = [
      '# Title',
      '',
      '```mermaid',
      'sequenceDiagram',
      '    participant P as Provider',
      '    participant Pay as Payment',
      '    P->>Pay: callback',
      '```',
      '',
      'Verified steps',
    ].join('\r\n');

    const { html, mermaidBlocks } = renderKnowledgeMarkdown(md, content);

    expect(mermaidBlocks).to.have.length(1);
    expect(mermaidBlocks[0].source).to.include('sequenceDiagram');
    expect(mermaidBlocks[0].source).to.not.include('\r');
    expect(html).to.include('class="mermaid-placeholder"');
    expect(html).to.include('data-mermaid-id="mermaid-0"');
    // Must not fall through to a highlighted code fence of the diagram body
    expect(html).to.not.match(/<code[^>]*>[\s\S]*sequenceDiagram/);
    expect(html).to.include('Verified steps');
  });

  it('extracts multiple mermaid blocks and leaves non-mermaid fences alone', () => {
    const content = [
      '```mermaid',
      'graph TD',
      '  A-->B',
      '```',
      '',
      '```text',
      'not a diagram',
      '```',
      '',
      '```mermaid',
      'graph LR',
      '  X-->Y',
      '```',
    ].join('\r\n');

    const { html, mermaidBlocks } = renderKnowledgeMarkdown(md, content);

    expect(mermaidBlocks).to.have.length(2);
    expect(mermaidBlocks[0].source).to.include('graph TD');
    expect(mermaidBlocks[1].source).to.include('graph LR');
    expect(html).to.include('not a diagram');
    expect(html).to.include('data-mermaid-id="mermaid-0"');
    expect(html).to.include('data-mermaid-id="mermaid-1"');
  });

  it('handles real checkout payment-completion fixture shape with CRLF', () => {
    const content = [
      '## Stage 3 — Payment completion (the critical path)',
      '',
      '`StoreCloud.Payment/StoreCloud.Payment.Application/BackgroundService/CallbackCompleteBackgroundJob.cs`.',
      '',
      '```mermaid',
      'sequenceDiagram',
      '    participant P as Provider (Cube/MoMo)',
      '    participant Pay as Payment',
      '    P->>Pay: callback (SecureHash, PayerAccount, RRN)',
      '```',
      '',
      'Verified steps, all OBSERVED:',
    ].join('\r\n');

    const { html, mermaidBlocks } = renderKnowledgeMarkdown(md, content);

    expect(mermaidBlocks).to.have.length(1);
    expect(mermaidBlocks[0].source).to.match(/^sequenceDiagram/);
    expect(html).to.include('data-mermaid-id="mermaid-0"');
    expect(html).to.include('Verified steps');
  });
});
