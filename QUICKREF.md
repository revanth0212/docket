# 🎯 Docket Agent Quick Reference

## Start Here
1. Read `AGENTS.md` — understand your role
2. Read `SKILLS.md` — know your boundaries
3. Read `PROJECT_PLAN.md` — see the roadmap
4. Check current phase in task board

## File Patterns

### Implementing an Adapter
```
src/adapters/{category}/{name}/
├── index.js          # Main adapter class
├── package.json      # Dependencies
└── README.md         # Usage + config examples
```

### Writing a Core Module
```
src/core/modules/{name}/
├── {name}-service.js    # Business logic
└── {name}-errors.js     # Domain errors
```

### Adding a Core Module (Phase 3+)
```
src/core/modules/{domain}/
├── {module}-service.js     # Business logic
├── {module}-errors.js      # Domain errors
└── {module}-config.js      # Default config + schema
```

Core module domains:
- `classifier/` — Sector classification
- `query/` — RecallEngine, TemporalQuery, QueryService
- `memory/` — DecayEngine, MemoryService
- `security/` — AccessControlledStore, RBAC middleware
- `ingestion/` — IngestionService

### Adding a Route
```
src/server/routes/{endpoint}.js
```

### Adding Middleware
```
src/server/middleware/{name}-middleware.js
```

## Golden Rules
- ✅ Read interface before implementing
- ✅ Write tests first (red → green → refactor)
- ✅ Use dependency injection (no direct adapter imports in core)
- ✅ Update docs for user-facing changes
- ✅ Commit with semantic prefix: `feat:`, `fix:`, `docs:`, `test:`, `refactor:`
- ✅ Respect `config.docket.memory.mode` — flat vs rich
- ❌ Never modify `src/core/interfaces/` without architect
- ❌ Never use `console.log` — use `getLogger()`
- ❌ Never hardcode config — use injected config
- ❌ Never hardcode sector types — read from config
- ❌ Never implement decay without property-based tests

## Common Commands
```bash
npm test              # Run all tests
npm run test:unit     # Unit tests only
npm run test:integration:llm    # LLM contract tests
npm run test:integration:store  # Store contract tests
npm run test:integration:rbac   # RBAC tests
npm run test:integration:temporal  # Temporal query tests
npm run lint          # Check code style
npm run lint:fix      # Auto-fix style
npm run doctor        # Check environment health
npm run test:coverage # Coverage report
```

## Emergency
- Build broken? `git stash` → fix → re-apply
- Interface mismatch? Escalate to architect
- Decay math wrong? Check config, write property test, escalate
- RBAC bypass suspected? Escalate to architect immediately
- Stuck for >30 min? Ask, don't hallucinate

## Handoff Template
```markdown
## Handoff: {from-agent} → {to-agent}

**Completed**: {what was done}
**Changed Files**: {list}
**Docs Needed**: {checklist}
**Known Issues**: {blockers, TODOs}
**Memory Mode Impact**: {flat | rich | both}
```
