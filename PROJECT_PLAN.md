# Cortex Project Plan v0.1.0

> **Approach**: Vibe Coding with AI Agents
> **Timeline**: 4-6 weeks (single focused developer) or 2-3 weeks (two agents)
> **Goal**: Working "Hello World" — photo ingestion → AI insight → semantic query

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

## Phase 2: Default Adapters (Days 7-12)
**Theme**: Build the "zero-setup" path. SQLite, filesystem, Ollama, in-memory queue.

### Milestone: `adapters-default`
**Definition of Done**: All default adapters pass contract tests. `npm test` passes.

| Task | Agent | Est. Time | Deliverables |
|------|-------|-----------|--------------|
| Implement `FilesystemBlobAdapter` | backend-agent | 3h | `src/adapters/blob/filesystem/` + tests |
| Implement `InMemoryQueueAdapter` | backend-agent | 2h | `src/adapters/queue/in-memory/` + tests |
| Implement `OllamaLlmAdapter` | backend-agent | 4h | `src/adapters/llm/ollama/` + tests |
| Implement `OllamaEmbedderAdapter` | backend-agent | 3h | `src/adapters/embedder/ollama/` + tests |
| Implement `SQLiteStoreAdapter` with migrations | backend-agent | 6h | `src/adapters/store/sqlite/` + migrations + tests |
| Add sqlite-vec integration | backend-agent | 3h | Vector search in SQLite adapter |
| Write adapter-specific docs | docs-agent | 4h | Per-adapter READMEs, config examples |
| Verify all adapters pass contract tests | qa-agent | 2h | Run contract suite, report gaps |
| **Review Gate** | architect | 1h | Verify no interface violations, dependency graph clean |

### Parallel Track: OpenAI-Compatible Adapter
| Task | Agent | Est. Time | Deliverables |
|------|-------|-----------|--------------|
| Implement `OpenAICompatibleLlmAdapter` (covers Kimi) | backend-agent | 3h | `src/adapters/llm/openai-compatible/` + tests |
| Implement `OpenAICompatibleEmbedderAdapter` | backend-agent | 2h | `src/adapters/embedder/openai/` + tests |

---

## Phase 3: Core Modules (Days 13-18)
**Theme**: The brains. Ingestion pipeline, query engine, memory service.

### Milestone: `core-functional`
**Definition of Done**: Can run ingestion and query end-to-end locally.

| Task | Agent | Est. Time | Deliverables |
|------|-------|-----------|--------------|
| Implement `IngestionService` (sync flow) | backend-agent | 6h | `src/core/modules/ingestion/ingestion-service.js` |
| Implement `QueryService` (RAG pipeline) | backend-agent | 6h | `src/core/modules/query/query-service.js` |
| Implement `MemoryService` (CRUD + lineage) | backend-agent | 4h | `src/core/modules/memory/memory-service.js` |
| Build Fastify server with routes | backend-agent | 4h | `src/server/app.js`, `routes/ingest.js`, `routes/query.js` |
| Add multipart upload handling | backend-agent | 2h | `src/server/parsers/multipart-parser.js` |
| Add request validation middleware | backend-agent | 2h | `src/server/middleware/request-validator.js` |
| Add error handling middleware | backend-agent | 2h | `src/server/middleware/error-handler.js` |
| Write OpenAPI spec | backend-agent + docs-agent | 3h | `src/server/openapi.yaml` |
| Write integration tests for full pipeline | qa-agent | 6h | `tests/integration/ingestion-pipeline.test.js`, `query-pipeline.test.js` |
| **Review Gate** | architect | 2h | Review request lifecycle, error handling, security |

### Key Design Decisions (Made During Phase 3)
- Chunking strategy for text extraction
- Prompt template for insight generation
- Vector search parameters (top-k, threshold)
- Response format for query endpoint

---

## Phase 4: Platform & Serverless (Days 19-21)
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

## Phase 5: E2E & Hello World (Days 22-24)
**Theme**: The demo. Make it real. Fix the last mile.

### Milestone: `hello-world`
**Definition of Done**: The bicycle photo scenario works via curl.

