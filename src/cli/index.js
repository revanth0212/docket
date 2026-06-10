#!/usr/bin/env node
// src/cli/index.js
// Docket CLI — direct engine interaction, scripting, and operations

const BASE_URL = process.env.DOCKET_BASE_URL || process.env.CORTEX_BASE_URL || 'http://localhost:3000';
const CONTROL_URL = process.env.DOCKET_CONTROL_URL || process.env.CORTEX_CONTROL_URL || 'http://localhost:3001';

function usage() {
  console.log(`
Usage: docket <command> [options]

Commands:
  start [options]          Start a Docket server
  health                   Check data plane health
  doctor                   Check prerequisites and system health
  plugin list              List registered plugins
  plugin add <package>     Register a new plugin
  config                   Show current runtime config
  help                     Show this help message

Start options:
  --data                   Start data plane only (port 3000)
  --control                Start control plane only (port 3001)
  --unified                Start both planes in one process (default)
  --port <n>               Override port
  --host <addr>            Override host (default: 0.0.0.0)

Environment:
  DOCKET_BASE_URL          Data plane URL (default: http://localhost:3000)
  DOCKET_CONTROL_URL       Control plane URL (default: http://localhost:3001)
`);
}

async function cmdStart(args) {
  const isData = args.includes('--data');
  const isControl = args.includes('--control');
  const isUnified = args.includes('--unified') || (!isData && !isControl);

  const portIdx = args.indexOf('--port');
  const port = portIdx !== -1 ? Number(args[portIdx + 1]) : undefined;
  const hostIdx = args.indexOf('--host');
  const host = hostIdx !== -1 ? args[hostIdx + 1] : undefined;

  if (isUnified) {
    const { startUnifiedApp } = require('../platform/unified/app');
    const { loadConfig } = require('../core/config/loader');
    const { AdapterRegistry } = require('../core/utils/adapter-registry');

    let config;
    try {
      config = loadConfig();
    } catch (err) {
      console.error('Failed to load configuration:', err.message);
      process.exit(1);
    }

    const registry = new AdapterRegistry();
    let adapters;
    try {
      adapters = await registry.initializeFromConfig(config);
    } catch (err) {
      console.error('Failed to initialize adapters:', err.message);
      process.exit(1);
    }

    const opts = { port, host, adapters, registry, config };
    await startUnifiedApp(opts);
    return;
  }

  if (isData) {
    const { startDataPlane } = require('../data-plane/app');
    await startDataPlane({ port, host });
    return;
  }

  if (isControl) {
    const { startControlPlane } = require('../control-plane/app');
    await startControlPlane({ port, host });
    return;
  }
}

async function cmdHealth() {
  try {
    const res = await fetch(`${BASE_URL}/health`, { signal: AbortSignal.timeout(5000) });
    const data = await res.json();
    console.log(JSON.stringify(data, null, 2));
  } catch (err) {
    console.error(`Health check failed: ${err.message}`);
    process.exit(1);
  }
}

async function cmdDoctor() {
  require('../scripts/doctor');
}

async function cmdPluginList() {
  try {
    const res = await fetch(`${CONTROL_URL}/admin/plugins`, { signal: AbortSignal.timeout(5000) });
    const data = await res.json();
    if (!data.plugins || data.plugins.length === 0) {
      console.log('No plugins registered.');
      return;
    }
    console.log('Registered plugins:');
    for (const p of data.plugins) {
      console.log(`  - ${p.name || p.packageName || JSON.stringify(p)}`);
    }
  } catch (err) {
    console.error(`Failed to list plugins: ${err.message}`);
    process.exit(1);
  }
}

async function cmdPluginAdd(args) {
  const pkg = args[0];
  if (!pkg) {
    console.error('Usage: docket plugin add <package-name>');
    process.exit(1);
  }

  try {
    const res = await fetch(`${CONTROL_URL}/admin/plugins`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ packageName: pkg, config: {} }),
      signal: AbortSignal.timeout(10000)
    });
    const data = await res.json();
    if (!res.ok) {
      console.error(`Failed to add plugin: ${data.error || res.statusText}`);
      process.exit(1);
    }
    console.log(`Plugin registered: ${pkg}`);
    console.log(JSON.stringify(data, null, 2));
  } catch (err) {
    console.error(`Failed to add plugin: ${err.message}`);
    process.exit(1);
  }
}

async function cmdConfig() {
  try {
    const res = await fetch(`${CONTROL_URL}/admin/config`, { signal: AbortSignal.timeout(5000) });
    const data = await res.json();
    console.log(JSON.stringify(data, null, 2));
  } catch (err) {
    console.error(`Failed to fetch config: ${err.message}`);
    process.exit(1);
  }
}

async function main() {
  const args = process.argv.slice(2);
  const command = args[0];

  switch (command) {
    case 'start':
      await cmdStart(args.slice(1));
      break;
    case 'health':
      await cmdHealth();
      break;
    case 'doctor':
      await cmdDoctor();
      break;
    case 'plugin': {
      const sub = args[1];
      if (sub === 'list') {
        await cmdPluginList();
      } else if (sub === 'add') {
        await cmdPluginAdd(args.slice(2));
      } else {
        console.error('Usage: docket plugin <list|add>');
        process.exit(1);
      }
      break;
    }
    case 'config':
      await cmdConfig();
      break;
    case 'help':
    case '--help':
    case '-h':
      usage();
      break;
    default:
      if (command) {
        console.error(`Unknown command: ${command}`);
      }
      usage();
      if (command && command !== 'help' && command !== '--help' && command !== '-h') {
        process.exit(1);
      }
      break;
  }
}

main().catch((err) => {
  console.error('Unexpected error:', err.message);
  process.exit(1);
});
