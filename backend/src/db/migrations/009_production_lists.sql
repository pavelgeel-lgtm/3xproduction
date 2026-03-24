CREATE TABLE IF NOT EXISTS production_lists (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  user_id    UUID REFERENCES users(id) ON DELETE CASCADE,
  type       TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (project_id, user_id, type)
);

CREATE TABLE IF NOT EXISTS production_list_items (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  list_id    UUID NOT NULL REFERENCES production_lists(id) ON DELETE CASCADE,
  name       TEXT NOT NULL,
  scene      TEXT,
  day        TEXT,
  time       TEXT,
  location   TEXT,
  qty        INTEGER NOT NULL DEFAULT 1,
  source     TEXT NOT NULL DEFAULT 'manual',
  note       TEXT,
  ai_status  TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
