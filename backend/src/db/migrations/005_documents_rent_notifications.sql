-- 005: Documents, Rent Deals, Notifications, Approvals

CREATE TYPE doc_type AS ENUM ('kpp', 'scenario', 'callsheet');

CREATE TABLE documents (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id   UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  type         doc_type NOT NULL,
  version      INT NOT NULL DEFAULT 1,
  file_url     TEXT NOT NULL,
  parsed_data  JSONB,
  delta        JSONB,
  uploaded_by  UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TYPE rent_type AS ENUM ('out', 'in');
CREATE TYPE rent_status AS ENUM ('active', 'done', 'overdue', 'cancelled');
CREATE TYPE counterparty_type AS ENUM ('person', 'company');

CREATE TABLE rent_deals (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  type                rent_type NOT NULL,
  counterparty_name   TEXT NOT NULL,
  counterparty_type   counterparty_type NOT NULL DEFAULT 'person',
  counterparty_contact TEXT,
  counterparty_email  TEXT,
  unit_ids            UUID[] NOT NULL,
  period_start        DATE NOT NULL,
  period_end          DATE NOT NULL,
  price_total         NUMERIC(12,2),
  status              rent_status NOT NULL DEFAULT 'active',
  signature_url       TEXT,
  contract_pdf_url    TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TYPE notification_type AS ENUM (
  'overdue', 'damage', 'new_request', 'status_change', 'new_version', 'deadline'
);

CREATE TYPE entity_type AS ENUM ('unit', 'request', 'document');

CREATE TABLE notifications (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type        notification_type NOT NULL,
  text        TEXT NOT NULL,
  entity_id   UUID,
  entity_type entity_type,
  read        BOOLEAN NOT NULL DEFAULT FALSE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TYPE approval_action AS ENUM ('add', 'edit');
CREATE TYPE approval_status AS ENUM ('pending', 'approved', 'rejected');

CREATE TABLE approvals (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  unit_id     UUID NOT NULL REFERENCES units(id) ON DELETE CASCADE,
  proposed_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  action      approval_action NOT NULL,
  new_data    JSONB,
  status      approval_status NOT NULL DEFAULT 'pending',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE recover_codes (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email      TEXT NOT NULL,
  code       TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  used       BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_documents_project    ON documents(project_id);
CREATE INDEX idx_documents_type       ON documents(type);
CREATE INDEX idx_rent_status          ON rent_deals(status);
CREATE INDEX idx_rent_period_end      ON rent_deals(period_end);
CREATE INDEX idx_notifications_user   ON notifications(user_id);
CREATE INDEX idx_notifications_read   ON notifications(user_id, read);
CREATE INDEX idx_approvals_unit       ON approvals(unit_id);
CREATE INDEX idx_approvals_status     ON approvals(status);
CREATE INDEX idx_recover_email        ON recover_codes(email);
