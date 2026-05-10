# Cortex Project Plan v0.2.0

> **Approach**: Vibe Coding with AI Agents
> **Timeline**: 6-8 weeks (single focused developer) or 3-4 weeks (two agents)
> **Goal**: Working "Hello World" — photo ingestion → AI insight → semantic query
> **Philosophy**: Rich cognitive memory semantics on a pluggable adapter kernel. Inspired by OpenMemory's ontology, but built as configurable core infrastructure.

---

## Phase 0: Foundation (Days 1-3) ✅ COMPLETE
**Theme**: Scaffold the repo. Establish rules. Make the first commit.

### Milestone: `repo-bootstrapped`
**Definition of Done**: `git clone && npm install && npm test` passes with 0 tests (empty suite).

**Completed by**: `backend-agent` on 2026-05-09
**Status**: ✅ Done — `npm run lint` passes (0 errors), `src/server/app.js` + `/health` route + tests created.

| Task | Agent | Est. Time | Deliverables |
|------|-------|-----------|--------------|
| Initialize monorepo structure | backend-agent | 2h | `package.json`, workspace config, `.gitignore` |
| Set up ESLint + Prettier with dependency rules | backend-agent | 1h | `.eslintrc.js` (enforces: no core→adapter imports) |
| Create folder skeleton | backend-agent | 30m | All `src/`, `tests/`, `docs/`, `config/`, `docker/` folders |
| Write root README with vision | docs-agent | 1h | `README.md` — what, why, who it's for |
| Set up VitePress docs scaffold | devops-agent | 1h | `docs/package.json`, config, homepage |
| Create GitHub Actions CI skeleton | devops-agent | 1h | `.github/workflows/ci.yml` — lint, test placeholders |
| **Review Gate** | architect | 30m | Approve structure before any code |

### Key Decisions (Locked After Phase 0)
- ✅ Node.js 20+, JavaScript (not TypeScript)
- ✅ npm workspaces (not Lerna — simpler)
- ✅ Fastify over Express
- ✅ Zod for validation
- ✅ Pino for logging

---

## Phase 1: Core Contracts (Days 4-6) ✅ COMPLETE
**Theme**: Define the black boxes. No implementations yet — just interfaces and tests.

### Milestone: `interfaces-stable`
**Definition of Done**: All adapter interfaces defined with JSDoc + interface tests that fail (red phase of TDD).

**Completed by**: `backend-agent` on 2026-05-09
**Status**: ✅ Done — all 5 interfaces frozen, error hierarchy + models + config loader complete, contract tests in red-phase TDD (19 failing, 12 passing).

| Task | Agent | Est. Time | Deliverables |
|------|-------|-----------|--------------|
| Define `LlmAdapter` interface | architect | 2h | `src/core/interfaces/llm-adapter.js` + JSDoc |
| Define `StoreAdapter` interface | architect | 2h | `src/core/interfaces/store-adapter.js` + JSDoc |
| Define `BlobAdapter` interface | architect | 1h | `src/core/interfaces/blob-adapter.js` + JSDoc |
| Define `EmbedderAdapter` interface | architect | 1h | `src/core/interfaces/embedder-adapter.js` + JSDoc |
| Define `QueueAdapter` interface | architect | 1h | `src/core/interfaces/queue-adapter.js` + JSDoc |
| Define core models (Memory, Job, Config) | architect | 2h | `src/core/models/*.js` + Zod schemas |
| Define error hierarchy | architect | 1h | `src/core/errors/*.js` — base, adapter, validation, not-found |
| Write interface contract tests (all failing) | qa-agent | 3h | `tests/integration/adapter-contracts/*-contract.test.js` |
| Write config schema + loader | backend-agent | 2h | `src/core/config/schema.js`, `loader.js`, `defaults.js` |
| **Review Gate** | architect | 1h | All interfaces approved, no changes without PR |

### Interface Freeze Protocol
After this phase:
- `src/core/interfaces/` is **frozen**
- Any change requires: GitHub issue → discussion → architect approval → version bump
- Adapters in progress must target frozen interfaces

---

## Phase 2: Default Adapters (Days 7-14)
**Theme**: Build the "zero-setup" path. SQLite, filesystem, Ollama, in-memory queue. Prepare storage schema for rich memory semantics.

