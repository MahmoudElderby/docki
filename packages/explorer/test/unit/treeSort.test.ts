import { assert } from 'chai';
import { compareTreeEntries, isPinnedFile, sortNames } from '../../src/utils/treeSort';

describe('treeSort', () => {
  it('sorts subfolders before files', () => {
    const sorted = sortNames(['payment.md', 'domains', 'orders.md'], (n) => n === 'domains');
    assert.deepEqual(sorted, ['domains', 'orders.md', 'payment.md']);
  });

  it('sorts case-insensitively', () => {
    const sorted = sortNames(['Beta.md', 'alpha.md'], () => false);
    assert.deepEqual(sorted, ['alpha.md', 'Beta.md']);
  });

  it('pins README.md and AI_CONTEXT.md to top', () => {
    assert.isTrue(isPinnedFile('README.md'));
    assert.isTrue(isPinnedFile('AI_CONTEXT.md'));
    const result = compareTreeEntries(
      { name: 'README.md', isFolder: false },
      { name: 'payment.md', isFolder: false }
    );
    assert.isBelow(result, 0);
  });

  it('orders pinned files README before AI_CONTEXT', () => {
    const result = compareTreeEntries(
      { name: 'AI_CONTEXT.md', isFolder: false },
      { name: 'README.md', isFolder: false }
    );
    assert.isAbove(result, 0);
  });
});
