// tests/unit/data-plane/middleware/principal.test.js

const { buildPrincipalExtractor } = require('../../../../src/data-plane/middleware/principal');

describe('buildPrincipalExtractor', () => {
  function createRequest(headers = {}) {
    return { headers };
  }

  function createReply() {
    const reply = {
      sent: false,
      statusCode: null,
      payload: null,
      status(code) {
        this.statusCode = code;
        return this;
      },
      send(payload) {
        this.sent = true;
        this.payload = payload;
        return this;
      }
    };
    return reply;
  }

  it('sets principal to null when disabled', async () => {
    const extractor = buildPrincipalExtractor({ enabled: false });
    const request = createRequest({ 'x-principal': 'user:alice' });
    const reply = createReply();
    await extractor(request, reply);
    expect(request.principal).toBeNull();
    expect(reply.sent).toBe(false);
  });

  it('extracts principal from header', async () => {
    const extractor = buildPrincipalExtractor({ enabled: true, authStrategy: 'header' });
    const request = createRequest({ 'x-principal': 'user:alice' });
    const reply = createReply();
    await extractor(request, reply);
    expect(request.principal).toBe('user:alice');
    expect(reply.sent).toBe(false);
  });

  it('uses custom principal header', async () => {
    const extractor = buildPrincipalExtractor({ enabled: true, authStrategy: 'header', principalHeader: 'X-User' });
    const request = createRequest({ 'x-user': 'user:bob' });
    const reply = createReply();
    await extractor(request, reply);
    expect(request.principal).toBe('user:bob');
  });

  it('returns 401 when principal missing', async () => {
    const extractor = buildPrincipalExtractor({ enabled: true });
    const request = createRequest();
    const reply = createReply();
    await extractor(request, reply);
    expect(reply.sent).toBe(true);
    expect(reply.statusCode).toBe(401);
  });

  it('extracts principal from JWT', async () => {
    const crypto = require('crypto');
    const secret = 'test-secret';
    const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
    const payload = Buffer.from(JSON.stringify({ sub: 'user:alice' })).toString('base64url');
    const signature = crypto.createHmac('sha256', secret).update(`${header}.${payload}`).digest('base64url');
    const token = `${header}.${payload}.${signature}`;

    const extractor = buildPrincipalExtractor({ enabled: true, authStrategy: 'jwt', jwtSecret: secret });
    const request = createRequest({ authorization: `Bearer ${token}` });
    const reply = createReply();
    await extractor(request, reply);
    expect(request.principal).toBe('user:alice');
  });

  it('rejects invalid JWT', async () => {
    const extractor = buildPrincipalExtractor({ enabled: true, authStrategy: 'jwt', jwtSecret: 'secret' });
    const request = createRequest({ authorization: 'Bearer invalid.token.here' });
    const reply = createReply();
    await extractor(request, reply);
    expect(reply.sent).toBe(true);
    expect(reply.statusCode).toBe(401);
  });

  it('extracts principal from API key', async () => {
    const extractor = buildPrincipalExtractor({
      enabled: true,
      authStrategy: 'apiKey',
      apiKeys: { 'key-123': 'user:alice' }
    });
    const request = createRequest({ 'x-api-key': 'key-123' });
    const reply = createReply();
    await extractor(request, reply);
    expect(request.principal).toBe('user:alice');
  });

  it('returns 401 for unknown API key', async () => {
    const extractor = buildPrincipalExtractor({ enabled: true, authStrategy: 'apiKey', apiKeys: {} });
    const request = createRequest({ 'x-api-key': 'key-999' });
    const reply = createReply();
    await extractor(request, reply);
    expect(reply.statusCode).toBe(401);
  });
});
