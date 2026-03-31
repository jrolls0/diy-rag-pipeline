# DIY RAG Pipeline on Cloudflare

A full-stack Retrieval-Augmented Generation (RAG) application built entirely on the Cloudflare Developer Platform. Upload documents, ask questions, and get AI-powered answers grounded in your content.

**Live demo:** [diy-rag-pipeline.jeremy-enterprise-account.workers.dev](https://diy-rag-pipeline.jeremy-enterprise-account.workers.dev/)

## Architecture

| Cloudflare Product | Role |
|---|---|
| **Workers** | Serverless API and frontend serving |
| **R2** | Raw document file storage |
| **D1** | Document metadata, text chunks, and embeddings |
| **Vectorize** | Semantic vector search index |
| **Workers AI** | Embedding model (bge-base-en-v1.5) + LLM (Llama 3.1 8B) |
| **AI Gateway** | Logging and observability for AI requests |
| **Durable Objects** | Per-user, per-KB conversation history |
| **Cloudflare Access** | Authentication (Zero Trust identity) |

The app includes an **interactive architecture diagram** that visually walks through how each product is used in the upload and query pipelines.

## Features

- **Multi-user support** with Cloudflare Access authentication
- **Knowledge bases** (personal and shared) for organizing documents
- **Token-by-token streaming** responses via Server-Sent Events
- **Real-time activity panel** showing each pipeline step as it executes
- **Interactive architecture diagram** explaining every Cloudflare product used
- **Conversation history** persisted in Durable Objects across page reloads

## Prerequisites

- A Cloudflare account with access to Workers, R2, D1, Vectorize, Workers AI, and Durable Objects
- [Node.js](https://nodejs.org/) (v18+)
- [Wrangler CLI](https://developers.cloudflare.com/workers/wrangler/) (`npm install -g wrangler`)

## Setup

### 1. Clone and install

```bash
git clone https://github.com/jrolls0/diy-rag-pipeline.git
cd diy-rag-pipeline
npm install
```

### 2. Create Cloudflare resources

```bash
# Create the D1 database
npx wrangler d1 create rag-db
# Copy the database_id from the output into wrangler.toml

# Create the R2 bucket
npx wrangler r2 bucket create rag-documents

# Create the Vectorize index (768 dimensions for bge-base-en-v1.5)
npx wrangler vectorize create rag-vectors-v2 --dimensions=768 --metric=cosine

# Create the AI Gateway in the Cloudflare dashboard
# Name it "rag-gateway"
```

### 3. Update wrangler.toml

Replace the placeholder values:
- `account_id` with your Cloudflare account ID
- `database_id` with the ID from `wrangler d1 create` output

### 4. Run database migrations

```bash
npx wrangler d1 migrations apply rag-db --remote
```

### 5. Configure authentication (optional)

The app reads `Cf-Access-Authenticated-User-Email` headers set by [Cloudflare Access](https://developers.cloudflare.com/cloudflare-one/applications/). To enable multi-user support, place a Cloudflare Access policy in front of your Worker.

Without Access configured, the app defaults to a single anonymous user.

### 6. Deploy

```bash
npx wrangler deploy
```

## Local development

```bash
npx wrangler dev
```

Note: Some bindings (Vectorize, AI Gateway, Durable Objects) require `--remote` flag for full functionality:

```bash
npx wrangler dev --remote
```

## Project structure

```
src/
  index.ts          # Main Worker entry point and routing
  query.ts          # RAG query pipeline (embed, search, generate)
  upload.ts         # Document upload pipeline (parse, chunk, embed, index)
  session.ts        # Durable Object for conversation history
  frontend.ts       # Single-file HTML/CSS/JS frontend
  architecture.ts   # Interactive architecture diagram page
  kb.ts             # Knowledge base CRUD operations
  documents.ts      # Document listing and deletion
  auth.ts           # Cloudflare Access user extraction
  types.ts          # Shared TypeScript types
  utils.ts          # Utility functions
migrations/
  0001_init.sql           # Initial schema (documents, chunks)
  0002_add_embedding.sql  # Embedding column for D1 fallback
  0003_multi_user.sql     # Multi-user and KB support
  0004_personal_kb.sql    # Personal KB flag
wrangler.toml       # Cloudflare Workers configuration
```

## How it works

### Upload pipeline
1. File uploaded to Worker
2. Raw file stored in R2
3. Text extracted and chunked, metadata saved in D1
4. Chunks embedded via Workers AI (bge-base-en-v1.5)
5. Vectors indexed in Vectorize

### Query pipeline
1. Question embedded via Workers AI
2. Conversation history loaded from Durable Object (parallel)
3. Semantic search in Vectorize (D1 cosine fallback if needed)
4. LLM generates grounded answer via Workers AI (Llama 3.1 8B)
5. Response streamed token-by-token to the browser
6. Conversation saved to Durable Object

## License

MIT
