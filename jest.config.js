module.exports = {
  testEnvironment: 'node',
  coverageDirectory: 'coverage',
  collectCoverageFrom: [
    'src/**/*.js',
    '!src/platform/**/*.js', // Platform-specific, tested via E2E
    '!src/scripts/**/*.js'
  ],
  testMatch: [
    '**/tests/**/*.test.js'
  ],
  moduleNameMapper: {
    '^@cortex/core/(.*)$': '<rootDir>/src/core/$1',
    '^@cortex/server/(.*)$': '<rootDir>/src/server/$1',
    '^@cortex/adapters/(.*)$': '<rootDir>/src/adapters/$1'
  },
  setupFilesAfterEnv: ['<rootDir>/tests/setup.js'],
  verbose: true,
  forceExit: true
};