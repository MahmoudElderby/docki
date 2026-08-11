import { assert } from 'chai';
import * as path from 'path';
import { SearchIndexService } from '../../src/services/SearchIndexService';
import { KnowledgeDocument } from '../../src/types';
import * as fs from 'fs';

describe('searchIndexPerformance', () => {
  before(function () {
    const fixtureDir = path.join(__dirname, '../fixtures/large-knowledge');
    if (!fs.existsSync(fixtureDir)) {
      const { execSync } = require('child_process');
      execSync('node scripts/generate-large-knowledge-fixture.mjs', {
        cwd: path.join(__dirname, '../..'),
        stdio: 'inherit',
      });
    }
  });

  it('queries 300+ files within 1 second p95', async function () {
    this.timeout(10000);
    const fixtureDir = path.join(__dirname, '../fixtures/large-knowledge');
    const docs: KnowledgeDocument[] = [];

    function walk(dir: string, rel: string): void {
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);
        const relPath = rel ? `${rel}/${entry.name}` : entry.name;
        if (entry.isDirectory()) {
          walk(full, relPath);
        } else if (entry.name.endsWith('.md')) {
          const body = fs.readFileSync(full, 'utf8');
          docs.push({
            id: relPath,
            uri: { fsPath: full, toString: () => full } as import('vscode').Uri,
            fileName: entry.name,
            displayName: entry.name.replace('.md', ''),
            categoryPath: rel,
            categoryLabel: rel || 'Root',
            headings: [],
            byteSize: body.length,
            indexedByteLength: body.length,
            lastModified: Date.now(),
            isPinnedName: false,
          });
        }
      }
    }
    walk(fixtureDir, '');

    assert.isAtLeast(docs.length, 300);

    const service = new SearchIndexService();
    await service.rebuild(docs);

    const times: number[] = [];
    for (let i = 0; i < 20; i++) {
      const start = Date.now();
      service.search('RabbitMQ');
      times.push(Date.now() - start);
    }
    times.sort((a, b) => a - b);
    const p95 = times[Math.floor(times.length * 0.95)];
    assert.isAtMost(p95, 1000, `p95 query time ${p95}ms exceeds 1s`);
  });
});
