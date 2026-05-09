module.exports = {
  root: true,
  env: {
    node: true,
    es2023: true,
    jest: true
  },
  extends: ['eslint:recommended'],
  parserOptions: {
    ecmaVersion: 2023,
    sourceType: 'module'
  },
  rules: {
    // Core architecture enforcement: no adapter imports in core
    'no-restricted-imports': ['error', {
      paths: [],
      patterns: [{
        group: ['*/adapters/*'],
        message: 'Core modules MUST NOT import from adapters. Use dependency injection.'
      }]
    }],

    // Code quality
    'no-console': ['warn', { allow: ['error'] }],
    'no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    'no-throw-literal': 'error',
    'prefer-const': 'error',
    'no-var': 'error',

    // Async
    'require-await': 'error',
    'no-return-await': 'error',

    // Style
    'quotes': ['error', 'single', { avoidEscape: true }],
    'semi': ['error', 'always'],
    'indent': ['error', 2],
    'max-len': ['warn', { code: 100, ignoreComments: true, ignoreStrings: true }]
  },
  overrides: [
    {
      files: ['src/core/interfaces/*.js'],
      rules: {
        'no-restricted-imports': 'off' // Interfaces can be imported anywhere
      }
    },
    {
      files: ['src/platform/**/*.js', 'src/server/**/*.js'],
      rules: {
        'no-restricted-imports': ['error', {
          patterns: [{
            group: ['*/adapters/*/index.js'],
            message: 'Platform/server should use adapter registry, not direct imports'
          }]
        }]
      }
    }
  ]
};