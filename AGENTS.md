# Cortex — AI Agent Orchestration Guide

> **Project**: Cortex — Open-Source Second Brain Core
> **Approach**: Vibe Coding with AI Agents
> **Last Updated**: 2026-05-08

---

## Philosophy

This project is built via **vibe coding** — we describe intent, agents implement. No hand-cranked boilerplate. The human architect provides direction; AI agents execute within defined boundaries.

**Rules of Engagement**:
1. Agents never modify `src/core/interfaces/` without explicit architect approval
2. Agents always write tests before/during implementation (TDD vibe)
3. Agents always update docs when changing user-facing behavior
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

**When to escalate to architect**:
- Changing any file in `src/core/interfaces/`
- Adding a new core module (new folder in `src/core/modules/`)
- Modifying the config schema
- Changing the request lifecycle
- Adding new external dependencies to core

---

### 🔧 `backend-agent`
**Primary executor.** Implements features, adapters, routes, tests.

**Skills**: Node.js, Fastify, SQL, testing, API design, async programming

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
7. Commit with semantic message
```

**Constraints**:
- NEVER import from `src/adapters/` into `src/core/`
- ALWAYS use dependency injection — never instantiate adapters in core
- ALWAYS handle errors with CortexError subclasses
- ALWAYS add JSDoc to public methods

---

### 📚 `docs-agent`
**Maintains documentation parity with code.**

**Skills**: Technical writing, Markdown, OpenAPI, JSON Schema

**Scope**:
- `docs/users/`
- `docs/developers/`
- `README.md`
- `CHANGELOG.md`

**Triggers** (auto-activated when backend-agent commits):
- New API endpoint → update `docs/users/api/`
- New config option → update `docs/users/configuration/`
- New adapter → update `docs/developers/contributing/`
- Breaking change → update `docs/developers/operations/upgrading.md`

**Workflow**:
```
1. Detect code change via git diff or task assignment
2. Identify affected docs sections
3. Update docs to reflect new reality
4. Run docs link checker
5. Commit with [docs] prefix
```

---

### 🧪 `qa-agent`
**Tests what backend-agent misses. Exploratory testing.**

**Skills**: Testing strategies, edge case identification, load testing, security basics

**Scope**:
- Integration test gaps
- E2E scenarios
- Performance benchmarks
- Security checks (no secrets in logs, injection prevention)

**Workflow**:
```
1. Review backend-agent commits
2. Identify untested paths
3. Write adversarial tests (malformed inputs, race conditions)
4. Run load tests if new I/O paths added
5. File issues with [qa] label
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
- [ ] User docs: multipart upload examples
- [ ] Developer docs: blob adapter interface usage
- [ ] API docs: OpenAPI spec update for /ingest

**Known Issues**:
- Large file (>100MB) handling not optimized — see TODO in ingest.js:42
```

---

## Vibe Coding Checklist

Before starting any task, agent must verify:

- [ ] I understand the interface contract I'm implementing
- [ ] I have a test file ready (or know where to add tests)
- [ ] I know which docs sections need updating
- [ ] I won't break the dependency graph (core ← server ← adapters)
- [ ] I have a rollback plan (git stash / branch)

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
You are the backend-agent for Project Cortex. 
You implement features within strict architectural boundaries.
Before writing code, read the relevant interface file in src/core/interfaces/.
After implementing, run npm test and update docs if user-facing behavior changed.
Never modify interfaces without architect approval.
Commit with semantic messages: feat:, fix:, docs:, test:, refactor:.
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
@docs/developers/contributing/adding-store-adapter.md        # Docs to update
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
      cortexCompatibility: '>=0.1.0 <0.3.0'
    };
  }
}

module.exports = { Provider{Category}Adapter };
```

---

## Emergency Procedures

### "I broke the build"
1. Stop. Don't commit more.
2. `git stash` or branch off
3. Run `npm test` to identify failing tests
4. Fix or escalate to architect with test output

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

---

*This document is living. Update when agent roles evolve or new patterns emerge.*
