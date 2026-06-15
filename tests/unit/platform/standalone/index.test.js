// tests/unit/platform/standalone/index.test.js

const standalone = require('../../../../src/platform/standalone');
const unified = require('../../../../src/platform/unified');

describe('Standalone Platform Index', () => {
  it('re-exports build and start functions from unified app', () => {
    expect(standalone.buildUnifiedApp).toBe(unified.buildUnifiedApp);
    expect(standalone.startUnifiedApp).toBe(unified.startUnifiedApp);
  });
});
