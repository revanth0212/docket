// tests/unit/platform/control/bin.test.js

jest.mock('../../../../src/control-plane/app', () => ({
  startControlPlane: jest.fn()
}));

const { startControlPlane } = require('../../../../src/control-plane/app');
const { main } = require('../../../../src/platform/control/bin');

describe('Control Plane Bin', () => {
  const originalExit = process.exit;

  beforeEach(() => {
    jest.clearAllMocks();
    process.exit = jest.fn();
    delete process.env.DOCKET_CONTROL_PORT;
    delete process.env.DOCKET_CONTROL_HOST;
  });

  afterEach(() => {
    process.exit = originalExit;
  });

  it('starts with defaults', async () => {
    startControlPlane.mockResolvedValue();
    await main();
    expect(startControlPlane).toHaveBeenCalledWith({ port: 3001, host: '0.0.0.0' });
  });

  it('uses env vars', async () => {
    process.env.DOCKET_CONTROL_PORT = '5001';
    process.env.DOCKET_CONTROL_HOST = 'localhost';
    startControlPlane.mockResolvedValue();
    await main();
    expect(startControlPlane).toHaveBeenCalledWith({ port: 5001, host: 'localhost' });
  });

  it('exits on failure', async () => {
    startControlPlane.mockRejectedValue(new Error('port in use'));
    await main();
    expect(process.exit).toHaveBeenCalledWith(1);
  });
});
