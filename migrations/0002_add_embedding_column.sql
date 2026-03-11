-- Migration number: 0002 	 2026-03-11T16:42:49.347Z

-- Store embedding vectors in D1 so we can do cosine-similarity fallback
-- when Vectorize hasn't indexed the vectors yet (eventual consistency lag).
ALTER TABLE chunks ADD COLUMN embedding TEXT;
