#!/usr/bin/env node
// bin/mcp-data.js
// Docket MCP Data Plane server entry point (stdio transport)

const { DataPlaneMcpServer } = require('../src/mcp/data-plane');

function parseArgs(argv) {
  const args = {};
  for (let i = 2; i < argv.length; i++) {
    if (argv[i] === '--baseUrl' && argv[i + 1]) {
      args.baseUrl = argv[i + 1];
      i++;
    }
  }
  return args;
}

async function main() {
  const args = parseArgs(process.argv);
  const server = new DataPlaneMcpServer(args);
  await server.start();
}

main().catch((err) => {
  console.error('Fatal error starting MCP data plane server:', err.message);
  process.exit(1);
});
