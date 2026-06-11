#!/usr/bin/env node
// src/scripts/setup.js
// Interactive onboarding: creates config, data dirs, and runs doctor

const fs = require('fs');
const path = require('path');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function ask(question, defaultValue = '') {
  return new Promise((resolve) => {
    const prompt = defaultValue ? `${question} (${defaultValue}): ` : `${question}: `;
    rl.question(prompt, (answer) => {
      resolve(answer.trim() || defaultValue);
    });
  });
}

function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
    console.log(`  Created ${dir}`);
  }
}

function copyConfigExample() {
  const examplePath = path.join(process.cwd(), 'config', 'config.example.yaml');
  const configPath = path.join(process.cwd(), 'config', 'config.yaml');

  if (fs.existsSync(configPath)) {
    console.log('  config/config.yaml already exists. Skipping.');
    return;
  }

  if (!fs.existsSync(examplePath)) {
    console.error('  Missing config/config.example.yaml');
    return;
  }

  fs.copyFileSync(examplePath, configPath);
  console.log('  Created config/config.yaml from example');
}

async function runSetup() {
  console.log('\n🧠 Docket Setup\n');

  // Create data directories
  ensureDir(path.join(process.cwd(), 'data', 'blobs'));

  // Copy config template
  copyConfigExample();

  // Interactive provider selection
  console.log('\n--- Adapter Configuration ---\n');

  const llmProvider = await ask('LLM provider (ollama/lm-studio/openai/groq)', 'ollama');

  const llmDefaults = llmProvider === 'lm-studio'
    ? { url: 'http://localhost:1234/v1', model: 'local-model' }
    : { url: 'http://localhost:11434', model: 'llama3.2' };
  const llmUrl = await ask('LLM base URL', llmDefaults.url);
  const llmModel = await ask('LLM model', llmDefaults.model);

  const embedderDefaults = llmProvider === 'lm-studio'
    ? { url: 'http://localhost:1234/v1', model: 'local-model' }
    : { url: 'http://localhost:11434', model: 'nomic-embed-text' };
  const embedderUrl = await ask('Embedder base URL', embedderDefaults.url);
  const embedderModel = await ask('Embedder model', embedderDefaults.model);

  const storePath = await ask('SQLite database path', './data/docket.db');
  const blobPath = await ask('Blob storage path', './data/blobs');

  // Generate user config
  const llmAdapterName = llmProvider === 'ollama' ? 'ollama' : 'openai-compatible';

  const config = `docket:
  version: "0.2.0"

  adapters:
    llm:
      default: "${llmProvider}"
      providers:
        ${llmProvider}:
          adapter: "@docket/llm-${llmAdapterName}"
          config:
            baseUrl: "${llmUrl}"
            model: "${llmModel}"
            timeout: 30000

    embedder:
      default: "${llmProvider === 'lm-studio' ? 'lm-studio' : 'ollama'}"
      providers:
        ollama:
          adapter: "@docket/embedder-ollama"
          config:
            baseUrl: "${embedderUrl}"
            model: "${embedderModel}"
            dimensions: 768
        lm-studio:
          adapter: "@docket/embedder-openai-compatible"
          config:
            baseUrl: "${embedderUrl}"
            model: "${embedderModel}"
            dimensions: 768
            timeout: 30000

    store:
      default: "sqlite"
      providers:
        sqlite:
          adapter: "@docket/store-sqlite"
          config:
            path: "${storePath}"
            enableWAL: true
            busyTimeout: 5000

    blob:
      default: "filesystem"
      providers:
        filesystem:
          adapter: "@docket/blob-filesystem"
          config:
            basePath: "${blobPath}"
            maxFileSize: "100mb"

    queue:
      default: "in-memory"
      providers:
        in-memory:
          adapter: "@docket/queue-memory"
          config:
            maxConcurrent: 5
            retryAttempts: 3
            retryDelay: 1000
`;

  const configPath = path.join(process.cwd(), 'config', 'config.yaml');
  fs.writeFileSync(configPath, config);
  console.log(`\n  Written config to ${configPath}`);

  console.log('\n✅ Setup complete.\n');
  console.log('Next steps:');
  console.log('  1. Run `npm run doctor` to check prerequisites');
  console.log('  2. Run `npm start` to start the server');
  console.log('  3. Visit http://localhost:3000/health');
  console.log();

  rl.close();
}

runSetup().catch((err) => {
  console.error('Setup failed:', err.message);
  process.exit(1);
});
