// tests/unit/mcp/data-plane.test.js

const mockTool = jest.fn();
const mockConnect = jest.fn();

jest.mock('@modelcontextprotocol/sdk/server/mcp.js', () => ({
  McpServer: jest.fn().mockImplementation(() => ({
    tool: mockTool,
    connect: mockConnect
  }))
}));

jest.mock('@modelcontextprotocol/sdk/server/stdio.js', () => ({
  StdioServerTransport: jest.fn()
}));

const { DataPlaneMcpServer } = require('../../../src/mcp/data-plane');

describe('DataPlaneMcpServer', () => {
  let server;

  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = jest.fn();
    server = new DataPlaneMcpServer({ baseUrl: 'http://localhost:3000' });
  });

  afterEach(() => {
    delete global.fetch;
  });

  describe('constructor', () => {
    it('uses provided baseUrl', () => {
      expect(server.baseUrl).toBe('http://localhost:3000');
    });

    it('falls back to env var', () => {
      process.env.DOCKET_DATA_URL = 'http://docket:8080';
      const s = new DataPlaneMcpServer();
      expect(s.baseUrl).toBe('http://docket:8080');
      delete process.env.DOCKET_DATA_URL;
    });

    it('falls back to default localhost', () => {
      delete process.env.DOCKET_DATA_URL;
      const s = new DataPlaneMcpServer();
      expect(s.baseUrl).toBe('http://localhost:3000');
    });

    it('strips trailing slash from baseUrl', () => {
      const s = new DataPlaneMcpServer({ baseUrl: 'http://localhost:3000/' });
      expect(s.baseUrl).toBe('http://localhost:3000');
    });

    it('registers tools on construction', () => {
      expect(mockTool).toHaveBeenCalledTimes(7);
    });
  });

  describe('_fetch', () => {
    it('returns JSON on success', async () => {
      global.fetch.mockResolvedValue({
        ok: true,
        text: async () => '{}',
        json: async () => ({ result: 'ok' })
      });

      const result = await server._fetch('/test');
      expect(result).toEqual({ result: 'ok' });
      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:3000/test',
        expect.objectContaining({
          headers: { 'Content-Type': 'application/json' }
        })
      );
    });

    it('throws on HTTP error', async () => {
      global.fetch.mockResolvedValue({
        ok: false,
        status: 500,
        text: async () => 'Internal Server Error'
      });

      await expect(server._fetch('/test')).rejects.toThrow('HTTP 500: Internal Server Error');
    });

    it('returns empty object on invalid JSON', async () => {
      global.fetch.mockResolvedValue({
        ok: true,
        json: async () => { throw new Error('bad json'); }
      });

      const result = await server._fetch('/test');
      expect(result).toEqual({});
    });

    it('merges custom headers', async () => {
      global.fetch.mockResolvedValue({
        ok: true,
        json: async () => ({})
      });

      await server._fetch('/test', { headers: { 'X-Custom': 'val' } });

      expect(global.fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: {
            'Content-Type': 'application/json',
            'X-Custom': 'val'
          }
        })
      );
    });
  });

  describe('_text', () => {
    it('formats string content', () => {
      const result = server._text('hello');
      expect(result).toEqual({
        content: [{ type: 'text', text: 'hello' }]
      });
    });

    it('formats object content as JSON', () => {
      const result = server._text({ a: 1 });
      expect(result).toEqual({
        content: [{ type: 'text', text: '{\n  "a": 1\n}' }]
      });
    });
  });

  describe('_error', () => {
    it('formats error message', () => {
      const result = server._error('something broke');
      expect(result).toEqual({
        content: [{ type: 'text', text: 'something broke' }],
        isError: true
      });
    });
  });

  describe('docket_query tool', () => {
    it('returns query results', async () => {
      global.fetch.mockResolvedValue({
        ok: true,
        json: async () => ({ memories: [] })
      });

      const handler = mockTool.mock.calls.find(c => c[0] === 'docket_query')[3];
      const result = await handler({ question: 'test', topK: 5 });

      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:3000/query',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ question: 'test', topK: 5 })
        })
      );
      expect(result).toEqual({ content: [{ type: 'text', text: '{\n  "memories": []\n}' }] });
    });

    it('returns error on failure', async () => {
      global.fetch.mockRejectedValue(new Error('timeout'));

      const handler = mockTool.mock.calls.find(c => c[0] === 'docket_query')[3];
      const result = await handler({ question: 'test' });

      expect(result).toEqual({
        content: [{ type: 'text', text: 'timeout' }],
        isError: true
      });
    });
  });

  describe('docket_ingest tool', () => {
    it('ingests content', async () => {
      global.fetch.mockResolvedValue({
        ok: true,
        json: async () => ({ id: 'mem_123' })
      });

      const handler = mockTool.mock.calls.find(c => c[0] === 'docket_ingest')[3];
      const result = await handler({ content: 'hello', filePath: '/tmp/f.txt' });

      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:3000/ingest',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ content: 'hello', filePath: '/tmp/f.txt', contentType: undefined })
        })
      );
      expect(result.content[0].text).toContain('mem_123');
    });

    it('returns error on failure', async () => {
      global.fetch.mockRejectedValue(new Error('ingest failed'));
      const handler = mockTool.mock.calls.find(c => c[0] === 'docket_ingest')[3];
      const result = await handler({ content: 'hello' });
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toBe('ingest failed');
    });
  });

  describe('docket_get tool', () => {
    it('retrieves a memory', async () => {
      global.fetch.mockResolvedValue({
        ok: true,
        json: async () => ({ id: 'mem_abc' })
      });

      const handler = mockTool.mock.calls.find(c => c[0] === 'docket_get')[3];
      const result = await handler({ id: 'mem_abc' });

      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:3000/memories/mem_abc',
        expect.any(Object)
      );
      expect(result.content[0].text).toContain('mem_abc');
    });

    it('returns error on failure', async () => {
      global.fetch.mockRejectedValue(new Error('get failed'));
      const handler = mockTool.mock.calls.find(c => c[0] === 'docket_get')[3];
      const result = await handler({ id: 'mem_abc' });
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toBe('get failed');
    });
  });

  describe('docket_create tool', () => {
    it('creates a memory', async () => {
      global.fetch.mockResolvedValue({
        ok: true,
        json: async () => ({ id: 'mem_new' })
      });

      const handler = mockTool.mock.calls.find(c => c[0] === 'docket_create')[3];
      const result = await handler({ rawRef: 'blob-1', sector: 'semantic' });

      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:3000/memories',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ rawRef: 'blob-1', contentType: undefined, summary: undefined, sector: 'semantic', metadata: undefined })
        })
      );
      expect(result.content[0].text).toContain('mem_new');
    });

    it('returns error on failure', async () => {
      global.fetch.mockRejectedValue(new Error('create failed'));
      const handler = mockTool.mock.calls.find(c => c[0] === 'docket_create')[3];
      const result = await handler({ rawRef: 'blob-1' });
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toBe('create failed');
    });
  });

  describe('docket_update tool', () => {
    it('updates a memory', async () => {
      global.fetch.mockResolvedValue({
        ok: true,
        json: async () => ({ id: 'mem_upd' })
      });

      const handler = mockTool.mock.calls.find(c => c[0] === 'docket_update')[3];
      const result = await handler({ id: 'mem_upd', summary: 'new summary' });

      expect(result.content[0].text).toContain('mem_upd');
      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:3000/memories/mem_upd',
        expect.objectContaining({
          method: 'PATCH',
          body: JSON.stringify({ summary: 'new summary' })
        })
      );
    });

    it('returns error on failure', async () => {
      global.fetch.mockRejectedValue(new Error('update failed'));
      const handler = mockTool.mock.calls.find(c => c[0] === 'docket_update')[3];
      const result = await handler({ id: 'mem_upd', summary: 'new summary' });
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toBe('update failed');
    });
  });

  describe('docket_delete tool', () => {
    it('deletes a memory', async () => {
      global.fetch.mockResolvedValue({
        ok: true,
        json: async () => ({ deleted: true })
      });

      const handler = mockTool.mock.calls.find(c => c[0] === 'docket_delete')[3];
      const result = await handler({ id: 'mem_del' });

      expect(result.content[0].text).toContain('deleted');
      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:3000/memories/mem_del',
        expect.objectContaining({ method: 'DELETE' })
      );
    });

    it('returns error on failure', async () => {
      global.fetch.mockRejectedValue(new Error('delete failed'));
      const handler = mockTool.mock.calls.find(c => c[0] === 'docket_delete')[3];
      const result = await handler({ id: 'mem_del' });
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toBe('delete failed');
    });
  });

  describe('docket_relate tool', () => {
    it('creates a relation', async () => {
      global.fetch.mockResolvedValue({
        ok: true,
        json: async () => ({ id: 'rel_1' })
      });

      const handler = mockTool.mock.calls.find(c => c[0] === 'docket_relate')[3];
      const result = await handler({ sourceId: 'a', targetId: 'b', type: 'similar', confidence: 0.9 });

      expect(result.content[0].text).toContain('rel_1');
      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:3000/memories/a/relations',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ targetId: 'b', type: 'similar', confidence: 0.9 })
        })
      );
    });

    it('returns error on failure', async () => {
      global.fetch.mockRejectedValue(new Error('relate failed'));
      const handler = mockTool.mock.calls.find(c => c[0] === 'docket_relate')[3];
      const result = await handler({ sourceId: 'a', targetId: 'b', type: 'similar' });
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toBe('relate failed');
    });
  });

  describe('start', () => {
    it('connects stdio transport', async () => {
      await server.start();
      expect(mockConnect).toHaveBeenCalled();
    });
  });
});
