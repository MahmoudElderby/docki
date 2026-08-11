import { expect } from 'chai';
import { MERMAID_SECURITY_LEVEL } from '../../src/constants';
import { sanitizeMermaidSource } from '../../src/utils/mermaidSanitize';

describe('sanitizeMermaidSource', () => {
  describe('br handling — join not split', () => {
    it('replaces <br/> with an em-dash separator (not a newline)', () => {
      const result = sanitizeMermaidSource(
        'Note over Ntf: first<br/>second',
        'normal'
      );
      expect(result).to.equal('Note over Ntf: first — second');
      expect(result).to.not.include('\nsecond');
    });

    it('handles <br>, <br />, and case variants', () => {
      expect(sanitizeMermaidSource('Note over X: a<br>b', 'normal')).to.include(' — ');
      expect(sanitizeMermaidSource('Note over X: a<br />b', 'normal')).to.include(' — ');
      expect(sanitizeMermaidSource('Note over X: a<BR>b', 'normal')).to.include(' — ');
    });
  });

  describe('semicolon in sequence message payloads', () => {
    it('neutralizes semicolons in arrow message text (Mermaid statement terminator)', () => {
      const input = [
        'sequenceDiagram',
        '    Pay->>Pay: Load master PaymentConfigurations; force Environment = mtnghana',
        '    Pay->>Cube: POST api/MoMoPayRegister (CallBackURL with GUID)',
      ].join('\n');
      const result = sanitizeMermaidSource(input, 'normal');
      expect(result).to.include(
        'Pay->>Pay: Load master PaymentConfigurations, force Environment = mtnghana'
      );
      expect(result).to.not.match(/Configurations; force/);
    });

    it('neutralizes semicolons in Note text', () => {
      const input = '    Note over Ntf: HTTP 200 checked; returns true';
      const result = sanitizeMermaidSource(input, 'normal');
      expect(result).to.include('HTTP 200 checked, returns true');
    });

    it('does not alter participant lines', () => {
      const input = '    participant Pay as StoreCloud.Payment';
      expect(sanitizeMermaidSource(input, 'normal')).to.equal(input);
    });
  });

  describe('CRLF source', () => {
    it('handles CRLF knowledge files without dropping statements', () => {
      const input = [
        'sequenceDiagram',
        '    Pay->>Pay: A; B',
        '    Pay->>Cube: C',
      ].join('\r\n');
      const result = sanitizeMermaidSource(input, 'normal');
      expect(result).to.include('Pay->>Pay: A, B');
      expect(result).to.include('Pay->>Cube: C');
    });
  });

  describe('strict mode', () => {
    it('removes residual angle-bracket tags from payloads', () => {
      const input = '    Pay->>Pay: check <status> code';
      const result = sanitizeMermaidSource(input, 'strict');
      expect(result).to.not.include('<status>');
      expect(result).to.include('status');
    });
  });

  describe('render contract — securityLevel', () => {
    it('keeps securityLevel strict unchanged in panel bundle', () => {
      expect(MERMAID_SECURITY_LEVEL).to.equal('strict');
    });
  });
});
