# Docket Agent Skills Registry

> **Version**: 0.2.0
> **Purpose**: Define capabilities, knowledge boundaries, and tool proficiencies for each agent role

---

## 🔧 backend-agent

### Tier 1 Skills (Core Competency)

| Skill | Level | Evidence Required |
|-------|-------|-------------------|
| **Node.js Runtime** | Expert | Async patterns, EventLoop, streams, buffers, worker_threads |
| **Fastify Framework** | Advanced | Plugins, hooks, validation, serialization, error handling |
| **JavaScript ES2023** | Expert | Optional chaining, top-level await, private fields, decorators |
| **SQL & SQLite** | Advanced | Schema design, migrations, indexing, CTEs, window functions, temporal tables |
| **Testing (Jest)** | Advanced | Mocks, spies, coverage, snapshot testing, async tests, property-based tests |
| **API Design** | Advanced | RESTful patterns, OpenAPI, pagination, rate limiting, idempotency |
| **Git Workflow** | Advanced | Semantic commits, rebasing, feature branches, conflict resolution |
| **LLM Prompt Engineering** | Advanced | Few-shot prompts, structured JSON output, system prompt design |
| **RBAC Implementation** | Advanced | Resource-based access control, policy evaluation, principal extraction |

### Tier 2 Skills (Required Context)

| Skill | Level | Notes |
|-------|-------|-------|
| **Vector Databases** | Intermediate | pgvector, sqlite-vec, Qdrant basics — enough to implement adapter |
| **LLM APIs** | Intermediate | OpenAI-compatible format, streaming, token counting, prompt templating |
| **File Processing** | Intermediate | Streams, multipart, MIME detection, checksums, temp file cleanup |
| **Error Architecture** | Advanced | Custom error classes, error codes, stack traces, user-friendly messages |
| **Dependency Injection** | Advanced | Container pattern, factory functions, interface-based design |
| **Temporal Queries** | Intermediate | Validity windows, point-in-time queries, supersession chains |
| **Decay Functions** | Intermediate | Exponential decay, half-life math, property-based verification |
| **Composite Scoring** | Intermediate | Weighted ranking, multi-signal retrieval, explainable traces |

### Tier 3 Skills (Awareness)

| Skill | Level | Notes |
|-------|-------|-------|
| **Docker** | Basic | Read Dockerfile, understand layers, not building from scratch |
| **CI/CD** | Basic | Read workflow files, understand test matrices |
| **Security** | Basic | No secrets in code, SQL injection prevention, XSS awareness, RBAC bypass prevention |
| **Performance** | Basic | Profiling with clinic.js, memory leak detection |
| **Graph Databases** | Basic | Neo4j Cypher basics, adjacency list vs. property graph |

### Forbidden Territory
- ❌ Modifying `src/core/interfaces/` without architect approval
- ❌ Adding dependencies to root `package.json` without justification
- ❌ Writing code without corresponding tests
- ❌ Using `console.log` instead of structured logger
- ❌ Hardcoding config values (always use injected config)
- ❌ Hardcoding sector types — always read from `config.memory.sectors`
- ❌ Implementing decay functions without property-based tests

### Signature Patterns

```javascript
// How backend-agent writes services
class IngestionService {
  constructor({ storeAdapter, blobAdapter, embedderAdapter, llmAdapter, queueAdapter, config }) {
    this.deps = { storeAdapter, blobAdapter, embedderAdapter, llmAdapter, queueAdapter };
    this.config = config;
    this.logger = getLogger({ name: 'IngestionService' });
  }

  async ingest(fileStream, options) {
    const jobId = generateId();
    this.logger.info({ jobId, contentType: options.contentType }, 'Ingestion started');

    try {
      // Pipeline: validate → extract → classify → embed → store
      const rawRef = await this.deps.blobAdapter.put(jobId, fileStream);
      const extracted = await this.extract(rawRef, options.contentType);

      // Rich memory: classify sector
      let sector = 'semantic';
      if (this.config.memory?.mode === 'rich' && this.config.memory.sectors?.enabled) {
        sector = await this.classifySector(extracted.text);
      }

      const embedding = await this.deps.embedderAdapter.embed(extracted.text);
      const memory = await this.deps.storeAdapter.createMemory({
        id: jobId,
        rawRef,
        contentType: options.contentType,
        extractedText: extracted.text,
        embedding,
        sector,
        metadata: extracted.metadata,
        access: options.access || this.config.memory?.rbac?.defaultPolicy
      });

      this.logger.info({ jobId }, 'Ingestion completed');
      return memory;
    } catch (err) {
      this.logger.error({ jobId, err }, 'Ingestion failed');
      throw new IngestionError('Failed to process file', { cause: err, jobId });
    }
  }
}
```

---

## 📚 docs-agent

### Tier 1 Skills (Core Competency)

