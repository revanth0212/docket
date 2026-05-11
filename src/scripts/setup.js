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
  console.log('\n🧠 Cortex Setup\n');

  // Create data directories
  ensureDir(path.join(process.cwd(), 'data', 'blobs'));

  // Copy config template
  copyConfigExample();

  // Interactive provider selection
  console.log('\n--- Adapter Configuration ---\n');

  const llmProvider = await ask('LLM provider (ollama/openai/groq)', 'ollama');
  const llmUrl = await ask('LLM base URL', 'http://localhost:11434');
  const llmModel = await ask('LLM model', 'llama3.2');

  const embedderUrl = await ask('Embedder base URL', 'http://localhost:11434');
  const embedderModel = await ask('Embedder model', 'nomic-embed-text');

  const storePath = await ask('SQLite database path', './data/cortex.db');
  const blobPath = await ask('Blob storage path', './data/blobs');

  // Generate user config
  const config = `cortex:
  version: "0.2.0"

  adapters:
    llm:
      default: "${llmProvider}"
      providers:
        ${llmProvider}:
          adapter: "@cortex/llm-${llmProvider === 'ollama' ? 'ollama' : llmProvider}"
          config:
            baseUrl: "${llmUrl}"
            model: "${llmModel}"
            timeout: 30000

    embedder:
      default: "ollama"
      providers:
        ollama:
          adapter: "@cortex/embedder-ollama"
          config:
            baseUrl: "${embedderUrl}"
            model: "${embedderModel}"
            dimensions: 768

    store:
      default: "sqlite"
      providers:
        sqlite:
          adapter: "@cortex/store-sqlite"
          config:
            path: "${storePath}"
            enableWAL: true
            busyTimeout: 5000

    blob:
      default: "filesystem"
      providers:
        filesystem:
          adapter: "@cortex/blob-filesystem"
          config:
            basePath: "${blobPath}"
            maxFileSize: "100mb"

    queue:
      default: "in-memory"
      providers:
        in-memory:
          adapter: "@cortex/queue-memory"
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
