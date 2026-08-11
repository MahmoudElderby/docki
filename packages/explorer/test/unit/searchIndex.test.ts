import { assert } from 'chai';
import { SearchIndexService } from '../../src/services/SearchIndexService';
import { KnowledgeDocument } from '../../src/types';

function makeDoc(id: string, fileName: string, categoryLabel: string, body: string): KnowledgeDocument {
  return {
    id,
    uri: { fsPath: `/tmp/${id}`, toString: () => `file:///tmp/${id}` } as import('vscode').Uri,
    fileName,
    displayName: fileName.replace('.md', ''),
    categoryPath: 'domains',
    categoryLabel,
    headings: [{ level: 1, text: 'Overview', slug: 'overview', offset: 0, line: 1 }],
    byteSize: body.length,
    indexedByteLength: body.length,
    lastModified: Date.now(),
    isPinnedName: false,
  };
}

describe('searchIndex', () => {
  let service: SearchIndexService;

  beforeEach(() => {
    service = new SearchIndexService();
  });

  it('returns empty for empty query', async () => {
    await service.rebuild([
      makeDoc('a.md', 'a.md', 'Domains', 'RabbitMQ content'),
    ]);
    assert.deepEqual(service.search(''), []);
  });

  it('finds fuzzy filename match', async () => {
    await service.rebuild([
      makeDoc('domains/payment.md', 'payment.md', 'Domains', 'content'),
    ]);
    const results = service.search('paymnt');
    assert.isAtLeast(results.length, 1);
    assert.equal(results[0].matchKind, 'filename');
  });

  it('finds body substring case-insensitively', async () => {
    const docs = [
      makeDoc('domains/payment.md', 'payment.md', 'Domains', 'Uses RabbitMQ for events'),
      makeDoc('domains/orders.md', 'orders.md', 'Domains', 'Also uses rabbitmq broker'),
      makeDoc('domains/shipment.md', 'shipment.md', 'Domains', 'RabbitMQ shipment events'),
    ];
    await service.rebuild([]);
    for (const doc of docs) {
      service.upsert(doc, doc.displayName === 'payment' ? 'Uses RabbitMQ for events' :
        doc.displayName === 'orders' ? 'Also uses rabbitmq broker' : 'RabbitMQ shipment events');
    }
    const results = service.search('RabbitMQ');
    assert.isAtLeast(results.length, 3);
    const bodyMatch = results.find((r) => r.matchKind === 'body');
    assert.exists(bodyMatch?.lineHint);
  });

  it('removes old documentId on rename', async () => {
    const doc1 = makeDoc('old-name.md', 'old-name.md', 'Domains', 'content');
    await service.rebuild([doc1]);
    service.remove('old-name.md');
    const doc2 = makeDoc('new-name.md', 'new-name.md', 'Domains', 'content');
    service.upsert(doc2, 'content');
    const results = service.search('old-name');
    const oldResults = results.filter((r) => r.documentId === 'old-name.md');
    assert.lengthOf(oldResults, 0);
    const newResults = service.search('new-name');
    assert.isAtLeast(newResults.length, 1);
  });

  it('returns empty for no match', async () => {
    await service.rebuild([
      makeDoc('a.md', 'a.md', 'Domains', 'content'),
    ]);
    assert.deepEqual(service.search('xyzzy-no-match-12345'), []);
  });
});
