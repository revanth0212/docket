# 📋 Docket

> **Open-Source Second Brain Core**
>
> Ingest anything. Embed everything. Query your knowledge — with memory that thinks.

## What is Docket?

**Docket** is an open-source, self-hosted **Second Brain as a Service** — a modular core that developers can build any UI on top of. It handles the heavy lifting of multimodal ingestion, AI-powered insights, vector search, and knowledge retrieval.

Unlike simple RAG systems, Docket models memory after human cognition: memories have **sectors** (episodic, semantic, procedural, emotional, reflective), **validity over time**, **salience scores**, and **adaptive decay**. Retrieval combines vector similarity, graph traversal, recency, and context — not just cosine distance.

**Core philosophy**: Your data, your models, your infrastructure. No vendor lock-in. No black boxes. Rich memory semantics, fully configurable.

### Why "Docket"?

If you have watched [*Suits*](https://en.wikipedia.org/wiki/Suits_(American_TV_series)), you know **Donna Paulsen**.

Donna is never just a secretary. She is three steps ahead of whatever Harvey Specter needs. She remembers every case, every client, every favor. She knows which file to pull before Harvey asks for it. She filters the noise and surfaces exactly what matters — context, timing, and relevance included.

**Docket is your Donna.**

It is the system that knows what you know, remembers what you forgot, and surfaces the right information at the right moment — so you can do your best work without drowning in your own data.

## Quick Start (5 minutes)

```bash
# 1. Clone and install
git clone https://github.com/yourusername/docket.git
cd docket && npm install

# 2. Run interactive setup — creates config.yaml and data directories
npm run setup

# 3. Check prerequisites (Ollama, Node version, data directory)
npm run doctor

# 4. Start Ollama locally (for LLM + embeddings)
ollama pull llama3.2
ollama pull nomic-embed-text
ollama serve

# 5. Start Docket
npm start

# 6. Check health
curl http://localhost:3000/health

# 7. Ingest a photo
curl -X POST http://localhost:3000/ingest \
  -F "file=@photo.jpg" \
  -F "async=false"

# 8. Query your brain
curl -X POST http://localhost:3000/query \
  -H "Content-Type: application/json" \
  -d '{"question": "What did I photograph last week?"}'
```

## Architecture

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Your UI   │────▶│   Docket    │────▶│   Adapters  │
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

Docket works in two modes:

**Flat mode** (default): Simple memory records with embeddings — just like any RAG system.

**Rich mode**: Full cognitive memory with sectors, decay, and temporal queries.

Toggle in `config.yaml`:

```yaml
docket:
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

- 📖 [User Docs](https://docket-docs.example.com/users) — Getting started, hosting, configuration
- 🛠️ [Developer Docs](https://docket-docs.example.com/developers) — Architecture, adding adapters, contributing
- 📚 [API Reference](https://docket-docs.example.com/api) — OpenAPI spec

## Local Development

```bash
# 1. Clone and install
git clone https://github.com/yourusername/docket.git
cd docket && npm install

# 2. Create your local config and data directories
npm run setup

# 3. Check prerequisites
npm run doctor

# 4. Start Ollama locally
ollama pull llama3.2
ollama pull nomic-embed-text
ollama serve

# 5. Start Docket in dev mode (auto-reload on file changes)
npm run dev

# 6. Run tests
npm run test:unit
npm run test:integration

# 7. Start the docs site
npm run docs:dev
```

See the full [Local Development Guide](docs/content/docs/developers/local-development.mdx) for troubleshooting, adapter development workflow, and code quality scripts.

## Distribution

| Method | Command | Best For |
|--------|---------|----------|
| **npm** | `npm install -g docket` | Developers, CI/CD, quick testing |
| **Homebrew** | `brew install docket` | macOS / Linux desktop users |
| **Docker** | `docker pull docket/docket` | Reproducible deployments, teams |
| **Binary** | Download from GitHub Releases | Air-gapped or restricted environments |
| **Source** | `git clone && npm install` | Contributors, custom builds |

After installation, run `docket setup` to create your config, then `docket doctor` to verify prerequisites.

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
