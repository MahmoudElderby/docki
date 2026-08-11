export type SanitizeMode = 'normal' | 'strict';

const BR_PATTERN = /<br\s*\/?>/gi;

/**
 * Sanitize Mermaid source for Mermaid v10/v11 sequence grammar while keeping
 * `securityLevel: 'strict'`.
 *
 * Root causes of common knowledge-doc failures (empirically verified):
 * 1. HTML `<br/>` in Notes/messages — if turned into real newlines, the following
 *    text becomes a new (invalid) statement. Replace with a visible separator.
 * 2. Semicolon in message/Note text — Mermaid treats `;` as a statement terminator,
 *    so prose like `force Environment = mtnghana` after `;` breaks the diagram.
 *
 * These characters appear in architecture knowledge authored for human readability,
 * not for Mermaid strict grammar. We neutralize only payload text at render time;
 * we do not rewrite files under /knowledge.
 */
export function sanitizeMermaidSource(source: string, mode: SanitizeMode): string {
  // Join breaks instead of introducing new statement boundaries.
  let result = source.replace(BR_PATTERN, ' — ');

  result = result
    .split(/\r?\n/)
    .map((line) => {
      const note = line.match(/^(\s*Note\s+(?:over|left of|right of)\s+[^:]+):\s*(.*)$/i);
      if (note) {
        return `${note[1]}: ${sanitizePayload(note[2], mode)}`;
      }
      // A->>B: msg | A-->>B: msg | A-->B: msg
      const arrow = line.match(
        /^(\s*[A-Za-z0-9_]+(?:-->>?|--?>|->>?|-->)[A-Za-z0-9_]+):\s*(.*)$/
      );
      if (arrow) {
        return `${arrow[1]}: ${sanitizePayload(arrow[2], mode)}`;
      }
      return line;
    })
    .join('\n');

  if (mode === 'strict') {
    // Last-resort: remove residual HTML-like tags, keep inner text
    result = result.replace(/<\/?([A-Za-z][^>\n]*)>/g, ' ');
  }

  return result;
}

function sanitizePayload(text: string, mode: SanitizeMode): string {
  // Statement terminator inside free text
  let t = text.replace(/;/g, ',');
  // Odd number of double-quotes confuses the lexer in notes
  const quoteCount = (t.match(/"/g) || []).length;
  if (quoteCount % 2 === 1) {
    t = t.replace(/"/g, "'");
  }
  if (mode === 'strict') {
    t = t.replace(/[<>]/g, '');
  }
  return t;
}
