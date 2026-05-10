# 🧠 Cortex

> **Open-Source Second Brain Core**
>
> Ingest anything. Embed everything. Query your knowledge — with memory that thinks.

## What is Cortex?

Cortex is an open-source, self-hosted **Second Brain as a Service** — a modular core that developers can build any UI on top of. It handles the heavy lifting of multimodal ingestion, AI-powered insights, vector search, and knowledge retrieval.

Unlike simple RAG systems, Cortex models memory after human cognition: memories have **sectors** (episodic, semantic, procedural, emotional, reflective), **validity over time**, **salience scores**, and **adaptive decay**. Retrieval combines vector similarity, graph traversal, recency, and context — not just cosine distance.

**Core philosophy**: Your data, your models, your infrastructure. No vendor lock-in. No black boxes. Rich memory semantics, fully configurable.

## Quick Start (5 minutes)

```bash
# 1. Clone and install
git clone https://github.com/yourusername/cortex.git
cd cortex && npm install

# 2. Start Ollama locally (for LLM + embeddings)
ollama pull llama3.2
ollama pull nomic-embed-text
ollama serve

# 3. Start Cortex
npm start

# 4. Ingest a photo
curl -X POST http://localhost:3000/ingest \
  -F "file=@photo.jpg" \
  -F "async=false"

# 5. Query your brain
curl -X POST http://localhost:3000/query \
  -H "Content-Type: application/json" \
  -d '{"question": "What did I photograph last week?"}'
```

## Architecture

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Your UI   │────▶│   Cortex    │────▶│   Adapters  │
│  (Anywhere) │     │   Core      │     │  (Swappable)│
└─────────────┘     └─────────────┘     └─────────────┘
                            │                     │
        ┌───────────────────┼───────────────────┼─────────┐
        ▼                   ▼                   ▼         ▼
   ┌─────────┐      ┌─────────────┐      ┌────────┐ ┌────────┐
   │  LLMs   │      │  Memory     │      │ Vector │ │  Blob  │
   │Ollama   │      │  Semantics  │      │ Store  │ │ Store  │
   │OpenAI   │      │  (Sectors,  │      │SQLite  │ │Filesystem│
   │Kimi     │      │   Temporal, │      │Postgres│ │S3/R2   │
   └─────────┘      │   Decay)    │      └────────┘ └────────┘
                    └─────────────┘
```

## Key Features

- 🧬 **Cognitive Memory Model** — Memories classified into sectors: episodic (events), semantic (facts), procedural (skills), emotional (feelings), reflective (insights). Not flat embeddings.
- 🕰️ **Temporal Knowledge Graph** — Ask "what was true on March 1st?" Memories have `validFrom`/`validTo` and supersession chains.
- 🔍 **Composite Retrieval** — Vector similarity + graph traversal + salience + recency + temporal relevance. Ranked results with explainable traces.
- 🌊 **Adaptive Decay** — Per-sector forgetting curves (exponential, linear, or none). Semantic facts persist; daily events fade.
- 🔐 **RBAC Access Control** — Resource-based access policies on every memory. Owner, readers, writers, or named policy references.
- 🖼️ **Multimodal Ingestion** — Photos, audio, video, text, PDFs
- 🤖 **AI Insights** — Automatic summarization, sector classification, and pattern detection
- 🔌 **Plugin Architecture** — Swap LLMs, databases, blob stores via config
- 🏠 **Self-Hosted** — Run on a Mac mini, VPS, or serverless
- 📱 **API-First** — Build any UI: web, mobile, CLI, voice, MCP server

## Memory Semantics (Optional, Configurable)

Cortex works in two modes:

**Flat mode** (default): Simple memory records with embeddings — just like any RAG system.

**Rich mode**: Full cognitive memory with sectors, decay, and temporal queries.

Toggle in `config.yaml`:

```yaml
cortex:
  memory:
    mode: "rich"  # flat | rich
    sectors:
      enabled: true
      default: "semantic"
    decay:
      enabled: true
      functions:
        episodic: { type: "exponential", halfLifeDays: 30 }
        emotional: { type: "exponential", halfLifeDays: 7 }
        semantic: { type: "none" }
    rbac:
      enabled: true
      defaultPolicy: "owner-only"
```

## Documentation

- 📖 [User Docs](https://cortex-docs.example.com/users) — Getting started, hosting, configuration
- 🛠️ [Developer Docs](https://cortex-docs.example.com/developers) — Architecture, adding adapters, contributing
- 📚 [API Reference](https://cortex-docs.example.com/api) — OpenAPI spec

## Local Development

```bash
# 1. Clone and install
git clone https://github.com/yourusername/cortex.git
cd cortex && npm install

# 2. Start Ollama locally
ollama pull llama3.2
ollama pull nomic-embed-text
ollama serve

# 3. Start Cortex in dev mode
npm run dev

# 4. Run tests
npm run test:unit
ADAPTER=sqlite npm test -- tests/integration/adapter-contracts/store-contract.test.js

# 5. Start the docs site
npm run docs:dev
```

See the full [Local Development Guide](docs/content/docs/developers/local-development.mdx) for troubleshooting, adapter development workflow, and code quality scripts.

## Hosting Options

| Method | Best For | Docs |
|--------|----------|------|
| **Standalone** | Mac mini, VPS, always-on server | [Guide](docs/users/hosting/standalone.md) |
| **Docker** | Easy deployment, reproducible env | [Guide](docs/users/hosting/docker.md) |
| **AWS Lambda** | Serverless, pay-per-use | [Guide](docs/users/hosting/serverless.md) |
| **Cloudflare Workers** | Edge deployment, low latency | [Guide](docs/users/hosting/serverless.md) |

## Contributing

We welcome contributions! See our [Contributing Guide](docs/developers/contributing/setup.md).

### Adding an Adapter

The easiest way to contribute is adding support for a new LLM, database, or storage provider:

1. Implement the interface contract (`src/core/interfaces/`)
2. Write contract tests
3. Add config examples to docs
4. Submit PR

### Adding a Connector

Ingest from external sources (GitHub, Notion, etc.):

1. Create a package under `packages/connectors/{source}/`
2. Produce blobs and enqueue ingestion jobs via `BlobAdapter` + `QueueAdapter`
3. Document config options

## License

MIT — See [LICENSE](LICENSE)

---

**Built with ❤️ for vibe coders everywhere.**
