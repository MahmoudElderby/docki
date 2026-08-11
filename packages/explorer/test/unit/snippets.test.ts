import { assert } from 'chai';
import { buildSnippet } from '../../src/utils/snippets';

describe('snippets', () => {
  it('builds centered snippet with highlight markers', () => {
    const body = 'The quick brown fox jumps over the lazy dog near RabbitMQ broker.';
    const idx = body.indexOf('RabbitMQ');
    const snippet = buildSnippet(body, idx);
    assert.include(snippet, '⟦RabbitMQ⟧');
    assert.isAtMost(snippet.length, 200);
  });

  it('adds ellipsis when truncated at boundaries', () => {
    const body = 'a'.repeat(300) + 'MATCH' + 'b'.repeat(300);
    const idx = body.indexOf('MATCH');
    const snippet = buildSnippet(body, idx);
    assert.match(snippet, /…/);
  });
});
