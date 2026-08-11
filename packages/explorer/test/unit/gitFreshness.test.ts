import { assert } from 'chai';
import { evaluateFreshnessFromReadme } from '../../src/services/GitFreshnessService';

describe('gitFreshness', () => {
  it('returns up-to-date when HEAD matches README commit', async () => {
    const commit = 'abc123def4567890abcdef1234567890abcdef12';
    const content = `| Last analyzed commit | \`${commit}\` |`;
    const result = await evaluateFreshnessFromReadme(content, commit);
    assert.equal(result.state, 'up-to-date');
  });

  it('returns potentially-stale when HEAD differs', async () => {
    const content = '| Last analyzed commit | `abc123def4567890abcdef1234567890abcdef12` |';
    const result = await evaluateFreshnessFromReadme(content, 'deadbeefdeadbeefdeadbeefdeadbeefdeadbeef');
    assert.equal(result.state, 'potentially-stale');
  });

  it('returns unknown when metadata missing', async () => {
    const result = await evaluateFreshnessFromReadme('# No metadata', 'abc123');
    assert.equal(result.state, 'unknown');
  });

  it('returns unknown when git unavailable', async () => {
    const content = '| Last analyzed commit | `abc123def4567890abcdef1234567890abcdef12` |';
    const result = await evaluateFreshnessFromReadme(content, null);
    assert.equal(result.state, 'unknown');
  });
});
