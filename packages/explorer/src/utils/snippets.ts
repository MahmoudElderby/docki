import { SNIPPET_RADIUS } from '../constants';

export function buildSnippet(body: string, matchIndex: number, matchLength?: number): string {
  const start = Math.max(0, matchIndex - SNIPPET_RADIUS);
  const end = Math.min(body.length, matchIndex + SNIPPET_RADIUS);
  const len = matchLength ?? body.slice(matchIndex).match(/^\S+/)?.[0]?.length ?? 1;
  const before = body.slice(start, matchIndex);
  const match = body.slice(matchIndex, matchIndex + len);
  const after = body.slice(matchIndex + len, end);
  let snippet = '';
  if (start > 0) snippet += '…';
  snippet += before + '⟦' + match + '⟧' + after;
  if (end < body.length) snippet += '…';
  return snippet.replace(/\s+/g, ' ').trim();
}
