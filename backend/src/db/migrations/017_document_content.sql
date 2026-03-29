-- 017: Document structured content, matched units, status

ALTER TABLE documents ADD COLUMN IF NOT EXISTS parsed_content JSONB;
ALTER TABLE documents ADD COLUMN IF NOT EXISTS matched_units JSONB;
ALTER TABLE documents ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'uploaded';
ALTER TABLE documents ADD COLUMN IF NOT EXISTS original_name TEXT;

-- file_url becomes optional (we keep it for backward compat but no longer require it)
ALTER TABLE documents ALTER COLUMN file_url DROP NOT NULL;

CREATE INDEX idx_documents_status ON documents(status);