### Milestone: `adapters-default`
**Definition of Done**: All default adapters pass contract tests. `npm test` passes. SQLite schema supports sectors, relations, temporal fields, and RBAC.

| Task | Agent | Est. Time | Deliverables |
|------|-------|-----------|--------------|
| Implement `FilesystemBlobAdapter` | backend-agent | 3h | `src/adapters/blob/filesystem/` + tests |
| Implement `InMemoryQueueAdapter` | backend-agent | 2h | `src/adapters/queue/in-memory/` + tests |
| Implement `OllamaLlmAdapter` | backend-agent | 4h | `src/adapters/llm/ollama/` + tests |
| Implement `OllamaEmbedderAdapter` | backend-agent | 3h | `src/adapters/embedder/ollama/` + tests |
| Implement `SQLiteStoreAdapter` with migrations | backend-agent | 6h | `src/adapters/store/sqlite/` + migrations + tests |
| Add sqlite-vec integration | backend-agent | 3h | Vector search in SQLite adapter |
| **Extend SQLite schema for memory semantics** | backend-agent | 4h | Add `sector`, `salience`, `valid_from`, `valid_to`, `access_policy` columns; relations table with `confidence` |
| Write adapter-specific docs | docs-agent | 4h | Per-adapter READMEs, config examples |
| Verify all adapters pass contract tests | qa-agent | 2h | Run contract suite, report gaps |
| **Review Gate** | architect | 1h | Verify no interface violations, dependency graph clean |

### Parallel Track: OpenAI-Compatible Adapter
| Task | Agent | Est. Time | Deliverables |
|------|-------|-----------|--------------|
| Implement `OpenAICompatibleLlmAdapter` (covers Kimi) | backend-agent | 3h | `src/adapters/llm/openai-compatible/` + tests |
| Implement `OpenAICompatibleEmbedderAdapter` | backend-agent | 2h | `src/adapters/embedder/openai/` + tests |

---

## Phase 2.5: Control / Data Plane Separation (Day 14)
**Theme**: Architectural hygiene. Separate operational control from data processing before building core services.

### Milestone: `planes-separated`
**Definition of Done**: Unified mode works (`npm start`). Split mode works (`npm run start:control` + `npm run start:data`). Docs explain the boundary.

| Task | Agent | Est. Time | Deliverables |
|------|-------|-----------|--------------|
| Scaffold `src/data-plane/app.js` | backend-agent | 1h | Fastify app with data routes (health, ingest, query, memories) |
| Scaffold `src/control-plane/app.js` | backend-agent | 1h | Fastify app with admin routes (config, plugins, RBAC, metrics) |
| Create `src/platform/unified/` | backend-agent | 1h | Mounts both planes in one process for local dev |
| Create `src/platform/control/` and `src/platform/data/` | backend-agent | 30m | Separate entry points and bin scripts |
| Update `package.json` scripts | backend-agent | 15m | `start`, `start:control`, `start:data` |
| Write architecture doc | docs-agent | 1h | `docs/developers/architecture/control-data-plane.mdx` |
| **Review Gate** | architect | 30m | Verify route boundaries are clean |

### Design Decisions
- **Unified mode** (default): Single process on port 3000, control routes under `/admin/`
- **Split mode**: Data plane on port 3000, control plane on port 3001, shared store + queue
- **Adapter registry**: Owned by control plane; data plane receives read-only snapshot
- **Backward compat**: `src/server/app.js` re-exports `src/data-plane/app.js`

---

## Phase 3: Core Modules (Days 15-26)
**Theme**: The brains. Rich cognitive memory — sector classification, composite recall, temporal graph, decay, RBAC.

### Milestone: `core-functional`
**Definition of Done**: Can run ingestion and query end-to-end locally. Memory semantics are configurable and optional (can run flat mode or rich mode).

