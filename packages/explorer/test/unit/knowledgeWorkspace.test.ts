import { assert } from 'chai';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { buildDocument, discoverDocuments } from '../../src/services/KnowledgeWorkspaceService';

describe('knowledgeWorkspace (filesystem)', () => {
  let tmpDir: string;
  let knowledgeRoot: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'kw-'));
    knowledgeRoot = path.join(tmpDir, 'knowledge');
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('detects missing folder', () => {
    assert.isFalse(fs.existsSync(knowledgeRoot));
  });

  it('detects empty folder (no markdown)', () => {
    fs.mkdirSync(knowledgeRoot, { recursive: true });
    fs.writeFileSync(path.join(knowledgeRoot, 'image.png'), 'binary');
    const files = fs.readdirSync(knowledgeRoot);
    const mdFiles = files.filter((f) => f.endsWith('.md'));
    assert.lengthOf(mdFiles, 0);
  });

  it('detects populated folder with markdown', async () => {
    fs.mkdirSync(path.join(knowledgeRoot, 'domains'), { recursive: true });
    fs.writeFileSync(path.join(knowledgeRoot, 'README.md'), '# Readme');
    fs.writeFileSync(path.join(knowledgeRoot, 'domains', 'payment.md'), '# Payment');
    const rootUri = { fsPath: knowledgeRoot } as import('vscode').Uri;
    const docs = await discoverDocuments(rootUri);
    assert.isAtLeast(docs.length, 2);
  });

  it('builds document with headings', () => {
    fs.mkdirSync(knowledgeRoot, { recursive: true });
    const filePath = path.join(knowledgeRoot, 'test.md');
    fs.writeFileSync(filePath, '# Title\n\nContent');
    const rootUri = { fsPath: knowledgeRoot } as import('vscode').Uri;
    const doc = buildDocument(rootUri, filePath);
    assert.equal(doc.fileName, 'test.md');
    assert.isAtLeast(doc.headings.length, 1);
    assert.equal(doc.headings[0].text, 'Title');
  });

  it('transitions from empty to populated on scan', async () => {
    fs.mkdirSync(knowledgeRoot, { recursive: true });
    fs.writeFileSync(path.join(knowledgeRoot, 'image.png'), 'x');
    const rootUri = { fsPath: knowledgeRoot } as import('vscode').Uri;
    let docs = await discoverDocuments(rootUri);
    assert.lengthOf(docs, 0);

    fs.writeFileSync(path.join(knowledgeRoot, 'new.md'), '# New Doc');
    docs = await discoverDocuments(rootUri);
    assert.lengthOf(docs, 1);
  });
});
