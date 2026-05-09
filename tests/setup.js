// Global test setup
const path = require('path');
const fs = require('fs');

// Ensure test data directory exists
const testDataDir = path.join(__dirname, 'fixtures', 'temp');
if (!fs.existsSync(testDataDir)) {
  fs.mkdirSync(testDataDir, { recursive: true });
}

// Clean up temp files after all tests
afterAll(() => {
  const files = fs.readdirSync(testDataDir);
  for (const file of files) {
    fs.unlinkSync(path.join(testDataDir, file));
  }
});

// Global test timeout
jest.setTimeout(30000);