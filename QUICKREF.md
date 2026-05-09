# 🎯 Cortex Agent Quick Reference

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

### Adding a Route
```
src/server/routes/{endpoint}.js
```

## Golden Rules
- ✅ Read interface before implementing
- ✅ Write tests first (red → green → refactor)
- ✅ Use dependency injection (no direct adapter imports in core)
- ✅ Update docs for user-facing changes
- ✅ Commit with semantic prefix: `feat:`, `fix:`, `docs:`, `test:`, `refactor:`
- ❌ Never modify `src/core/interfaces/` without architect
- ❌ Never use `console.log` — use `getLogger()`
- ❌ Never hardcode config — use injected config

## Common Commands
```bash
npm test              # Run all tests
npm run test:unit     # Unit tests only
npm run test:integration:llm    # LLM contract tests
npm run test:integration:store  # Store contract tests
npm run lint          # Check code style
npm run lint:fix      # Auto-fix style
npm run doctor        # Check environment health
```

## Emergency
- Build broken? `git stash` → fix → re-apply
- Interface mismatch? Escalate to architect
- Stuck for >30 min? Ask, don't hallucinate

## Handoff Template
```markdown
## Handoff: {from-agent} → {to-agent}

**Completed**: {what was done}
**Changed Files**: {list}
**Docs Needed**: {checklist}
**Known Issues**: {blockers, TODOs}
```
