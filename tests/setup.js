// Global test setup
const path = require('path');
const fs = require('fs');

// Ensure test data directory exists
const testDataDir = path.join(__dirname, 'fixtures', 'temp');
if (!fs.existsSync(testDataDir)) {
  fs.mkdirSync(testDataDir, { recursive: true });
}

// Global test timeout
jest.setTimeout(30000);
