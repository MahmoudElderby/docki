import { assert } from 'chai';
import * as fs from 'fs';
import * as path from 'path';

describe('cspPolicy', () => {
  it('panel.html CSP excludes https, data, and remote connect-src', () => {
    const htmlPath = path.join(__dirname, '../../src/webview/panel.html');
    const html = fs.readFileSync(htmlPath, 'utf8');
    const cspMatch = html.match(/Content-Security-Policy"\s+content="([^"]+)"/);
    assert.exists(cspMatch);
    const csp = cspMatch![1];
    assert.notInclude(csp, 'https:');
    assert.notInclude(csp, 'data:');
    assert.notInclude(csp, 'connect-src');
    assert.include(csp, "default-src 'none'");
    assert.include(csp, 'nonce-');
  });
});
