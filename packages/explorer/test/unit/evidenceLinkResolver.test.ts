import { assert } from 'chai';
import { classifyEvidence, enrichEvidenceHtml } from '../../src/services/EvidenceLinkResolver';

describe('evidenceLinkResolver', () => {
  it('classifies plain path', () => {
    const link = classifyEvidence('StoreCloud.Orders/Startup.cs');
    assert.equal(link.status, 'resolved');
    assert.equal(link.filePath, 'StoreCloud.Orders/Startup.cs');
  });

  it('classifies line reference', () => {
    const link = classifyEvidence('src/constants.ts#L10');
    assert.equal(link.lineStart, 10);
  });

  it('classifies line range', () => {
    const link = classifyEvidence('src/constants.ts#L10-L15');
    assert.equal(link.lineStart, 10);
    assert.equal(link.lineEnd, 15);
  });

  it('rejects traversal paths', () => {
    const link = classifyEvidence('../../outside.txt');
    assert.equal(link.status, 'rejected');
  });

  it('enriches code elements only', () => {
    const html = '<p>StoreCloud plain prose</p><code>src/constants.ts</code><a href="src/foo.ts">link</a>';
    const enriched = enrichEvidenceHtml(html, process.cwd());
    assert.include(enriched, 'data-evidence');
    assert.include(enriched, '<code class="evidence-link"');
    assert.match(enriched, /<p>StoreCloud plain prose<\/p>/);
  });

  it('does not enrich rejected extensions', () => {
    const link = classifyEvidence('file.exe');
    assert.equal(link.status, 'rejected');
  });
});