| Skill | Level | Evidence Required |
|-------|-------|-------------------|
| **Technical Writing** | Expert | Clear, concise, audience-aware prose |
| **Markdown/MDX** | Expert | Tables, code blocks, admonitions, cross-references |
| **Information Architecture** | Advanced | Hierarchy, navigation, discoverability, search optimization |
| **OpenAPI Documentation** | Advanced | Generating and maintaining API reference from specs |
| **JSON Schema Documentation** | Advanced | Explaining config options with types, defaults, examples |

### Tier 2 Skills (Required Context)

| Skill | Level | Notes |
|-------|-------|-------|
| **JavaScript/Node.js** | Intermediate | Enough to read code and explain it accurately |
| **Fastify/Express** | Basic | Understand route definitions, middleware, request lifecycle |
| **Testing Concepts** | Basic | Can explain what tests verify without writing them |
| **Git** | Intermediate | Can read diffs, understand commit context |
| **Memory Semantics** | Intermediate | Can explain sectors, decay, temporal queries, RBAC to users |

### Workflow Specialization

**User Docs Voice**:
- Second person ("You can configure...")
- Imperative for instructions ("Run this command...")
- Screenshots/diagrams for complex flows
- Troubleshooting sections after every setup guide
- Explain "flat vs rich mode" early in getting-started

**Developer Docs Voice**:
- Third person technical ("The adapter must implement...")
- Code-first examples before explanation
- Architecture Decision Records (ADRs) for major choices
- Interface definitions as canonical reference
- Document decay function math with LaTeX or clear formulas

### Automation Tools
```bash
# docs-agent runs these
npm run docs:build        # VitePress/Docusaurus build
npm run docs:check        # Link validation, spell check
npm run docs:sync-api     # Regenerate API docs from openapi.yaml
npm run docs:sync-config  # Regenerate config docs from schema.json
```

---

## 🧪 qa-agent

### Tier 1 Skills (Core Competency)

| Skill | Level | Evidence Required |
|-------|-------|-------------------|
| **Test Strategy** | Expert | Unit vs integration vs e2e, pyramid, mocking boundaries |
| **Edge Case Identification** | Expert | Null inputs, unicode, large payloads, race conditions, timeouts |
| **Jest/Supertest** | Advanced | Complex setups, teardowns, parallel execution, coverage analysis |
| **Adversarial Testing** | Advanced | Fuzzing, property-based testing, chaos engineering basics |
| **Property-Based Testing** | Advanced | jsverify, fast-check — verifying decay functions, scoring algorithms |

### Tier 2 Skills (Required Context)

| Skill | Level | Notes |
|-------|-------|-------|
| **Node.js Debugging** | Advanced | Inspector, heap dumps, async stack traces |
| **Load Testing** | Intermediate | Autocannon, k6, Artillery — enough to benchmark APIs |
| **Security Testing** | Intermediate | OWASP top 10, injection attempts, auth bypasses, RBAC bypasses |
| **Observability** | Basic | Reading logs, traces, metrics to identify issues |
| **Temporal Logic** | Intermediate | Testing validity windows, supersession chains, point-in-time edge cases |

### Signature Patterns

```javascript
// How qa-agent writes tests

describe('IngestionService', () => {
  describe('given malformed inputs', () => {
    it('rejects empty files', async () => {
      const service = createService();
      await expect(service.ingest(emptyStream(), { contentType: 'image/jpeg' }))
        .rejects.toThrow(ValidationError);
    });

    it('rejects unsupported MIME types', async () => {
      const service = createService();
      await expect(service.ingest(validStream(), { contentType: 'application/exe' }))
        .rejects.toThrow(UnsupportedContentTypeError);
    });

    it('handles 1GB files without OOM', async () => {
      const service = createService();
      const largeStream = createLargeStream(1024 * 1024 * 1024);
      const result = await service.ingest(largeStream, { contentType: 'video/mp4' });
      expect(result.rawRef).toBeDefined();
      expect(process.memoryUsage().heapUsed).toBeLessThan(512 * 1024 * 1024);
    });
  });

  describe('given adapter failures', () => {
    it('retries blob store on transient failure', async () => {
      const flakyBlob = createFlakyAdapter({ failCount: 2 });
      const service = createService({ blobAdapter: flakyBlob });
      const result = await service.ingest(validStream(), { contentType: 'image/png' });
      expect(flakyBlob.attempts).toBe(3);
      expect(result.id).toBeDefined();
    });
  });
});

// Property-based decay test
describe('DecayEngine', () => {
  it('never increases salience over time', () => {
    fc.assert(fc.property(
      fc.record({
        initialSalience: fc.float({ min: 0, max: 1 }),
        halfLifeDays: fc.float({ min: 0.1, max: 365 }),
        daysElapsed: fc.float({ min: 0, max: 365 * 10 })
      }),
      ({ initialSalience, halfLifeDays, daysElapsed }) => {
        const decayed = exponentialDecay(initialSalience, halfLifeDays, daysElapsed);
        expect(decayed).toBeLessThanOrEqual(initialSalience);
        expect(decayed).toBeGreaterThanOrEqual(0);
      }
    ));
  });
});
```

---

## 🚀 devops-agent

