#!/usr/bin/env node
// src/scripts/doctor.js
// Check system health and prerequisites before starting Cortex

const fs = require('fs');
const path = require('path');

let exitCode = 0;

function ok(message) {
  console.log(`  ✅ ${message}`);
}

function warn(message) {
  console.log(`  ⚠️  ${message}`);
}

function fail(message) {
  console.log(`  ❌ ${message}`);
  exitCode = 1;
}

async function checkNodeVersion() {
  const version = process.version;
  const major = parseInt(version.slice(1).split('.')[0], 10);
  if (major >= 20) {
    ok(`Node.js ${version}`);
  } else {
    fail(`Node.js ${version} — requires >= 20.0.0`);
  }
}

async function checkNpmPackages() {
  const nodeModules = path.join(process.cwd(), 'node_modules');
  if (!fs.existsSync(nodeModules)) {
    fail('node_modules/ missing — run `npm install`');
    return;
  }

  const critical = ['fastify', 'better-sqlite3', 'js-yaml', 'zod'];
  for (const pkg of critical) {
    const pkgPath = path.join(nodeModules, pkg);
    if (fs.existsSync(pkgPath)) {
      ok(`npm package: ${pkg}`);
    } else {
      fail(`npm package missing: ${pkg}`);
    }
  }
}

async function checkDataDirectory() {
  const dataDir = path.join(process.cwd(), 'data');
  ensureDir(dataDir);

  try {
    const testFile = path.join(dataDir, '.write-test');
    fs.writeFileSync(testFile, 'ok');
    fs.unlinkSync(testFile);
    ok(`Data directory writable: ${dataDir}`);
  } catch (err) {
    fail(`Data directory not writable: ${err.message}`);
  }
}

async function checkConfig() {
  const configPath = path.join(process.cwd(), 'config', 'config.yaml');
  const defaultsPath = path.join(process.cwd(), 'config', 'defaults.yaml');

  if (fs.existsSync(configPath)) {
    ok('User config: config/config.yaml');
  } else if (fs.existsSync(defaultsPath)) {
    warn('No user config — using defaults.yaml. Run `npm run setup` to customize.');
  } else {
    fail('No config files found');
  }
}

async function checkOllama() {
  const url = process.env.OLLAMA_URL || 'http://localhost:11434';
  try {
    const res = await fetch(`${url}/api/tags`, { signal: AbortSignal.timeout(5000) });
    if (res.ok) {
      const data = await res.json();
      const models = data.models?.map((m) => m.name).join(', ') || 'none';
      ok(`Ollama reachable at ${url}`);
      ok(`Ollama models: ${models}`);
    } else {
      fail(`Ollama returned HTTP ${res.status} at ${url}`);
    }
  } catch (err) {
    fail(`Ollama unreachable at ${url}: ${err.message}`);
    console.log('     Install: https://ollama.com/download');
    console.log('     Then run: ollama pull llama3.2 && ollama pull nomic-embed-text && ollama serve');
  }
}

function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

async function main() {
  console.log('\n🩺 Cortex Doctor\n');

  console.log('Node.js:');
  await checkNodeVersion();

  console.log('\nDependencies:');
  await checkNpmPackages();

  console.log('\nStorage:');
  await checkDataDirectory();

  console.log('\nConfiguration:');
  await checkConfig();

  console.log('\nAdapters:');
  await checkOllama();

  console.log();
  if (exitCode === 0) {
    console.log('🎉 All checks passed. You are ready to run `npm start`.\n');
  } else {
    console.log('🔧 Please fix the issues above before starting Cortex.\n');
  }

  process.exit(exitCode);
}

main().catch((err) => {
  console.error('Doctor failed:', err.message);
  process.exit(1);
});
