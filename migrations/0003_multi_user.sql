-- Migration number: 0003    2026-03-11T00:00:00.000Z

-- Knowledge bases: named collections of documents that any user can create.
-- Every document belongs to exactly one knowledge base.
CREATE TABLE IF NOT EXISTS knowledge_bases (
  id         TEXT PRIMARY KEY,
  name       TEXT NOT NULL,
  owner_id   TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Add the uploading user's ID to each document for attribution
ALTER TABLE documents ADD COLUMN user_id TEXT NOT NULL DEFAULT 'legacy';

-- Link each document to its knowledge base
ALTER TABLE documents ADD COLUMN kb_id TEXT NOT NULL DEFAULT 'kb_general';

-- Perf indexes
CREATE INDEX IF NOT EXISTS idx_documents_user_id ON documents(user_id);
CREATE INDEX IF NOT EXISTS idx_documents_kb_id   ON documents(kb_id);