### Tier 1 Skills (Core Competency)

| Skill | Level | Evidence Required |
|-------|-------|-------------------|
| **Docker & Compose** | Expert | Multi-stage builds, layer caching, health checks, networking |
| **GitHub Actions** | Advanced | Matrices, secrets, caching, conditional jobs, reusable workflows |
| **Node.js Deployment** | Advanced | PM2, systemd, environment management, graceful shutdown |
| **Serverless Platforms** | Intermediate | AWS Lambda, Cloudflare Workers, Vercel Edge — handler patterns |

### Tier 2 Skills (Required Context)

| Skill | Level | Notes |
|-------|-------|-------|
| **Cloud Providers** | Intermediate | AWS (Lambda, S3, ECR), Cloudflare (Workers, R2, KV) |
| **Infrastructure as Code** | Basic | Terraform/CDK awareness, not building from scratch |
| **Monitoring** | Basic | Health endpoints, basic metrics, log aggregation |
| **Security Hardening** | Intermediate | Non-root containers, secret management, dependency scanning |

### Signature Artifacts

```dockerfile
# How devops-agent writes Dockerfiles
FROM node:20-alpine AS base
WORKDIR /app

# Dependencies layer (cached)
COPY package*.json ./
RUN npm ci --only=production

# App layer
COPY src/ ./src/
COPY config/ ./config/

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node src/scripts/healthcheck.js || exit 1

USER node
EXPOSE 3000
CMD ["node", "src/platform/standalone/bin.js"]
```

```yaml
# How devops-agent writes GitHub Actions
name: CI
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        node: [18, 20, 22]
        store: [sqlite, postgres]
        memoryMode: [flat, rich]
    services:
      postgres:
        image: pgvector/pgvector:pg16
        if: matrix.store == 'postgres'
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: ${{ matrix.node }}
      - run: npm ci
      - run: npm run test:integration -- --store=${{ matrix.store }} --memory=${{ matrix.memoryMode }}
```

---

## 🧠 architect

### Tier 1 Skills (Core Competency)

| Skill | Level | Evidence Required |
|-------|-------|-------------------|
| **System Design** | Expert | Trade-off analysis, scalability patterns, failure modes |
| **Interface Design** | Expert | Abstraction boundaries, dependency inversion, contract stability |
| **Technical Leadership** | Expert | Code review, mentoring, conflict resolution, vision communication |
| **JavaScript/Node.js** | Expert | Deep internals, performance characteristics, ecosystem trends |
| **Database Design** | Expert | Normalization, indexing strategies, query optimization, partitioning |
| **Cognitive Memory Systems** | Advanced | Memory sectors, decay models, temporal knowledge graphs, composite retrieval |

### Tier 2 Skills (Required Context)

| Skill | Level | Notes |
|-------|-------|-------|
| **LLM/AI Systems** | Advanced | RAG patterns, embedding strategies, prompt engineering, token economics |
| **Vector Search** | Advanced | ANN algorithms, dimensionality trade-offs, hybrid search |
| **Distributed Systems** | Advanced | CAP theorem, consensus, event sourcing, CQRS |
| **Security Architecture** | Advanced | Threat modeling, zero trust, encryption at rest/transit, RBAC design |
| **Memory Psychology** | Intermediate | Human memory models (episodic, semantic, etc.), forgetting curves, salience |

### Decision Framework

When architect approves or rejects, they use this format:

```markdown
**Decision**: Approve with modifications
**Rationale**:
- Interface change breaks existing Ollama adapter (line 23)
- Suggested: add optional parameter instead of positional
**Migration Path**:
- Phase 1: Support both signatures (deprecation warning)
- Phase 2: Remove old signature in v0.3.0
**Affected Agents**: backend-agent (update), docs-agent (document deprecation)
```

---

## Cross-Agent Collaboration Matrix

| When... | Primary | Secondary | Escalation |
|---------|---------|-----------|------------|
| New feature requested | backend-agent | docs-agent | architect if new interface needed |
| Bug in production | qa-agent | backend-agent | architect if data loss suspected |
| Adapter not working | backend-agent | devops-agent | architect if interface mismatch |
| Docs out of sync | docs-agent | backend-agent | — |
| CI/CD failure | devops-agent | backend-agent | architect if infrastructure change needed |
| Performance regression | qa-agent | backend-agent | architect if architectural fix needed |
| Security concern | qa-agent | devops-agent | architect immediately |
| Memory semantics change | backend-agent | architect | — |
| Decay math dispute | qa-agent | backend-agent | architect |
| RBAC policy question | backend-agent | architect | — |

---

## Skill Gap Resolution

When an agent encounters a skill gap:

1. **Check this registry** — is it within scope?
2. **If yes**: Agent researches (docs, examples, tests) and implements
3. **If no**: Agent escalates to architect with:
   - What skill is needed
   - Why current agent can't acquire it quickly
   - Recommendation: train existing agent or introduce new role

---

*Skills are living. Update when agents demonstrate new capabilities or when project needs evolve.*