| Task | Agent | Est. Time | Deliverables |
|------|-------|-----------|--------------|
| **Memory Model Extension** | backend-agent | 4h | Update `MemorySchema` with `sector`, `salience`, `access`, `validFrom`, `validTo`, `supersedesId` |
| **SectorClassifier service** | backend-agent | 6h | `src/core/modules/classifier/sector-classifier.js` — LLM-based classification into 5 sectors (episodic, semantic, procedural, emotional, reflective). Configurable: on/off, custom sectors, custom prompt |
| **AccessControlledStore wrapper** | backend-agent | 6h | `src/core/modules/security/access-controlled-store.js` — RBAC filter layer over any `StoreAdapter`. Supports owner/readers/writers/policy-based access |
| **RecallEngine** | backend-agent | 8h | `src/core/modules/query/recall-engine.js` — composite scoring: vector similarity + graph traversal + salience + recency + temporal relevance. Produces ranked results with waypoint traces |
| **TemporalQuery service** | backend-agent | 4h | `src/core/modules/query/temporal-query.js` — point-in-time queries (`what was true on X?`), validity windows, supersession chains |
| **DecayEngine + DecayJob** | backend-agent | 4h | `src/core/modules/memory/decay-engine.js` + queue job type `memory-decay`. Per-sector decay functions (configurable: exponential, linear, none) |
| **IngestionService** (rich pipeline) | backend-agent | 6h | `src/core/modules/ingestion/ingestion-service.js` — pipeline: validate → classify sector → extract → embed → store with access policy |
| **QueryService** (RAG pipeline) | backend-agent | 6h | `src/core/modules/query/query-service.js` — RAG with RecallEngine, optional sector filters, temporal constraints, RBAC-aware |
| **MemoryService** (CRUD + lineage) | backend-agent | 4h | `src/core/modules/memory/memory-service.js` — CRUD + graph relations + supersession + access policy updates |
| Build Fastify server with routes | backend-agent | 4h | `src/server/app.js`, `routes/ingest.js`, `routes/query.js`, `routes/memory.js` |
| Add multipart upload handling | backend-agent | 2h | `src/server/parsers/multipart-parser.js` |
| Add request validation middleware | backend-agent | 2h | `src/server/middleware/request-validator.js` |
| Add RBAC middleware | backend-agent | 3h | `src/server/middleware/rbac-middleware.js` — extract principal from auth (JWT/API key), enforce on memory routes |
| Add error handling middleware | backend-agent | 2h | `src/server/middleware/error-handler.js` |
| Write OpenAPI spec | backend-agent + docs-agent | 3h | `src/server/openapi.yaml` |
| Write integration tests for full pipeline | qa-agent | 6h | `tests/integration/ingestion-pipeline.test.js`, `query-pipeline.test.js`, `rbac.test.js`, `temporal-query.test.js` |
| **Review Gate** | architect | 2h | Review request lifecycle, error handling, security, memory semantics correctness |

### Key Design Decisions (Made During Phase 3)
- **Memory semantics mode**: `flat` (default, v0.1.0 behavior) vs `rich` (sectorized, temporal, decay). Configurable per-instance.
- **Chunking strategy for text extraction**: Sentence-aware sliding window, 512 tokens overlap 64
- **Sector classification**: LLM few-shot prompt, overridable via config. Can be disabled for performance.
- **Prompt template for insight generation**: System prompt + user memory context → structured JSON output
- **Vector search parameters**: top-k=50 initial, RecallEngine prunes to top-10
- **RBAC model**: Resource-based (memory owns access policy) not role-based. Supports `owner`, `readers[]`, `writers[]`, or named `policy` reference.
- **Decay functions**: Configurable per sector. Default: `semantic` = none, `episodic` = exponential half-life 30 days, `emotional` = exponential half-life 7 days.
- **Response format for query endpoint**: `{ answer, sources[], trace[] }` where trace explains recall steps

---

## Phase 4: Platform & Serverless (Days 27-30)
**Theme**: Make it hostable everywhere. Standalone + serverless wrappers.

### Milestone: `platform-ready`
**Definition of Done**: `docker-compose up` works. Serverless handlers compile.

