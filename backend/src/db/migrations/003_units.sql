-- 003: Units and Photos

CREATE TYPE unit_status AS ENUM (
  'on_stock',
  'issued',
  'overdue',
  'pending',
  'written_off'
);

CREATE TABLE units (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name         TEXT NOT NULL,
  category     TEXT NOT NULL,
  serial       TEXT,
  warehouse_id UUID REFERENCES warehouses(id) ON DELETE SET NULL,
  cell_id      UUID REFERENCES cells(id) ON DELETE SET NULL,
  status       unit_status NOT NULL DEFAULT 'pending',
  description  TEXT,
  qty          INT  NOT NULL DEFAULT 1,
  condition    TEXT,
  valuation    NUMERIC(12,2),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TYPE photo_type AS ENUM ('issue', 'return', 'stock');

CREATE TABLE unit_photos (
  id       UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  unit_id  UUID NOT NULL REFERENCES units(id) ON DELETE CASCADE,
  url      TEXT NOT NULL,
  type     photo_type NOT NULL DEFAULT 'stock',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_units_warehouse_id ON units(warehouse_id);
CREATE INDEX idx_units_status       ON units(status);
CREATE INDEX idx_units_category     ON units(category);
CREATE INDEX idx_unit_photos_unit   ON unit_photos(unit_id);
