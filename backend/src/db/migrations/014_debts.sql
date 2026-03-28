CREATE TABLE IF NOT EXISTS debts (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES users(id),
  unit_id     UUID NOT NULL REFERENCES units(id),
  issuance_id UUID REFERENCES issuances(id),
  project_id  UUID REFERENCES projects(id),
  reason      TEXT,
  status      TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed')),
  closed_at   TIMESTAMPTZ,
  closed_by   UUID REFERENCES users(id),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_debts_user ON debts(user_id);
CREATE INDEX IF NOT EXISTS idx_debts_status ON debts(status);