| Task | Agent | Est. Time | Deliverables |
|------|-------|-----------|--------------|
| Implement standalone platform | backend-agent | 3h | `src/platform/standalone/index.js`, `bin.js` |
| Create Dockerfile.standalone | devops-agent | 2h | `docker/Dockerfile.standalone` |
| Create docker-compose.yml (Ollama + Cortex) | devops-agent | 1h | `docker/docker-compose.yml` |
| Implement AWS Lambda handler | devops-agent | 3h | `src/platform/serverless/aws-lambda/handler.js` |
| Implement Cloudflare Workers handler | devops-agent | 3h | `src/platform/serverless/cloudflare-workers/handler.js` |
| Add cold-start optimization for serverless | devops-agent | 2h | Adapter caching, connection pooling |
| Write hosting docs | docs-agent | 4h | `docs/users/hosting/*.md` |
| Test serverless builds | qa-agent | 2h | Verify handlers don't crash on init |
| **Review Gate** | architect | 1h | Verify platform separation doesn't leak into core |

---

## Phase 5: E2E & Hello World (Days 31-35)
**Theme**: The demo. Make it real. Fix the last mile.

### Milestone: `hello-world`
**Definition of Done**: The bicycle photo scenario works via curl. Rich memory scenario (sector classification + temporal query + RBAC) works.

| Task | Agent | Est. Time | Deliverables |
|------|-------|-----------|--------------|
| Create test fixtures (bicycle.jpg, sample text) | qa-agent | 1h | `tests/fixtures/` |
| Write E2E test for photo → insight → query | qa-agent | 3h | `tests/e2e/hello-world.test.js` |
| Write E2E test for rich memory scenario | qa-agent | 3h | `tests/e2e/rich-memory.test.js` — sector classification, temporal query, decay, RBAC |
| Run E2E against all adapter combinations | qa-agent | 4h | SQLite+Ollama, Postgres+Ollama, SQLite+Kimi |
| Fix bugs found in E2E | backend-agent | 6h | Whatever breaks |
| Performance benchmark (baseline) | qa-agent | 2h | `tests/benchmark/ingest-latency.js`, `tests/benchmark/recall-latency.js` |
| Write quickstart guide | docs-agent | 3h | `docs/users/getting-started/quickstart.md` |
| Record demo script | docs-agent | 1h | `docs/users/getting-started/demo.md` |
| **Review Gate** | architect | 2h | Full system test, approve v0.2.0 |

### Hello World Verification Script
```bash
#!/bin/bash
# scripts/verify-hello-world.sh

set -e

echo "🧠 Cortex Hello World Verification"

# 1. Start services
docker-compose -f docker/docker-compose.yml up -d

# 2. Wait for health
curl -sf http://localhost:3000/health || (echo "❌ Health check failed"; exit 1)

# 3. Ingest photo
curl -X POST http://localhost:3000/ingest \
  -F "file=@tests/fixtures/bicycle.jpg" \
  -F "async=false" \
  | jq '.id' | grep -q "mem_" && echo "✅ Ingestion passed"

# 4. Query
curl -X POST http://localhost:3000/query \
  -H "Content-Type: application/json" \
  -d '{"question": "What photos did I take with bicycles?"}' \
  | jq '.answer' | grep -q "bicycle" && echo "✅ Query passed"

echo "🎉 Hello World complete!"
```

### Rich Memory Verification Script
```bash
#!/bin/bash
# scripts/verify-rich-memory.sh

set -e

echo "🧠 Cortex Rich Memory Verification"

# 1. Ingest with sector hint
curl -X POST http://localhost:3000/ingest \
  -F "file=@tests/fixtures/bicycle.jpg" \
  -F "async=false" \
  -H "X-Principal: user:alice" \
  | jq '.sector' | grep -q "episodic" && echo "✅ Sector classification passed"

# 2. Temporal query
curl -X POST http://localhost:3000/query \
  -H "Content-Type: application/json" \
  -H "X-Principal: user:alice" \
  -d '{"question": "What did I photograph last week?", "temporal": {"atDate": "2026-05-02"}}' \
  | jq '.sources | length' | grep -q "[1-9]" && echo "✅ Temporal query passed"

# 3. RBAC denial
curl -X POST http://localhost:3000/query \
  -H "Content-Type: application/json" \
  -H "X-Principal: user:bob" \
  -d '{"question": "What did Alice photograph?"}' \
  | jq '.sources | length' | grep -q "0" && echo "✅ RBAC denial passed"

echo "🎉 Rich Memory complete!"
```

---

## Phase 6: Polish & Release (Days 36-40)
**Theme**: Make it presentable. Docs complete. CI green. Ready for contributors.