| Task | Agent | Est. Time | Deliverables |
|------|-------|-----------|--------------|
| Create test fixtures (bicycle.jpg, sample text) | qa-agent | 1h | `tests/fixtures/` |
| Write E2E test for photo → insight → query | qa-agent | 3h | `tests/e2e/hello-world.test.js` |
| Run E2E against all adapter combinations | qa-agent | 4h | SQLite+Ollama, Postgres+Ollama, SQLite+Kimi |
| Fix bugs found in E2E | backend-agent | 6h | Whatever breaks |
| Performance benchmark (baseline) | qa-agent | 2h | `tests/benchmark/ingest-latency.js` |
| Write quickstart guide | docs-agent | 3h | `docs/users/getting-started/quickstart.md` |
| Record demo script | docs-agent | 1h | `docs/users/getting-started/demo.md` |
| **Review Gate** | architect | 2h | Full system test, approve v0.1.0 |

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
curl -X POST http://localhost:3000/ingest   -F "file=@tests/fixtures/bicycle.jpg"   -F "async=false"   | jq '.id' | grep -q "mem_" && echo "✅ Ingestion passed"

# 4. Query
curl -X POST http://localhost:3000/query   -H "Content-Type: application/json"   -d '{"question": "What photos did I take with bicycles?"}'   | jq '.answer' | grep -q "bicycle" && echo "✅ Query passed"

echo "🎉 Hello World complete!"
```

---

## Phase 6: Polish & Release (Days 25-28)
**Theme**: Make it presentable. Docs complete. CI green. Ready for contributors.

### Milestone: `v0.1.0-released`
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
| Create GitHub release | devops-agent | 1h | Tag v0.1.0, release notes |
| Deploy docs site | devops-agent | 1h | GitHub Pages or Netlify |
| **Review Gate** | architect | 2h | Final approval |

---

## Agent Assignment Schedule

### Scenario A: Single Agent (backend-agent does everything, others as modes)
**Timeline**: 6 weeks
**Pattern**: Agent switches "hats" per task, follows role constraints

```
Week 1: Phase 0 (foundation) + Phase 1 (interfaces)
Week 2: Phase 2 (default adapters)
Week 3: Phase 3 (core modules)
Week 4: Phase 4 (platform) + Phase 5 (E2E)
Week 5: Phase 5 continued (bug fixes)
Week 6: Phase 6 (polish + release)
```

### Scenario B: Two Agents (backend + devops/docs)
**Timeline**: 3 weeks
**Pattern**: backend-agent owns src/, second agent owns ops/docs in parallel

```
Week 1:
  backend-agent: Phase 0 + Phase 1 + Phase 2
  devops-agent: Phase 0 (CI) + Phase 4 scaffolding

Week 2:
  backend-agent: Phase 3 + Phase 5 implementation
  docs-agent: Phase 2 docs + Phase 3 docs + developer guides

Week 3:
  backend-agent: Phase 5 (E2E fixes) + Phase 6
  qa-agent: Phase 5 testing + security audit
  devops-agent: Phase 4 completion + release automation
```

### Scenario C: Full Team (Claude Code + Kimi Code parallel)
**Timeline**: 2-2.5 weeks
**Pattern**: Multiple AI instances work on non-conflicting tasks

```
Day 1-2:  
  Instance A (backend): Repo + interfaces
  Instance B (devops): CI + Docker scaffold

Day 3-6:
  Instance A: SQLite + Ollama adapters
  Instance B: Filesystem blob + in-memory queue
  Instance C (docs): VitePress + structure

Day 7-12:
  Instance A: Core modules (ingestion, query)
  Instance B: Server + routes + middleware
  Instance C: Adapter docs + API docs

Day 13-18:
  Instance A: Platform implementations
  Instance B: E2E tests + fixtures
  Instance C: Hosting docs + quickstart

Day 19-21:
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
- [ ] Memory compression & summarization
- [ ] Graph relations (Neo4j)
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

---

## Communication Rhythms

| Meeting | Frequency | Participants | Purpose |
|---------|-----------|--------------|---------|
| **Standup** | Daily (async) | All agents | Blockers, progress, handoffs |
| **Interface Review** | After Phase 1, then as needed | architect + backend | Contract changes |
| **Demo** | After each milestone | All | Show working code |
| **Retrospective** | After v0.1.0 | All | What worked, what didn't, agent skill updates |

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
