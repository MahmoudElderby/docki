import { expect } from 'chai';
import * as fs from 'fs';
import * as path from 'path';

describe('package.json contributes', () => {
  const pkgPath = path.join(__dirname, '../../package.json');
  const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));

  describe('version', () => {
    it('ships V2 at 0.2.1', () => {
      expect(pkg.version).to.equal('0.2.1');
    });
  });

  describe('reload command', () => {
    it('registers dockiExplorer.reload', () => {
      const cmd = pkg.contributes.commands.find(
        (c: { command: string }) => c.command === 'dockiExplorer.reload'
      );
      expect(cmd).to.exist;
      expect(cmd.title).to.equal('Docki Explorer: Reload');
    });
  });

  describe('view/title search menu', () => {
    it('references dockiExplorer.search with search icon on knowledge tree', () => {
      const entries = pkg.contributes.menus?.['view/title'] ?? [];
      const searchEntry = entries.find(
        (e: { command: string }) => e.command === 'dockiExplorer.search'
      );
      expect(searchEntry).to.exist;
      expect(searchEntry.when).to.equal('view == dockiExplorer.knowledgeTree');
      expect(searchEntry.group).to.equal('navigation@1');
      expect(searchEntry.icon).to.equal('$(search)');
    });
  });
});