### Milestone: `v0.2.0-released`
**Definition of Done**: GitHub release tagged. Docs site live. First contributor can onboard in 10 minutes.

| Task | Agent | Est. Time | Deliverables |
|------|-------|-----------|--------------|
| Complete user docs | docs-agent | 6h | All `docs/users/` sections |
| Complete developer docs | docs-agent | 6h | All `docs/developers/` sections |
| Add CONTRIBUTING.md | docs-agent | 2h | PR template, issue templates, code of conduct |
| Add CHANGELOG.md (empty, with format) | docs-agent | 30m | Keep a Changelog format |
| Add LICENSE (MIT) | architect | 15m | `LICENSE` file |
| Final CI/CD polish | devops-agent | 3h | Test matrices, release automation, npm publish |
| Security audit (basic) | qa-agent | 2h | Dependency check, secret scan, input validation review |
| Create GitHub release | devops-agent | 1h | Tag v0.2.0, release notes |
| Deploy docs site | devops-agent | 1h | GitHub Pages or Netlify |
| **Review Gate** | architect | 2h | Final approval |

---

## Post-v0.2.0 Backlog

### Connectors (Source Ingestion)
- [ ] GitHub connector — ingest repos, issues, PRs
- [ ] Notion connector — ingest pages, databases
- [ ] Google Drive connector — ingest docs, sheets, slides
- [ ] Web clipper — ingest URLs with content extraction
- [ ] Email connector — IMAP ingestion
- [ ] RSS/Atom feed connector

### Retrieval & Query
- [ ] MCP server — native Model Context Protocol for Claude, Cursor, Windsurf
- [ ] VS Code extension — inline memory query and capture
- [ ] CLI (`cortex`) — direct engine interaction, scripting
- [ ] Streaming query responses
- [ ] Multi-hop graph reasoning

### Storage & Adapters
- [ ] Postgres store adapter with pgvector
- [ ] Qdrant vector store adapter
- [ ] S3-compatible blob adapter (R2, MinIO)
- [ ] Redis queue adapter
- [ ] Neo4j graph adapter (optional replacement for relational graph)

### Memory Semantics (Advanced)
- [ ] Reflection engine — auto-generate insights from memory clusters
- [ ] Consolidation — merge similar memories, reduce redundancy
- [ ] Dream/sleep mode — background re-indexing and relation discovery
- [ ] Emotional sentiment tracking over time
- [ ] Cross-user shared memories (with consent and RBAC)

### Plugin Ecosystem
- [x] Adapter registry supports npm packages
- [x] Plugin manifest validation
- [x] Control plane plugin onboarding endpoints
- [ ] CLI plugin installer (`cortex plugin install groq`)
- [ ] Auto-discovery of `cortex-*` packages in node_modules
- [ ] Verified adapter badge + extended contract test suite
- [ ] Plugin marketplace / directory

### Platform
- [ ] Kubernetes Helm chart
- [ ] Vercel Edge adapter
- [ ] Multi-tenancy (namespace isolation)

---

## Agent Assignment Schedule

### Scenario A: Single Agent (backend-agent does everything, others as modes)
**Timeline**: 8 weeks
**Pattern**: Agent switches "hats" per task, follows role constraints

```
Week 1: Phase 0 (foundation) + Phase 1 (interfaces)
Week 2: Phase 2 (default adapters)
Week 3: Phase 2 continued (schema extensions)
Week 4: Phase 3 (core modules — classifier, RBAC, recall)
Week 5: Phase 3 continued (temporal, decay, ingestion, query)
Week 6: Phase 4 (platform) + Phase 5 (E2E)
Week 7: Phase 5 continued (bug fixes, benchmarks)
Week 8: Phase 6 (polish + release)
```

### Scenario B: Two Agents (backend + devops/docs)
**Timeline**: 4 weeks
**Pattern**: backend-agent owns src/, second agent owns ops/docs in parallel

