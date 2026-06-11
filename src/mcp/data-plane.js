// src/mcp/data-plane.js
// MCP server wrapping the Docket Data Plane HTTP API

const { McpServer } = require('@modelcontextprotocol/sdk/server/mcp.js');
const { StdioServerTransport } = require('@modelcontextprotocol/sdk/server/stdio.js');
const { z } = require('zod');

class DataPlaneMcpServer {
  constructor(options = {}) {
    this.baseUrl = (options.baseUrl || process.env.DOCKET_DATA_URL || 'http://localhost:3000').replace(/\/$/, '');
    this.server = new McpServer({
      name: 'docket-mcp-data',
      version: '0.1.0'
    });
    this._registerTools();
  }

  async _fetch(path, options = {}) {
    const url = `${this.baseUrl}${path}`;
    const res = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers || {})
      }
    });
    if (!res.ok) {
      const text = await res.text().catch(() => 'Unknown error');
      throw new Error(`HTTP ${res.status}: ${text}`);
    }
    return res.json().catch(() => ({}));
  }

  _text(content) {
    return { content: [{ type: 'text', text: typeof content === 'string' ? content : JSON.stringify(content, null, 2) }] };
  }

  _error(message) {
    return { content: [{ type: 'text', text: message }], isError: true };
  }

  _registerTools() {
    this.server.tool(
      'docket_query',
      'Ask a natural-language question against your Docket memory.',
      {
        question: z.string().describe('The question to ask.'),
        topK: z.number().optional().describe('Number of results to retrieve.')
      },
      async (args) => {
        try {
          const result = await this._fetch('/query', {
            method: 'POST',
            body: JSON.stringify({ question: args.question, topK: args.topK })
          });
          return this._text(result);
        } catch (err) {
          return this._error(err.message);
        }
      }
    );

    this.server.tool(
      'docket_ingest',
      'Ingest text or a file reference into Docket.',
      {
        content: z.string().optional().describe('Raw text content to ingest.'),
        filePath: z.string().optional().describe('Path to a file to ingest.'),
        contentType: z.string().optional().describe('MIME type of the content.')
      },
      async (args) => {
        try {
          const result = await this._fetch('/ingest', {
            method: 'POST',
            body: JSON.stringify({ content: args.content, filePath: args.filePath, contentType: args.contentType })
          });
          return this._text(result);
        } catch (err) {
          return this._error(err.message);
        }
      }
    );

    this.server.tool(
      'docket_get',
      'Retrieve a memory by ID.',
      {
        id: z.string().describe('Memory ID (e.g. mem_abc123).')
      },
      async (args) => {
        try {
          const result = await this._fetch(`/memories/${encodeURIComponent(args.id)}`);
          return this._text(result);
        } catch (err) {
          return this._error(err.message);
        }
      }
    );

    this.server.tool(
      'docket_create',
      'Create a memory directly.',
      {
        rawRef: z.string().describe('Blob reference or raw content identifier.'),
        contentType: z.string().optional().describe('MIME type.'),
        summary: z.string().optional().describe('Human-readable summary.'),
        sector: z.string().optional().describe('Memory sector (episodic, semantic, procedural).'),
        metadata: z.record(z.any()).optional().describe('Arbitrary key-value metadata.')
      },
      async (args) => {
        try {
          const result = await this._fetch('/memories', {
            method: 'POST',
            body: JSON.stringify(args)
          });
          return this._text(result);
        } catch (err) {
          return this._error(err.message);
        }
      }
    );

    this.server.tool(
      'docket_update',
      'Update a memory by ID.',
      {
        id: z.string().describe('Memory ID to update.'),
        summary: z.string().optional(),
        sector: z.string().optional(),
        salience: z.number().optional(),
        metadata: z.record(z.any()).optional()
      },
      async (args) => {
        try {
          const { id, ...body } = args;
          const result = await this._fetch(`/memories/${encodeURIComponent(id)}`, {
            method: 'PATCH',
            body: JSON.stringify(body)
          });
          return this._text(result);
        } catch (err) {
          return this._error(err.message);
        }
      }
    );

    this.server.tool(
      'docket_delete',
      'Delete a memory by ID.',
      {
        id: z.string().describe('Memory ID to delete.')
      },
      async (args) => {
        try {
          const result = await this._fetch(`/memories/${encodeURIComponent(args.id)}`, {
            method: 'DELETE'
          });
          return this._text(result);
        } catch (err) {
          return this._error(err.message);
        }
      }
    );

    this.server.tool(
      'docket_relate',
      'Create a relation between two memories.',
      {
        sourceId: z.string().describe('Source memory ID.'),
        targetId: z.string().describe('Target memory ID.'),
        type: z.string().describe('Relation type (e.g. caused, similar, partOf).'),
        confidence: z.number().min(0).max(1).optional().describe('Confidence score 0-1.')
      },
      async (args) => {
        try {
          const { sourceId, ...body } = args;
          const result = await this._fetch(`/memories/${encodeURIComponent(sourceId)}/relations`, {
            method: 'POST',
            body: JSON.stringify(body)
          });
          return this._text(result);
        } catch (err) {
          return this._error(err.message);
        }
      }
    );
  }

  async start() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
  }
}

module.exports = { DataPlaneMcpServer };
