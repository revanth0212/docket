// docs/lib/config-builder/registry.ts
// Canonical adapter registry for the Config Builder.
// When adding a new adapter, register it here.

import { AdapterCategory, AdapterEntry } from './types';

export const ADAPTER_REGISTRY: AdapterEntry[] = [
  // ─────────────────────────────────────────────────────────────────────────────
  // Platform / deployment modes
  // ─────────────────────────────────────────────────────────────────────────────
  {
    id: 'unified',
    providerKey: 'unified',
    category: 'platform',
    label: 'Unified Platform',
    description: 'Runs control and data planes in a single process.',
    adapterPackage: '',
    icon: '🔀',
    defaultConfig: { port: 3000, host: '127.0.0.1' },
    configSchema: [
      { key: 'port', label: 'Port', type: 'number', default: 3000, envVar: 'DOCKET_SERVER_PORT' },
      { key: 'host', label: 'Host', type: 'string', default: '127.0.0.1', envVar: 'DOCKET_SERVER_HOST' }
    ],
    ports: {
      in: [],
      out: [
        { id: 'to-llm', label: 'LLM', provides: 'llm' },
        { id: 'to-embedder', label: 'Embedder', provides: 'embedder' },
        { id: 'to-store', label: 'Store', provides: 'store' },
        { id: 'to-blob', label: 'Blob', provides: 'blob' },
        { id: 'to-queue', label: 'Queue', provides: 'queue' }
      ]
    }
  },
  {
    id: 'control',
    providerKey: 'control',
    category: 'platform',
    label: 'Control Plane Only',
    description: 'Runs only the control plane (admin/management APIs).',
    adapterPackage: '',
    icon: '🎛️',
    defaultConfig: { port: 3000, host: '127.0.0.1' },
    configSchema: [
      { key: 'port', label: 'Port', type: 'number', default: 3000, envVar: 'DOCKET_SERVER_PORT' },
      { key: 'host', label: 'Host', type: 'string', default: '127.0.0.1', envVar: 'DOCKET_SERVER_HOST' }
    ],
    ports: {
      in: [],
      out: [
        { id: 'to-llm', label: 'LLM', provides: 'llm' },
        { id: 'to-embedder', label: 'Embedder', provides: 'embedder' },
        { id: 'to-store', label: 'Store', provides: 'store' },
        { id: 'to-blob', label: 'Blob', provides: 'blob' },
        { id: 'to-queue', label: 'Queue', provides: 'queue' }
      ]
    }
  },
  {
    id: 'data',
    providerKey: 'data',
    category: 'platform',
    label: 'Data Plane Only',
    description: 'Runs only the data plane (ingest/query APIs).',
    adapterPackage: '',
    icon: '📡',
    defaultConfig: { port: 3000, host: '127.0.0.1' },
    configSchema: [
      { key: 'port', label: 'Port', type: 'number', default: 3000, envVar: 'DOCKET_SERVER_PORT' },
      { key: 'host', label: 'Host', type: 'string', default: '127.0.0.1', envVar: 'DOCKET_SERVER_HOST' }
    ],
    ports: {
      in: [],
      out: [
        { id: 'to-llm', label: 'LLM', provides: 'llm' },
        { id: 'to-embedder', label: 'Embedder', provides: 'embedder' },
        { id: 'to-store', label: 'Store', provides: 'store' },
        { id: 'to-blob', label: 'Blob', provides: 'blob' },
        { id: 'to-queue', label: 'Queue', provides: 'queue' }
      ]
    }
  },
  {
    id: 'standalone',
    providerKey: 'standalone',
    category: 'platform',
    label: 'Standalone',
    description: 'Single-process deployment without platform splitting.',
    adapterPackage: '',
    icon: '🖥️',
    defaultConfig: { port: 3000, host: '127.0.0.1' },
    configSchema: [
      { key: 'port', label: 'Port', type: 'number', default: 3000, envVar: 'DOCKET_SERVER_PORT' },
      { key: 'host', label: 'Host', type: 'string', default: '127.0.0.1', envVar: 'DOCKET_SERVER_HOST' }
    ],
    ports: {
      in: [],
      out: [
        { id: 'to-llm', label: 'LLM', provides: 'llm' },
        { id: 'to-embedder', label: 'Embedder', provides: 'embedder' },
        { id: 'to-store', label: 'Store', provides: 'store' },
        { id: 'to-blob', label: 'Blob', provides: 'blob' },
        { id: 'to-queue', label: 'Queue', provides: 'queue' }
      ]
    }
  },
  {
    id: 'serverless-aws-lambda',
    providerKey: 'serverless-aws-lambda',
    category: 'platform',
    label: 'Serverless (AWS Lambda)',
    description: 'Deploy as an AWS Lambda function.',
    adapterPackage: '',
    icon: 'λ',
    defaultConfig: { port: 3000, host: '127.0.0.1' },
    configSchema: [
      { key: 'port', label: 'Port', type: 'number', default: 3000, envVar: 'DOCKET_SERVER_PORT' },
      { key: 'host', label: 'Host', type: 'string', default: '127.0.0.1', envVar: 'DOCKET_SERVER_HOST' }
    ],
    installCommand: 'npm install @aws-sdk/client-lambda',
    ports: {
      in: [],
      out: [
        { id: 'to-llm', label: 'LLM', provides: 'llm' },
        { id: 'to-embedder', label: 'Embedder', provides: 'embedder' },
        { id: 'to-store', label: 'Store', provides: 'store' },
        { id: 'to-blob', label: 'Blob', provides: 'blob' },
        { id: 'to-queue', label: 'Queue', provides: 'queue' }
      ]
    }
  },
  {
    id: 'serverless-cloudflare-workers',
    providerKey: 'serverless-cloudflare-workers',
    category: 'platform',
    label: 'Serverless (Cloudflare Workers)',
    description: 'Deploy on Cloudflare Workers.',
    adapterPackage: '',
    icon: '☁️',
    defaultConfig: { port: 3000, host: '127.0.0.1' },
    configSchema: [
      { key: 'port', label: 'Port', type: 'number', default: 3000, envVar: 'DOCKET_SERVER_PORT' },
      { key: 'host', label: 'Host', type: 'string', default: '127.0.0.1', envVar: 'DOCKET_SERVER_HOST' }
    ],
    installCommand: 'npm install wrangler',
    ports: {
      in: [],
      out: [
        { id: 'to-llm', label: 'LLM', provides: 'llm' },
        { id: 'to-embedder', label: 'Embedder', provides: 'embedder' },
        { id: 'to-store', label: 'Store', provides: 'store' },
        { id: 'to-blob', label: 'Blob', provides: 'blob' },
        { id: 'to-queue', label: 'Queue', provides: 'queue' }
      ]
    }
  },

  // ─────────────────────────────────────────────────────────────────────────────
  // LLM adapters
  // ─────────────────────────────────────────────────────────────────────────────
  {
    id: 'ollama-llm',
    providerKey: 'ollama',
    category: 'llm',
    label: 'Ollama',
    description: 'Local LLM via Ollama.',
    adapterPackage: '@docket/llm-ollama',
    icon: '🦙',
    defaultConfig: { baseUrl: 'http://localhost:11434', model: 'llama3.2', timeout: 30000 },
    configSchema: [
      { key: 'baseUrl', label: 'Base URL', type: 'string', default: 'http://localhost:11434', envVar: 'OLLAMA_BASE_URL' },
      { key: 'model', label: 'Model', type: 'string', default: 'llama3.2', envVar: 'OLLAMA_MODEL' },
      { key: 'timeout', label: 'Timeout (ms)', type: 'number', default: 30000, envVar: 'OLLAMA_TIMEOUT' }
    ],
    requires: ['ollama'],
    ports: {
      in: [{ id: 'from-platform', label: 'Platform', accepts: ['platform'] }],
      out: []
    }
  },
  {
    id: 'openai-llm',
    providerKey: 'openai',
    category: 'llm',
    label: 'OpenAI',
    description: 'OpenAI-compatible API endpoint.',
    adapterPackage: '@docket/llm-openai-compatible',
    icon: '✨',
    defaultConfig: { baseUrl: 'https://api.openai.com/v1', apiKey: '', model: 'gpt-4o-mini', timeout: 30000 },
    configSchema: [
      { key: 'baseUrl', label: 'Base URL', type: 'string', default: 'https://api.openai.com/v1', envVar: 'OPENAI_BASE_URL' },
      { key: 'apiKey', label: 'API Key', type: 'string', secret: true, envVar: 'OPENAI_API_KEY' },
      { key: 'model', label: 'Model', type: 'string', default: 'gpt-4o-mini', envVar: 'OPENAI_MODEL' },
      { key: 'timeout', label: 'Timeout (ms)', type: 'number', default: 30000, envVar: 'OPENAI_TIMEOUT' }
    ],
    ports: {
      in: [{ id: 'from-platform', label: 'Platform', accepts: ['platform'] }],
      out: []
    }
  },
  {
    id: 'lm-studio-llm',
    providerKey: 'lm-studio',
    category: 'llm',
    label: 'LM Studio',
    description: 'Local LM Studio server.',
    adapterPackage: '@docket/llm-openai-compatible',
    icon: '🏠',
    defaultConfig: { baseUrl: 'http://localhost:1234/v1', model: 'local-model', timeout: 30000 },
    configSchema: [
      { key: 'baseUrl', label: 'Base URL', type: 'string', default: 'http://localhost:1234/v1', envVar: 'LM_STUDIO_BASE_URL' },
      { key: 'model', label: 'Model', type: 'string', default: 'local-model', envVar: 'LM_STUDIO_MODEL' },
      { key: 'timeout', label: 'Timeout (ms)', type: 'number', default: 30000, envVar: 'LM_STUDIO_TIMEOUT' }
    ],
    requires: ['lm-studio'],
    ports: {
      in: [{ id: 'from-platform', label: 'Platform', accepts: ['platform'] }],
      out: []
    }
  },
  {
    id: 'kimi-llm',
    providerKey: 'kimi',
    category: 'llm',
    label: 'Kimi',
    description: 'Moonshot Kimi API.',
    adapterPackage: '@docket/llm-openai-compatible',
    icon: '🌙',
    defaultConfig: { baseUrl: 'https://api.moonshot.cn/v1', apiKey: '', model: 'kimi-k2', timeout: 60000 },
    configSchema: [
      { key: 'baseUrl', label: 'Base URL', type: 'string', default: 'https://api.moonshot.cn/v1', envVar: 'KIMI_BASE_URL' },
      { key: 'apiKey', label: 'API Key', type: 'string', secret: true, envVar: 'DOCKET_KIMI_API_KEY' },
      { key: 'model', label: 'Model', type: 'string', default: 'kimi-k2', envVar: 'KIMI_MODEL' },
      { key: 'timeout', label: 'Timeout (ms)', type: 'number', default: 60000, envVar: 'KIMI_TIMEOUT' }
    ],
    ports: {
      in: [{ id: 'from-platform', label: 'Platform', accepts: ['platform'] }],
      out: []
    }
  },
  {
    id: 'aws-bedrock-llm',
    providerKey: 'aws-bedrock',
    category: 'llm',
    label: 'AWS Bedrock',
    description: 'LLM via AWS Bedrock.',
    adapterPackage: '@docket/llm-aws-bedrock',
    icon: '⚡',
    defaultConfig: { region: 'us-east-1', accessKeyId: '', secretAccessKey: '', model: 'anthropic.claude-3-5-sonnet-20241022-v2:0', timeout: 60000 },
    configSchema: [
      { key: 'region', label: 'Region', type: 'string', default: 'us-east-1', envVar: 'AWS_REGION' },
      { key: 'accessKeyId', label: 'Access Key ID', type: 'string', secret: true, envVar: 'AWS_ACCESS_KEY_ID' },
      { key: 'secretAccessKey', label: 'Secret Access Key', type: 'string', secret: true, envVar: 'AWS_SECRET_ACCESS_KEY' },
      { key: 'model', label: 'Model', type: 'string', default: 'anthropic.claude-3-5-sonnet-20241022-v2:0', envVar: 'BEDROCK_MODEL' },
      { key: 'timeout', label: 'Timeout (ms)', type: 'number', default: 60000, envVar: 'BEDROCK_TIMEOUT' }
    ],
    installCommand: 'npm install @aws-sdk/client-bedrock-runtime',
    ports: {
      in: [{ id: 'from-platform', label: 'Platform', accepts: ['platform'] }],
      out: []
    }
  },
  {
    id: 'cloudflare-workers-ai-llm',
    providerKey: 'cloudflare-workers-ai',
    category: 'llm',
    label: 'Cloudflare Workers AI',
    description: 'LLM via Cloudflare Workers AI.',
    adapterPackage: '@docket/llm-cloudflare-workers-ai',
    icon: '☁️',
    defaultConfig: { accountId: '', apiToken: '', model: '@cf/meta/llama-3.1-8b-instruct', timeout: 30000 },
    configSchema: [
      { key: 'accountId', label: 'Account ID', type: 'string', envVar: 'CF_ACCOUNT_ID' },
      { key: 'apiToken', label: 'API Token', type: 'string', secret: true, envVar: 'CF_API_TOKEN' },
      { key: 'model', label: 'Model', type: 'string', default: '@cf/meta/llama-3.1-8b-instruct', envVar: 'CF_LLM_MODEL' },
      { key: 'timeout', label: 'Timeout (ms)', type: 'number', default: 30000, envVar: 'CF_LLM_TIMEOUT' }
    ],
    ports: {
      in: [{ id: 'from-platform', label: 'Platform', accepts: ['platform'] }],
      out: []
    }
  },

  // ─────────────────────────────────────────────────────────────────────────────
  // Embedder adapters
  // ─────────────────────────────────────────────────────────────────────────────
  {
    id: 'ollama-embedder',
    providerKey: 'ollama',
    category: 'embedder',
    label: 'Ollama',
    description: 'Local embeddings via Ollama.',
    adapterPackage: '@docket/embedder-ollama',
    icon: '🦙',
    defaultConfig: { baseUrl: 'http://localhost:11434', model: 'nomic-embed-text', dimensions: 768 },
    configSchema: [
      { key: 'baseUrl', label: 'Base URL', type: 'string', default: 'http://localhost:11434', envVar: 'OLLAMA_BASE_URL' },
      { key: 'model', label: 'Model', type: 'string', default: 'nomic-embed-text', envVar: 'OLLAMA_EMBED_MODEL' },
      { key: 'dimensions', label: 'Dimensions', type: 'number', default: 768, envVar: 'OLLAMA_EMBED_DIMENSIONS' }
    ],
    requires: ['ollama'],
    ports: {
      in: [{ id: 'from-platform', label: 'Platform', accepts: ['platform'] }],
      out: []
    }
  },
  {
    id: 'openai-embedder',
    providerKey: 'openai',
    category: 'embedder',
    label: 'OpenAI',
    description: 'OpenAI-compatible embeddings.',
    adapterPackage: '@docket/embedder-openai-compatible',
    icon: '✨',
    defaultConfig: { baseUrl: 'https://api.openai.com/v1', apiKey: '', model: 'text-embedding-3-small', dimensions: 1536, timeout: 30000 },
    configSchema: [
      { key: 'baseUrl', label: 'Base URL', type: 'string', default: 'https://api.openai.com/v1', envVar: 'OPENAI_BASE_URL' },
      { key: 'apiKey', label: 'API Key', type: 'string', secret: true, envVar: 'OPENAI_API_KEY' },
      { key: 'model', label: 'Model', type: 'string', default: 'text-embedding-3-small', envVar: 'OPENAI_EMBED_MODEL' },
      { key: 'dimensions', label: 'Dimensions', type: 'number', default: 1536, envVar: 'OPENAI_EMBED_DIMENSIONS' },
      { key: 'timeout', label: 'Timeout (ms)', type: 'number', default: 30000, envVar: 'OPENAI_EMBED_TIMEOUT' }
    ],
    ports: {
      in: [{ id: 'from-platform', label: 'Platform', accepts: ['platform'] }],
      out: []
    }
  },
  {
    id: 'lm-studio-embedder',
    providerKey: 'lm-studio',
    category: 'embedder',
    label: 'LM Studio',
    description: 'Local LM Studio embeddings.',
    adapterPackage: '@docket/embedder-openai-compatible',
    icon: '🏠',
    defaultConfig: { baseUrl: 'http://localhost:1234/v1', model: 'local-model', dimensions: 768, timeout: 30000 },
    configSchema: [
      { key: 'baseUrl', label: 'Base URL', type: 'string', default: 'http://localhost:1234/v1', envVar: 'LM_STUDIO_BASE_URL' },
      { key: 'model', label: 'Model', type: 'string', default: 'local-model', envVar: 'LM_STUDIO_EMBED_MODEL' },
      { key: 'dimensions', label: 'Dimensions', type: 'number', default: 768, envVar: 'LM_STUDIO_EMBED_DIMENSIONS' },
      { key: 'timeout', label: 'Timeout (ms)', type: 'number', default: 30000, envVar: 'LM_STUDIO_EMBED_TIMEOUT' }
    ],
    requires: ['lm-studio'],
    ports: {
      in: [{ id: 'from-platform', label: 'Platform', accepts: ['platform'] }],
      out: []
    }
  },
  {
    id: 'aws-bedrock-embedder',
    providerKey: 'aws-bedrock',
    category: 'embedder',
    label: 'AWS Bedrock',
    description: 'Embeddings via AWS Bedrock.',
    adapterPackage: '@docket/embedder-aws-bedrock',
    icon: '⚡',
    defaultConfig: { region: 'us-east-1', accessKeyId: '', secretAccessKey: '', model: 'amazon.titan-embed-text-v2:0', dimensions: 1024, timeout: 30000 },
    configSchema: [
      { key: 'region', label: 'Region', type: 'string', default: 'us-east-1', envVar: 'AWS_REGION' },
      { key: 'accessKeyId', label: 'Access Key ID', type: 'string', secret: true, envVar: 'AWS_ACCESS_KEY_ID' },
      { key: 'secretAccessKey', label: 'Secret Access Key', type: 'string', secret: true, envVar: 'AWS_SECRET_ACCESS_KEY' },
      { key: 'model', label: 'Model', type: 'string', default: 'amazon.titan-embed-text-v2:0', envVar: 'BEDROCK_EMBED_MODEL' },
      { key: 'dimensions', label: 'Dimensions', type: 'number', default: 1024, envVar: 'BEDROCK_EMBED_DIMENSIONS' },
      { key: 'timeout', label: 'Timeout (ms)', type: 'number', default: 30000, envVar: 'BEDROCK_EMBED_TIMEOUT' }
    ],
    installCommand: 'npm install @aws-sdk/client-bedrock-runtime',
    ports: {
      in: [{ id: 'from-platform', label: 'Platform', accepts: ['platform'] }],
      out: []
    }
  },
  {
    id: 'cloudflare-workers-ai-embedder',
    providerKey: 'cloudflare-workers-ai',
    category: 'embedder',
    label: 'Cloudflare Workers AI',
    description: 'Embeddings via Cloudflare Workers AI.',
    adapterPackage: '@docket/embedder-cloudflare-workers-ai',
    icon: '☁️',
    defaultConfig: { accountId: '', apiToken: '', model: '@cf/baai/bge-base-en-v1.5', dimensions: 768, timeout: 30000 },
    configSchema: [
      { key: 'accountId', label: 'Account ID', type: 'string', envVar: 'CF_ACCOUNT_ID' },
      { key: 'apiToken', label: 'API Token', type: 'string', secret: true, envVar: 'CF_API_TOKEN' },
      { key: 'model', label: 'Model', type: 'string', default: '@cf/baai/bge-base-en-v1.5', envVar: 'CF_EMBED_MODEL' },
      { key: 'dimensions', label: 'Dimensions', type: 'number', default: 768, envVar: 'CF_EMBED_DIMENSIONS' },
      { key: 'timeout', label: 'Timeout (ms)', type: 'number', default: 30000, envVar: 'CF_EMBED_TIMEOUT' }
    ],
    ports: {
      in: [{ id: 'from-platform', label: 'Platform', accepts: ['platform'] }],
      out: []
    }
  },

  // ─────────────────────────────────────────────────────────────────────────────
  // Store adapters
  // ─────────────────────────────────────────────────────────────────────────────
  {
    id: 'sqlite',
    providerKey: 'sqlite',
    category: 'store',
    label: 'SQLite',
    description: 'Local SQLite with sqlite-vec extension.',
    adapterPackage: '@docket/store-sqlite',
    icon: '🗄️',
    defaultConfig: { path: './data/docket.db', enableWAL: true, busyTimeout: 5000, vectorDimensions: 768 },
    configSchema: [
      { key: 'path', label: 'Database Path', type: 'string', default: './data/docket.db', envVar: 'SQLITE_PATH' },
      { key: 'enableWAL', label: 'Enable WAL', type: 'boolean', default: true, envVar: 'SQLITE_ENABLE_WAL' },
      { key: 'busyTimeout', label: 'Busy Timeout (ms)', type: 'number', default: 5000, envVar: 'SQLITE_BUSY_TIMEOUT' },
      { key: 'vectorDimensions', label: 'Vector Dimensions', type: 'number', default: 768, envVar: 'SQLITE_VECTOR_DIMENSIONS' }
    ],
    ports: {
      in: [{ id: 'from-platform', label: 'Platform', accepts: ['platform'] }],
      out: []
    }
  },
  {
    id: 'cloudflare-d1',
    providerKey: 'cloudflare-d1',
    category: 'store',
    label: 'Cloudflare D1',
    description: 'Cloudflare D1 database.',
    adapterPackage: '@docket/store-cloudflare-d1',
    icon: '☁️',
    defaultConfig: { accountId: '', databaseId: '', apiToken: '' },
    configSchema: [
      { key: 'accountId', label: 'Account ID', type: 'string', envVar: 'CF_ACCOUNT_ID' },
      { key: 'databaseId', label: 'Database ID', type: 'string', envVar: 'CF_D1_DATABASE_ID' },
      { key: 'apiToken', label: 'API Token', type: 'string', secret: true, envVar: 'CF_API_TOKEN' }
    ],
    ports: {
      in: [{ id: 'from-platform', label: 'Platform', accepts: ['platform'] }],
      out: []
    }
  },
  {
    id: 'dynamodb',
    providerKey: 'aws-dynamodb',
    category: 'store',
    label: 'AWS DynamoDB',
    description: 'AWS DynamoDB store.',
    adapterPackage: '@docket/store-dynamodb',
    icon: '⚡',
    defaultConfig: { region: 'us-east-1', tableName: 'docket', accessKeyId: '', secretAccessKey: '' },
    configSchema: [
      { key: 'region', label: 'Region', type: 'string', default: 'us-east-1', envVar: 'AWS_REGION' },
      { key: 'tableName', label: 'Table Name', type: 'string', default: 'docket', envVar: 'DYNAMODB_TABLE' },
      { key: 'accessKeyId', label: 'Access Key ID', type: 'string', secret: true, envVar: 'AWS_ACCESS_KEY_ID' },
      { key: 'secretAccessKey', label: 'Secret Access Key', type: 'string', secret: true, envVar: 'AWS_SECRET_ACCESS_KEY' }
    ],
    installCommand: 'npm install @aws-sdk/client-dynamodb @aws-sdk/lib-dynamodb',
    ports: {
      in: [{ id: 'from-platform', label: 'Platform', accepts: ['platform'] }],
      out: []
    }
  },

  // ─────────────────────────────────────────────────────────────────────────────
  // Blob adapters
  // ─────────────────────────────────────────────────────────────────────────────
  {
    id: 'filesystem',
    providerKey: 'filesystem',
    category: 'blob',
    label: 'Filesystem',
    description: 'Local filesystem blob storage.',
    adapterPackage: '@docket/blob-filesystem',
    icon: '📁',
    defaultConfig: { basePath: './data/blobs', maxFileSize: '100mb' },
    configSchema: [
      { key: 'basePath', label: 'Base Path', type: 'string', default: './data/blobs', envVar: 'BLOB_BASE_PATH' },
      { key: 'maxFileSize', label: 'Max File Size', type: 'string', default: '100mb', envVar: 'BLOB_MAX_FILE_SIZE' }
    ],
    ports: {
      in: [{ id: 'from-platform', label: 'Platform', accepts: ['platform'] }],
      out: []
    }
  },
  {
    id: 's3',
    providerKey: 'aws-s3',
    category: 'blob',
    label: 'AWS S3',
    description: 'AWS S3 blob storage.',
    adapterPackage: '@docket/blob-s3',
    icon: '⚡',
    defaultConfig: { endpoint: '', bucket: '', accessKeyId: '', secretAccessKey: '', region: '' },
    configSchema: [
      { key: 'endpoint', label: 'Endpoint', type: 'string', envVar: 'S3_ENDPOINT' },
      { key: 'bucket', label: 'Bucket', type: 'string', envVar: 'S3_BUCKET' },
      { key: 'accessKeyId', label: 'Access Key ID', type: 'string', secret: true, envVar: 'S3_ACCESS_KEY' },
      { key: 'secretAccessKey', label: 'Secret Access Key', type: 'string', secret: true, envVar: 'S3_SECRET_KEY' },
      { key: 'region', label: 'Region', type: 'string', envVar: 'S3_REGION' }
    ],
    installCommand: 'npm install @aws-sdk/client-s3',
    ports: {
      in: [{ id: 'from-platform', label: 'Platform', accepts: ['platform'] }],
      out: []
    }
  },

  // ─────────────────────────────────────────────────────────────────────────────
  // Queue adapters
  // ─────────────────────────────────────────────────────────────────────────────
  {
    id: 'memory',
    providerKey: 'in-memory',
    category: 'queue',
    label: 'In-Memory',
    description: 'Simple in-memory queue for local development.',
    adapterPackage: '@docket/queue-memory',
    icon: '🧠',
    defaultConfig: { maxConcurrent: 5, retryAttempts: 3, retryDelay: 1000 },
    configSchema: [
      { key: 'maxConcurrent', label: 'Max Concurrent', type: 'number', default: 5, envVar: 'QUEUE_MAX_CONCURRENT' },
      { key: 'retryAttempts', label: 'Retry Attempts', type: 'number', default: 3, envVar: 'QUEUE_RETRY_ATTEMPTS' },
      { key: 'retryDelay', label: 'Retry Delay (ms)', type: 'number', default: 1000, envVar: 'QUEUE_RETRY_DELAY' }
    ],
    ports: {
      in: [{ id: 'from-platform', label: 'Platform', accepts: ['platform'] }],
      out: []
    }
  },
  {
    id: 'sqs',
    providerKey: 'aws-sqs',
    category: 'queue',
    label: 'AWS SQS',
    description: 'AWS SQS queue.',
    adapterPackage: '@docket/queue-sqs',
    icon: '⚡',
    defaultConfig: { region: 'us-east-1', queueUrl: '', accessKeyId: '', secretAccessKey: '' },
    configSchema: [
      { key: 'region', label: 'Region', type: 'string', default: 'us-east-1', envVar: 'AWS_REGION' },
      { key: 'queueUrl', label: 'Queue URL', type: 'string', envVar: 'SQS_QUEUE_URL' },
      { key: 'accessKeyId', label: 'Access Key ID', type: 'string', secret: true, envVar: 'AWS_ACCESS_KEY_ID' },
      { key: 'secretAccessKey', label: 'Secret Access Key', type: 'string', secret: true, envVar: 'AWS_SECRET_ACCESS_KEY' }
    ],
    installCommand: 'npm install @aws-sdk/client-sqs',
    ports: {
      in: [{ id: 'from-platform', label: 'Platform', accepts: ['platform'] }],
      out: []
    }
  }
];

export function getAdapterById(id: string): AdapterEntry | undefined {
  return ADAPTER_REGISTRY.find((a) => a.id === id);
}

export function getAdaptersByCategory(category: AdapterCategory): AdapterEntry[] {
  return ADAPTER_REGISTRY.filter((a) => a.category === category);
}

export function getCategories(): AdapterCategory[] {
  return ['platform', 'llm', 'embedder', 'store', 'blob', 'queue'];
}

export const CATEGORY_LABELS: Record<AdapterCategory, string> = {
  platform: 'Platform',
  llm: 'LLM',
  embedder: 'Embedder',
  store: 'Store',
  blob: 'Blob',
  queue: 'Queue'
};

export const CATEGORY_COLORS: Record<AdapterCategory, string> = {
  platform: '#94a3b8',
  llm: '#a3e635',
  embedder: '#38bdf8',
  store: '#fbbf24',
  blob: '#e879f9',
  queue: '#22d3ee'
};
