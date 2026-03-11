-- Migration number: 0004    2026-03-11T00:00:00.000Z

-- Add a flag to distinguish private personal KBs from shared named KBs.
-- is_personal = 1 → only visible to the owner
-- is_personal = 0 → visible to all users (read-only for non-owners)
ALTER TABLE knowledge_bases ADD COLUMN is_personal INTEGER NOT NULL DEFAULT 0;

-- Mark any existing auto-created personal KBs (name ends with "'s Personal KB")
UPDATE knowledge_bases SET is_personal = 1 WHERE name LIKE '%''s Personal KB';
