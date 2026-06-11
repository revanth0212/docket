// tests/unit/platform/unified/index.test.js

const index = require('../../../../src/platform/unified/index');

describe('Platform Unified Index', () => {
  it('exports buildUnifiedApp', () => {
    expect(typeof index.buildUnifiedApp).toBe('function');
  });

  it('exports startUnifiedApp', () => {
    expect(typeof index.startUnifiedApp).toBe('function');
  });
});