```
Week 1:
  backend-agent: Phase 0 + Phase 1 + Phase 2
  devops-agent: Phase 0 (CI) + Phase 4 scaffolding

Week 2:
  backend-agent: Phase 3 (classifier, RBAC, recall engine)
  docs-agent: Phase 2 docs + Phase 3 architecture docs

Week 3:
  backend-agent: Phase 3 (temporal, decay, ingestion, query) + Phase 5 implementation
  docs-agent: Phase 3 user docs + developer guides
  qa-agent: Phase 3 integration tests

Week 4:
  backend-agent: Phase 5 (E2E fixes) + Phase 6
  qa-agent: Phase 5 testing + security audit
  devops-agent: Phase 4 completion + release automation
```

### Scenario C: Full Team (Claude Code + Kimi Code parallel)
**Timeline**: 2.5-3 weeks
**Pattern**: Multiple AI instances work on non-conflicting tasks

```
Day 1-2:
  Instance A (backend): Repo + interfaces
  Instance B (devops): CI + Docker scaffold

Day 3-8:
  Instance A: SQLite + Ollama adapters + schema extensions
  Instance B: Filesystem blob + in-memory queue
  Instance C (docs): VitePress + structure

Day 9-16:
  Instance A: Core modules (classifier, recall, RBAC, temporal)
  Instance B: Server + routes + middleware
  Instance C: Adapter docs + API docs

Day 17-21:
  Instance A: Decay + ingestion + query services
  Instance B: E2E tests + fixtures
  Instance C: Hosting docs + quickstart

Day 22-24:
  All instances: Bug fixes, integration, release
```

---

## Task Board Template (GitHub Projects)

```markdown
## Backlog
- [ ] Implement Postgres store adapter
- [ ] Implement S3-compatible blob adapter
- [ ] Add Redis queue adapter
- [ ] Add audio extraction (Whisper)
- [ ] Add PDF extraction
- [ ] Add web clip ingestion
- [ ] MCP server for Claude/Cursor integration
- [ ] VS Code extension
- [ ] CLI (`cortex`)
- [ ] Multi-tenancy support

## In Progress
- [ ] Task ID: Description (Agent: @backend-agent)

## Review
- [ ] Task ID: Description (Awaiting: @architect)

## Done
- [ ] Task ID: Description (Merged: SHA)
```

---

## Risk Register

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| sqlite-vec immaturity | Medium | High | Have pgvector fallback ready; test early |
| Ollama local setup friction | High | Medium | Provide Docker Compose; document troubleshooting |
| Interface changes during implementation | Low | High | Freeze after Phase 1; strict architect gate |
| Agent context window overflow | Medium | Medium | Chunk tasks; use file references not full content |
| Test flakiness (async timing) | Medium | Medium | Retry logic in tests; deterministic fixtures |
| Scope creep ("let's add...") | High | High | Strict milestone gates; backlog non-essential features |
| **LLM classification latency** | Medium | High | Make sector classification optional + async; cache classifiers |
| **RBAC performance on large datasets** | Medium | High | Filter at query level, not in-memory; index access_policy columns |
| **Temporal query complexity** | Medium | Medium | Start with simple validity windows; defer point-in-time graph traversal |
| **Decay math correctness** | Low | High | Property-based tests for decay functions; compare against reference implementations |

---

## Communication Rhythms

| Meeting | Frequency | Participants | Purpose |
|---------|-----------|--------------|---------|
| **Standup** | Daily (async) | All agents | Blockers, progress, handoffs |
| **Interface Review** | After Phase 1, then as needed | architect + backend | Contract changes |
| **Demo** | After each milestone | All | Show working code |
| **Retrospective** | After v0.2.0 | All | What worked, what didn't, agent skill updates |

---

## Definition of Ready (for any task)

Before an agent starts work:
- [ ] Interface contract exists (if adapter-related)
- [ ] Acceptance criteria are specific and testable
- [ ] No dependencies on unmerged work (or dependencies documented)
- [ ] Timebox defined with escalation trigger
- [ ] Docs impact assessed

## Definition of Done (for any task)

Before marking complete:
- [ ] Code implemented per interface/contract
- [ ] Tests written and passing (unit + integration)
- [ ] No ESLint errors (dependency rules enforced)
- [ ] Docs updated (user-facing changes)
- [ ] Handoff note written for next agent
- [ ] Committed with semantic message

---

*This plan is living. Update when timelines shift, agents join/leave, or scope changes.*
