# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.2.0] - 2026-06-15

### Added

- **Rich cognitive memory mode** with per-memory sectors: episodic, semantic, procedural, emotional, reflective.
- **Temporal knowledge graph** — `validFrom`/`validTo` windows and point-in-time queries.
- **Adaptive decay engine** with per-sector forgetting curves (exponential, linear, none).
- **Resource-based access control (RBAC)** — owner/readers/writers, built-in policies, named policies, and header/JWT/API-key authentication strategies.
- **Unified, standalone, control/data-plane, and serverless platforms** (AWS Lambda, Cloudflare Workers).
- **In-memory queue adapter** with async ingestion job support.
- **MCP data-plane server** for external tool integration.
- **Comprehensive docs** for users, developers, and hosting providers.

### Changed

- Default memory mode is now `flat`; `rich` mode is opt-in via config.
- RBAC is disabled by default to keep the quick-start path frictionless.

## [0.1.0] - 2026-05-09

### Added

- Initial repo bootstrap with Fastify, adapter interfaces, config loader, and health route.
- Flat memory ingestion and semantic query pipeline.
- SQLite, filesystem blob, Ollama LLM/embedder, and in-memory queue adapters.
