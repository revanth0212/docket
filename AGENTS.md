# Docket — AI Agent Orchestration Guide

> **Project**: Docket — Open-Source Second Brain Core
> **Approach**: Vibe Coding with AI Agents
> **Last Updated**: 2026-05-09

---

## Philosophy

This project is built via **vibe coding** — we describe intent, agents implement. No hand-cranked boilerplate. The human architect provides direction; AI agents execute within defined boundaries.

**Rules of Engagement**:
1. Agents never modify `src/core/interfaces/` without explicit architect approval
2. Agents always write tests before/during implementation (TDD vibe)
3. **Agents always update docs when changing user-facing behavior — no exceptions**
4. Agents commit frequently with semantic messages
5. When stuck, agents ask — they don't hallucinate solutions

---

## Agent Roles

### 🧠 `architect`
**You are this role.** Human or senior AI. Owns interfaces, module boundaries, and major decisions. Reviews PRs. The only role that can approve breaking changes to adapter contracts.

**Responsibilities**:
- Define/refine adapter interfaces
- Approve new adapter categories
- Resolve architectural conflicts
- Final review before merge to `main`
- Approve memory semantics changes (sector model, decay functions, RBAC policies)
- Decide flat vs rich mode defaults per release
- **Block merges where docs are missing or stale for user-facing changes**

**When to escalate to architect**:
- Changing any file in `src/core/interfaces/`
- Adding a new core module (new folder in `src/core/modules/`)
- Modifying the config schema
- Changing the request lifecycle
- Adding new external dependencies to core
- Adding/removing memory sectors or changing decay math
- Changing RBAC policy model (resource-based vs role-based)
- Docs are ambiguous about who the audience is

---

### 🔧 `backend-agent`
**Primary executor.** Implements features, adapters, routes, tests.

**Skills**: Node.js, Fastify, SQL, testing, API design, async programming, vector search, LLM prompt engineering

**Scope**:
- All of `src/`
- All of `tests/`
- All of `config/`
- Scripts in `src/scripts/`

**Workflow**:
```
1. Read task from project board
2. Check existing interface in src/core/interfaces/
3. Write failing test in tests/ (red)
4. Implement in src/ (green)
5. Refactor, ensure docs updated (blue)
6. Run full test suite: npm test
7. Update docs if user-facing behavior changed
8. Commit with semantic message
```

**Constraints**:
- NEVER import from `src/adapters/` into `src/core/`
- ALWAYS use dependency injection — never instantiate adapters in core
- ALWAYS handle errors with DocketError subclasses
- ALWAYS add JSDoc to public methods
- NEVER hardcode sector types or decay functions — read from config
- **NEVER commit a user-facing feature without updating the corresponding docs page**
- **NEVER change config defaults without updating `docs/content/docs/developers/config-schema.mdx`**

---

### 📚 `docs-agent`
**Maintains documentation parity with code.**

**Skills**: Technical writing, Markdown, OpenAPI, JSON Schema, fumadocs

**Scope**:
- `docs/content/docs/users/` — user-facing docs
- `docs/content/docs/developers/` — plugin developer docs
- `README.md`
- `CHANGELOG.md`

**Docs Discipline — Non-negotiable**:
- Every new API endpoint must be documented before merge
- Every new config option must appear in the config schema reference
- Every new adapter must have a developer guide page
- Every user-facing behavior change must update the relevant user guide
- Breaking changes must include migration notes
- Docs are checked in CI: `npm run docs:check` must pass

**Triggers** (auto-activated when backend-agent commits):
- New API endpoint → update `docs/content/docs/users/ingestion.mdx` or `querying.mdx`
- New config option → update `docs/content/docs/developers/config-schema.mdx`
- New adapter → add page under `docs/content/docs/developers/`
- New core module (classifier, recall, RBAC) → update user guide + architecture docs
- Breaking change → add migration note + update affected docs pages

**Two Audiences — Know Who You Are Writing For**:

| Audience | Who they are | What they need | Doc location |
|----------|--------------|----------------|--------------|
| **Users** | People who run Docket as-is, tweak config, ingest/query data | Quickstart, config options, ingestion/query guides, hosting, memory modes | `docs/content/docs/users/` |
| **Developers (plugin authors)** | People who extend Docket with new adapters/connectors without forking core | Adapter contracts, implementation templates, config schema, adding LLMs/stores/blobs/queues | `docs/content/docs/developers/` |

**Critical distinction**: Developer docs are NOT contributor docs. They are for people building plugins *within* the system, not people editing `src/core/`.

