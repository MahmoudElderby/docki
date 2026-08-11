import { expect } from 'chai';
import { resolveMermaidTheme } from '../../src/utils/mermaidTheme';

describe('resolveMermaidTheme', () => {
  describe('known IDE theme kinds', () => {
    it('maps light to default theme', () => {
      const config = resolveMermaidTheme('light');
      expect(config.theme).to.equal('default');
      expect(config.isFallback).to.equal(false);
      expect(config.themeVariables).to.be.undefined;
    });

    it('maps dark to dark theme', () => {
      const config = resolveMermaidTheme('dark');
      expect(config.theme).to.equal('dark');
      expect(config.isFallback).to.equal(false);
      expect(config.themeVariables).to.be.undefined;
    });

    it('maps highContrast to dark with elevated themeVariables', () => {
      const config = resolveMermaidTheme('highContrast');
      expect(config.theme).to.equal('dark');
      expect(config.isFallback).to.equal(false);
      expect(config.themeVariables).to.exist;
      expect(config.themeVariables!.primaryTextColor).to.equal('#ffffff');
      expect(config.themeVariables!.lineColor).to.equal('#ffffff');
      expect(config.themeVariables!.noteTextColor).to.equal('#ffffff');
    });
  });

  describe('unknown or missing kind', () => {
    it('falls back to dark for undefined kind', () => {
      const config = resolveMermaidTheme(undefined);
      expect(config.theme).to.equal('dark');
      expect(config.isFallback).to.equal(true);
    });

    it('falls back to dark for unrecognized kind', () => {
      const config = resolveMermaidTheme('solarized');
      expect(config.theme).to.equal('dark');
      expect(config.isFallback).to.equal(true);
    });
  });
});
