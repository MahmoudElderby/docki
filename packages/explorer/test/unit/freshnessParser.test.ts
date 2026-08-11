import { assert } from 'chai';
import { parseFreshnessMetadata } from '../../src/utils/freshnessParser';

describe('freshnessParser', () => {
  it('parses table row format', () => {
    const content = '| Last analyzed commit | `abc123def456` |';
    const result = parseFreshnessMetadata(content);
    assert.equal(result.commit, 'abc123def456');
  });

  it('parses plain line format', () => {
    const content = 'Last analyzed commit: abc123def4567890abcdef1234567890abcdef12';
    const result = parseFreshnessMetadata(content);
    assert.equal(result.commit, 'abc123def4567890abcdef1234567890abcdef12');
  });

  it('returns null for malformed content', () => {
    const result = parseFreshnessMetadata('No freshness info here');
    assert.isNull(result.commit);
  });

  it('returns null for missing metadata', () => {
    const result = parseFreshnessMetadata('# Title\n\nSome content.');
    assert.isNull(result.commit);
  });
});
