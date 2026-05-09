# 🧠 Cortex

> **Open-Source Second Brain Core**
> 
> Ingest anything. Embed everything. Query your knowledge.

## What is Cortex?

Cortex is an open-source, self-hosted **Second Brain as a Service** — a modular core that developers can build any UI on top of. It handles the heavy lifting of multimodal ingestion, AI-powered insights, vector search, and knowledge retrieval.

**Core philosophy**: Your data, your models, your infrastructure. No vendor lock-in. No black boxes.

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
curl -X POST http://localhost:3000/ingest   -F "file=@photo.jpg"   -F "async=false"

# 5. Query your brain
curl -X POST http://localhost:3000/query   -H "Content-Type: application/json"   -d '{"question": "What did I photograph last week?"}'
```

## Architecture

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Your UI   │────▶│   Cortex    │────▶│   Adapters  │
│  (Anywhere) │     │   Core      │     │  (Swappable)│
└─────────────┘     └─────────────┘     └─────────────┘
                                              │
                    ┌─────────────────────────┼─────────┐
                    ▼                         ▼         ▼
              ┌─────────┐              ┌────────┐ ┌────────┐
              │  LLMs   │              │ Vector │ │  Blob  │
              │Ollama   │              │ Store  │ │ Store  │
              │OpenAI   │              │SQLite  │ │Filesystem│
              │Kimi     │              │Postgres│ │S3/R2   │
              └─────────┘              └────────┘ └────────┘
```

## Key Features

- 🖼️ **Multimodal Ingestion** — Photos, audio, video, text, PDFs
- 🔍 **Semantic Search** — Vector embeddings for meaning-based retrieval
- 🤖 **AI Insights** — Automatic summarization and pattern detection
- 🔌 **Plugin Architecture** — Swap LLMs, databases, blob stores via config
- 🏠 **Self-Hosted** — Run on a Mac mini, VPS, or serverless
- 📱 **API-First** — Build any UI: web, mobile, CLI, voice

## Documentation

- 📖 [User Docs](https://cortex-docs.example.com/users) — Getting started, hosting, configuration
- 🛠️ [Developer Docs](https://cortex-docs.example.com/developers) — Architecture, adding adapters, contributing
- 📚 [API Reference](https://cortex-docs.example.com/api) — OpenAPI spec

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

## License

MIT — See [LICENSE](LICENSE)

---

**Built with ❤️ for vibe coders everywhere.**