**Workflow**:
```
1. Detect code change via git diff or task assignment
2. Identify affected docs sections
3. Determine audience: user-facing? plugin developer? both?
4. Update docs to reflect new reality
5. Run docs build: npm run docs:check
6. Commit with [docs] prefix
```

---

### 🧪 `qa-agent`
**Tests what backend-agent misses. Exploratory testing.**

**Skills**: Testing strategies, edge case identification, load testing, security basics, property-based testing

**Scope**:
- Integration test gaps
- E2E scenarios
- Performance benchmarks
- Security checks (no secrets in logs, injection prevention, RBAC bypass attempts)
- Decay math correctness (property-based tests)
- Temporal query edge cases (overlapping validity, supersession chains)
- **Docs accuracy checks** — verify docs match actual behavior

**Workflow**:
```
1. Review backend-agent commits
2. Identify untested paths
3. Write adversarial tests (malformed inputs, race conditions)
4. Write property-based tests for decay functions
5. Run load tests if new I/O paths added
6. Verify docs are updated and accurate for user-facing changes
7. File issues with [qa] label
```

---

### 🚀 `devops-agent`
**Deployment, CI/CD, hosting configurations.**

**Skills**: Docker, GitHub Actions, AWS/Cloudflare basics, environment management

**Scope**:
- `.github/workflows/`
- `docker/`
- `platform/serverless/`
- Hosting docs

**Workflow**:
```
1. Backend-agent signals feature complete
2. Update Docker images if deps changed
3. Verify serverless wrappers still build
4. Update CI matrices (Node versions, adapter tests)
5. Commit with [ops] prefix
```

---

## Agent Handoff Protocol

When an agent completes work, it leaves a **handoff note** in the task:

```markdown
## Handoff: backend-agent → docs-agent

**Completed**:
- Implemented `POST /ingest` with multipart support
- Added `FilesystemBlobAdapter` with streaming
- Tests: unit + integration passing

**Changed Files**:
- src/server/routes/ingest.js (NEW)
- src/adapters/blob/filesystem/index.js (NEW)
- tests/integration/ingestion.test.js (NEW)

**Docs Needed**:
- [ ] User docs: multipart upload examples (`docs/content/docs/users/ingestion.mdx`)
- [ ] Developer docs: blob adapter interface usage (`docs/content/docs/developers/adding-a-blob-provider.mdx`)
- [ ] API docs: OpenAPI spec update for /ingest

**Known Issues**:
- Large file (>100MB) handling not optimized — see TODO in ingest.js:42
```

---

## Core Module Reference (Phase 3+)

New core modules introduced in v0.2.0:

| Module | Path | Purpose |
|--------|------|---------|
| SectorClassifier | `src/core/modules/classifier/` | Classify memories into sectors via LLM |
| RecallEngine | `src/core/modules/query/` | Composite retrieval (vector + graph + salience + recency) |
| TemporalQuery | `src/core/modules/query/` | Point-in-time and validity-window queries |
| DecayEngine | `src/core/modules/memory/` | Apply per-sector forgetting curves |
| AccessControlledStore | `src/core/modules/security/` | RBAC wrapper over StoreAdapter |
| IngestionService | `src/core/modules/ingestion/` | Full ingestion pipeline with classification |
| QueryService | `src/core/modules/query/` | RAG pipeline with recall + RBAC |
| MemoryService | `src/core/modules/memory/` | CRUD + graph relations + supersession |

---

## Vibe Coding Checklist

Before starting any task, agent must verify:

- [ ] I understand the interface contract I'm implementing
- [ ] I have a test file ready (or know where to add tests)
- [ ] I know which docs sections need updating
- [ ] I won't break the dependency graph (core ← server ← adapters)
- [ ] I have a rollback plan (git stash / branch)
- [ ] If building memory semantics, I check config for `docket.memory.mode`

---

## Communication Patterns

### Task Format (from architect to agent)
```markdown
**Agent**: backend-agent
**Scope**: Implement SQLite store adapter
**Interface**: src/core/interfaces/store-adapter.js
**Acceptance Criteria**:
- [ ] Passes store-contract.test.js
- [ ] Migrations run automatically on init
- [ ] Vector search works with sqlite-vec
- [ ] Health check returns latency
- [ ] Schema supports sector, salience, valid_from, valid_to, access_policy
**Constraints**: Use better-sqlite3 (sync API). No external services.
**Timebox**: 2 hours. Escalate if stuck.
```

### Progress Update (from agent to architect)
```markdown
**Status**: 70% complete
**Blocker**: sqlite-vec doesn't support F32_BLOB in current version
**Options**:
1. Use FLOAT32 workaround (5 min)
2. Switch to pgvector for v0.1.0 (architect decision needed)
3. Use pure-JS vector similarity (slower, no blocker)
**Recommendation**: Option 1, document limitation
```

