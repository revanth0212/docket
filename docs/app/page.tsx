import Link from 'next/link';
import { Cards, Card } from 'fumadocs-ui/components/card';

function ArrowRightIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M5 12h14" />
      <path d="m12 5 7 7-7 7" />
    </svg>
  );
}

function GitHubIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="currentColor"
      {...props}
    >
      <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" />
    </svg>
  );
}

export default function HomePage() {
  return (
    <main className="relative flex flex-col">
      {/* Hero */}
      <section className="relative overflow-hidden bg-hero-glow px-6 pt-32 pb-24 sm:pt-40 sm:pb-32 lg:px-8">
        <div className="mx-auto max-w-4xl text-center">
          <div className="mb-6 inline-flex items-center rounded-full border border-[hsl(var(--fd-border))] bg-[hsl(var(--fd-card))] px-3 py-1 text-sm text-[hsl(var(--fd-muted-foreground))] shadow-sm animate-fade-in">
            <span className="mr-2 inline-block h-2 w-2 rounded-full bg-[hsl(var(--fd-primary))]" />
            Open-source Second Brain Core
          </div>

          <h1 className="text-balance text-4xl font-extrabold tracking-tight text-[hsl(var(--fd-foreground))] sm:text-6xl lg:text-7xl animate-slide-up">
            Memory that thinks.
            <br />
            <span className="bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 bg-clip-text text-transparent">
              Knowledge that lasts.
            </span>
          </h1>

          <p className="mx-auto mt-6 max-w-2xl text-balance text-lg text-[hsl(var(--fd-muted-foreground))] sm:text-xl animate-slide-up">
            Docket is an open-source, self-hosted Second Brain as a Service.
            Ingest anything, embed everything, and query your knowledge with a
            memory model built after human cognition.
          </p>

          <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row animate-slide-up">
            <Link
              href="/docs"
              className="group inline-flex items-center gap-2 rounded-xl bg-[hsl(var(--fd-primary))] px-6 py-3 font-semibold text-[hsl(var(--fd-primary-foreground))] shadow-lg shadow-orange-500/20 transition-all hover:brightness-110 hover:shadow-orange-500/30"
            >
              Read the Docs
              <ArrowRightIcon className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
            <Link
              href="https://github.com/revanth0212/docket"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 rounded-xl border border-[hsl(var(--fd-border))] bg-[hsl(var(--fd-card))] px-6 py-3 font-semibold text-[hsl(var(--fd-foreground))] transition-colors hover:bg-[hsl(var(--fd-muted))]"
            >
              <GitHubIcon className="h-4 w-4" />
              View on GitHub
            </Link>
          </div>
        </div>
      </section>

      {/* What is Docket */}
      <section className="px-6 py-20 lg:px-8">
        <div className="mx-auto max-w-4xl">
          <h2 className="text-center text-3xl font-bold tracking-tight text-[hsl(var(--fd-foreground))] sm:text-4xl">
            What is Docket?
          </h2>
          <p className="mx-auto mt-6 text-center text-lg leading-8 text-[hsl(var(--fd-muted-foreground))]">
            Most knowledge systems treat memory as a flat vector database.
            Docket treats it as a living, structured memory graph: every fact
            has context, lifetime, importance, and relationships. You can ask
            complex questions across time, retrieve memories by salience, and
            build agents that remember what actually matters.
          </p>
        </div>
      </section>

      {/* Why Docket */}
      <section className="border-y border-[hsl(var(--fd-border))] bg-[hsl(var(--fd-muted))]/40 px-6 py-20 lg:px-8">
        <div className="mx-auto grid max-w-6xl gap-12 lg:grid-cols-2 lg:gap-16">
          <div>
            <h2 className="text-3xl font-bold tracking-tight text-[hsl(var(--fd-foreground))] sm:text-4xl">
              Why Docket?
            </h2>
            <p className="mt-6 text-lg leading-8 text-[hsl(var(--fd-muted-foreground))]">
              RAG gives you answers from documents. Docket gives you a system
              that reasons like you do.
            </p>
            <ul className="mt-8 space-y-4 text-[hsl(var(--fd-foreground))]">
              {[
                'Stop losing context across sessions',
                'Query what was true at any point in time',
                'Control forgetting instead of brute-force context windows',
                'Own your memory stack — self-hosted and open-source'
              ].map((item) => (
                <li key={item} className="flex items-start gap-3">
                  <span className="mt-1 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[hsl(var(--fd-primary))]/10 text-[hsl(var(--fd-primary))]">
                    ✓
                  </span>
                  {item}
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-2xl border border-[hsl(var(--fd-border))] bg-[hsl(var(--fd-card))] p-8 shadow-sm">
            <h3 className="text-xl font-semibold text-[hsl(var(--fd-foreground))]">
              Built for builders
            </h3>
            <p className="mt-4 text-[hsl(var(--fd-muted-foreground))]">
              Docket is designed as a pluggable core. Swap LLMs, embedding
              models, vector stores, blob providers, and queues without
              rewriting your application. Deploy it on your laptop, Cloudflare,
              AWS, or anywhere Node.js runs.
            </p>
            <div className="mt-6 flex flex-wrap gap-2">
              {['OpenAI', 'Ollama', 'Cloudflare', 'AWS', 'SQLite', 'Postgres'].map(
                (tag) => (
                  <span
                    key={tag}
                    className="rounded-full border border-[hsl(var(--fd-border))] bg-[hsl(var(--fd-background))] px-3 py-1 text-sm text-[hsl(var(--fd-muted-foreground))]"
                  >
                    {tag}
                  </span>
                )
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Core capabilities */}
      <section className="px-6 py-24 lg:px-8">
        <div className="mx-auto max-w-6xl">
          <div className="text-center">
            <h2 className="text-3xl font-bold tracking-tight text-[hsl(var(--fd-foreground))] sm:text-4xl">
              Core capabilities
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-lg text-[hsl(var(--fd-muted-foreground))]">
              Everything you need to build memory-backed applications.
            </p>
          </div>

          <Cards className="mt-12 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
            <Card
              title="Cognitive memory model"
              href="/docs/users/memory-modes"
            >
              Memories are organized into sectors — episodic, semantic,
              procedural, emotional, reflective — not flat vectors.
            </Card>
            <Card
              title="Temporal knowledge graph"
              href="/docs/users/querying"
            >
              Ask “what was true on March 1st?” and get answers anchored in
              time.
            </Card>
            <Card
              title="Composite retrieval"
              href="/docs/users/querying"
            >
              Combine vector similarity, graph traversal, salience, recency,
              and temporal filters in one query.
            </Card>
            <Card
              title="Adaptive decay"
              href="/docs/users/memory-modes"
            >
              Per-sector forgetting curves keep important memories surfaced
              and prune noise automatically.
            </Card>
            <Card title="RBAC access control" href="/docs/users/rbac">
              Resource-based policies on every memory, so multi-user agents
              stay safe by default.
            </Card>
            <Card
              title="Pluggable adapters"
              href="/docs/developers/adapter-contracts"
            >
              Swap LLMs, stores, blob providers, and queues without touching
              your app logic.
            </Card>
          </Cards>
        </div>
      </section>

      {/* Quick start CTA */}
      <section className="px-6 pb-24 lg:px-8">
        <div className="mx-auto max-w-5xl rounded-3xl border border-[hsl(var(--fd-border))] bg-gradient-to-br from-amber-500/10 via-orange-500/5 to-transparent p-10 text-center sm:p-16">
          <h2 className="text-3xl font-bold tracking-tight text-[hsl(var(--fd-foreground))] sm:text-4xl">
            Start building with Docket
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-[hsl(var(--fd-muted-foreground))]">
            Get up and running in minutes, then explore the full architecture
            when you are ready to extend it.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link
              href="/docs/users/quickstart"
              className="group inline-flex items-center gap-2 rounded-xl bg-[hsl(var(--fd-primary))] px-6 py-3 font-semibold text-[hsl(var(--fd-primary-foreground))] shadow-lg shadow-orange-500/20 transition-all hover:brightness-110"
            >
              Quick Start
              <ArrowRightIcon className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
            <Link
              href="/docs/developers/overview"
              className="inline-flex items-center gap-2 rounded-xl border border-[hsl(var(--fd-border))] bg-[hsl(var(--fd-card))] px-6 py-3 font-semibold text-[hsl(var(--fd-foreground))] transition-colors hover:bg-[hsl(var(--fd-muted))]"
            >
              Developer Overview
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
