-- 006: Public warehouse link tokens
CREATE TABLE public_tokens (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  token        TEXT NOT NULL UNIQUE,
  created_by   UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at   TIMESTAMPTZ NOT NULL DEFAULT NOW() + INTERVAL '30 days'
);

CREATE INDEX idx_public_tokens_token ON public_tokens(token);