---

## Tool-Specific Instructions

### For Claude Code / Kimi Code

**System Prompt Addendum**:
```
You are the backend-agent for Project Docket.
You implement features within strict architectural boundaries.
Before writing code, read the relevant interface file in src/core/interfaces/.
After implementing, run npm test and update docs if user-facing behavior changed.
Never modify interfaces without architect approval.
Commit with semantic messages: feat:, fix:, docs:, test:, refactor:.
When implementing memory semantics, respect config.docket.memory.mode (flat vs rich).
Every user-facing change must include a corresponding docs update.
```

**Recommended Settings**:
- Temperature: 0.2 (deterministic for code)
- Max tokens: 4000 (full files, not snippets)
- Context window: Use full project context via `@` mentions

**File Context Strategy**:
```
@src/core/interfaces/store-adapter.js      # Contract
@src/adapters/store/sqlite/                 # Where I implement
@tests/integration/adapter-contracts/store-contract.test.js  # Test target
@docs/content/docs/developers/adding-a-store.mdx              # Docs to update
```

---

## Quick Reference: Adapter Implementation Template

When implementing ANY adapter, use this exact structure:

```javascript
// src/adapters/{category}/{name}/index.js
const { BaseAdapter } = require('../../../core/interfaces/{category}-adapter');

/**
 * {Provider} {Category} Adapter
 *
 * @implements {BaseAdapter}
 */
class {Provider}{Category}Adapter extends BaseAdapter {
  constructor(config) {
    super();
    this.config = this.validateConfig(config);
    this.client = null; // Initialize in connect()
  }

  validateConfig(config) {
    // Schema validation using Zod or manual checks
    if (!config.baseUrl) throw new Error('baseUrl required');
    return config;
  }

  async initialize() {
    // Connect to service, run migrations if store
    this.client = await this.createClient();
  }

  async health() {
    const start = Date.now();
    try {
      await this.ping();
      return { ok: true, latency: Date.now() - start };
    } catch (err) {
      return { ok: false, latency: Date.now() - start, error: err.message };
    }
  }

  // ... implement interface methods

  static get metadata() {
    return {
      name: '{provider}-{category}',
      version: '0.1.0',
      capabilities: ['cap1', 'cap2'],
      docketCompatibility: '>=0.1.0 <0.3.0'
    };
  }
}

module.exports = { Provider{Category}Adapter };
```

---

## Quick Reference: Core Module Implementation Template

When implementing ANY core module (Phase 3+):

```javascript
// src/core/modules/{name}/{name}-service.js
const { getLogger } = require('../../utils/logger');

/**
 * {Module} Service
 *
 * Business logic layer. Never imports adapters directly — receives via DI.
 */
class {Module}Service {
  constructor({ storeAdapter, llmAdapter, config }) {
    this.deps = { storeAdapter, llmAdapter };
    this.config = config;
    this.logger = getLogger({ name: '{Module}Service' });
  }

  async execute(input) {
    this.logger.info({ input }, '{Module} started');
    // Implementation
  }
}

module.exports = { {Module}Service };
```

---

## Emergency Procedures

### "I broke the build"
1. Stop. Don't commit more.
2. `git stash` or branch off
3. Run `npm test` to identify failing tests
4. Fix or escalate to architect

### "The interface doesn't fit my adapter"
1. Document the mismatch with examples
2. Propose interface extension (not modification)
3. Await architect approval
4. NEVER hack around the interface

### "I need a new dependency"
1. Check if core already has something similar
2. Evaluate: size, maintenance, license (must be OSS-compatible)
3. Propose in task with justification
4. If approved, add to adapter's package.json (not root unless core needs it)

### "Decay math doesn't match expected values"
1. Check config for correct halfLife and function type
2. Write property-based test to verify against reference formula
3. Escalate to architect if reference implementations disagree

---

## Success Metrics

A vibe-coded project lives or dies by:

| Metric | Target | Measured By |
|--------|--------|-------------|
| Interface stability | 100% | No breaking changes without architect approval |
| Test coverage | >80% | `npm run test:coverage` |
| Docs parity | 100% | Every user-facing feature documented before merge |
| Agent autonomy | 90% | Tasks completed without architect intervention |
| Rollback rate | <5% | Reverted commits / total commits |
| Decay correctness | 100% | Property-based tests pass for all decay functions |
| RBAC coverage | 100% | Every memory route has access control test |
| Docs build | 100% | `npm run docs:check` passes on every PR |

---

*This document is living. Update when agent roles evolve or new patterns emerge.*
