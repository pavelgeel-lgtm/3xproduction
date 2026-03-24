-- 004: Unit History, Invites, Requests, Issuances, Returns, Extensions

CREATE TABLE unit_history (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  unit_id     UUID NOT NULL REFERENCES units(id) ON DELETE CASCADE,
  action      TEXT NOT NULL,
  user_id     UUID REFERENCES users(id) ON DELETE SET NULL,
  project_id  UUID REFERENCES projects(id) ON DELETE SET NULL,
  notes       TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE invites (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  token          TEXT NOT NULL UNIQUE,
  role           TEXT NOT NULL,
  project_id     UUID REFERENCES projects(id) ON DELETE CASCADE,
  warehouse_zone TEXT,
  used           BOOLEAN NOT NULL DEFAULT FALSE,
  created_by     UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TYPE request_status AS ENUM ('new', 'collecting', 'ready', 'issued', 'cancelled');

CREATE TABLE requests (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  unit_ids     UUID[] NOT NULL,
  requester_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  warehouse_id UUID REFERENCES warehouses(id) ON DELETE SET NULL,
  status       request_status NOT NULL DEFAULT 'new',
  deadline     DATE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE issuances (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  request_id    UUID REFERENCES requests(id) ON DELETE SET NULL,
  issued_by     UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  received_by   UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  signature_url TEXT,
  act_pdf_url   TEXT,
  issued_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deadline      DATE NOT NULL
);

CREATE TABLE returns (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  issuance_id      UUID NOT NULL REFERENCES issuances(id) ON DELETE RESTRICT,
  returned_by      UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  accepted_by      UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  condition_notes  TEXT,
  signature_url    TEXT,
  act_pdf_url      TEXT,
  returned_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE extensions (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  issuance_id         UUID NOT NULL REFERENCES issuances(id) ON DELETE RESTRICT,
  new_deadline        DATE NOT NULL,
  initiator_signature TEXT,
  acceptor_signature  TEXT,
  photos              TEXT[],
  extended_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_unit_history_unit    ON unit_history(unit_id);
CREATE INDEX idx_requests_requester   ON requests(requester_id);
CREATE INDEX idx_requests_status      ON requests(status);
CREATE INDEX idx_issuances_request    ON issuances(request_id);
CREATE INDEX idx_issuances_deadline   ON issuances(deadline);
CREATE INDEX idx_returns_issuance     ON returns(issuance_id);
