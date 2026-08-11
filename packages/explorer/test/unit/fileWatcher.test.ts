import { assert } from 'chai';
import { CoalescingEmitter } from '../../src/services/KnowledgeFileWatcher';

describe('fileWatcher coalesce', () => {
  it('coalesces burst events into single fire within 300ms', function (this: Mocha.Context) {
    this.timeout(2000);
    const events: unknown[] = [];
    const emitter = new CoalescingEmitter(300, (e) => events.push(e));
    const uri = { fsPath: '/tmp/test.md', toString: () => 'file:///tmp/test.md' } as import('vscode').Uri;

    emitter.push('change', [uri]);
    emitter.push('change', [uri]);
    emitter.push('change', [uri]);

    return new Promise<void>((resolve) => {
      setTimeout(() => {
        assert.lengthOf(events, 1);
        emitter.dispose();
        resolve();
      }, 400);
    });
  });
});
