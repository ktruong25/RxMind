-- Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- ── Users / Auth ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email        TEXT UNIQUE NOT NULL,
  password_hash TEXT,                   -- null when using Clerk SSO
  role         TEXT NOT NULL DEFAULT 'tech' CHECK (role IN ('admin','tech')),
  clerk_id     TEXT UNIQUE,
  first_name   TEXT,
  last_name    TEXT,
  phone        TEXT,
  active       BOOLEAN NOT NULL DEFAULT TRUE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Patients ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS patients (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  external_id     TEXT,                 -- PMS system patient ID
  first_name      TEXT NOT NULL,
  last_name       TEXT NOT NULL,
  dob             DATE,
  gender          TEXT,
  phone           TEXT,
  email           TEXT,
  address         JSONB,
  insurance_info  JSONB,
  allergy_list    TEXT[],
  notes           TEXT,
  active          BOOLEAN NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_patients_name ON patients USING gin(
  (first_name || ' ' || last_name) gin_trgm_ops
);
CREATE INDEX IF NOT EXISTS idx_patients_external ON patients(external_id);

-- ── Products (NDC catalog) ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS products (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ndc             TEXT UNIQUE NOT NULL,
  brand_name      TEXT,
  generic_name    TEXT NOT NULL,
  labeler         TEXT,
  dosage_form     TEXT,
  route           TEXT,
  strength        TEXT,
  package_size    TEXT,
  dea_schedule    TEXT,
  active          BOOLEAN NOT NULL DEFAULT TRUE,
  fda_data        JSONB,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_products_ndc ON products(ndc);
CREATE INDEX IF NOT EXISTS idx_products_name ON products USING gin(generic_name gin_trgm_ops);

-- ── Inventory ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS inventory (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id      UUID NOT NULL REFERENCES products(id),
  lot_number      TEXT,
  expiry_date     DATE NOT NULL,
  quantity        INTEGER NOT NULL DEFAULT 0,
  cost_per_unit   NUMERIC(10,4),
  location        TEXT,
  status          TEXT NOT NULL DEFAULT 'active'
                    CHECK (status IN ('active','pulled','returned','disposed')),
  scanned_by      UUID REFERENCES users(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_inventory_expiry ON inventory(expiry_date);
CREATE INDEX IF NOT EXISTS idx_inventory_product ON inventory(product_id);
CREATE INDEX IF NOT EXISTS idx_inventory_status ON inventory(status);

-- ── Pull requests ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS pulls (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  inventory_id    UUID NOT NULL REFERENCES inventory(id),
  pulled_by       UUID REFERENCES users(id),
  reason          TEXT NOT NULL CHECK (reason IN ('expiry','damage','recall','return')),
  quantity        INTEGER NOT NULL,
  wholesaler      TEXT,
  return_tracking TEXT,
  credit_amount   NUMERIC(10,2),
  status          TEXT NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending','shipped','credited','disposed')),
  notes           TEXT,
  pulled_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Alerts ────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS alerts (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  inventory_id    UUID REFERENCES inventory(id),
  patient_id      UUID REFERENCES patients(id),
  type            TEXT NOT NULL CHECK (type IN (
                    'expiry_90','expiry_60','expiry_30','expired',
                    'non_adherent','claim_rejected','mtm_opportunity'
                  )),
  severity        TEXT NOT NULL DEFAULT 'medium'
                    CHECK (severity IN ('low','medium','high','critical')),
  title           TEXT NOT NULL,
  body            TEXT,
  acknowledged    BOOLEAN NOT NULL DEFAULT FALSE,
  acknowledged_by UUID REFERENCES users(id),
  acknowledged_at TIMESTAMPTZ,
  notified_sms    BOOLEAN NOT NULL DEFAULT FALSE,
  notified_email  BOOLEAN NOT NULL DEFAULT FALSE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_alerts_type ON alerts(type);
CREATE INDEX IF NOT EXISTS idx_alerts_ack ON alerts(acknowledged);

-- ── Prescriptions ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS prescriptions (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  patient_id      UUID NOT NULL REFERENCES patients(id),
  product_id      UUID REFERENCES products(id),
  ndc             TEXT,
  prescriber_name TEXT,
  prescriber_npi  TEXT,
  rx_number       TEXT UNIQUE,
  days_supply     INTEGER,
  quantity        NUMERIC(10,3),
  refills_remaining INTEGER DEFAULT 0,
  sig             TEXT,
  written_date    DATE,
  last_fill_date  DATE,
  next_fill_due   DATE,
  status          TEXT NOT NULL DEFAULT 'active'
                    CHECK (status IN ('active','inactive','expired','transferred')),
  external_id     TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_rx_patient ON prescriptions(patient_id);
CREATE INDEX IF NOT EXISTS idx_rx_next_fill ON prescriptions(next_fill_due);

-- ── Claims ────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS claims (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  patient_id      UUID NOT NULL REFERENCES patients(id),
  prescription_id UUID REFERENCES prescriptions(id),
  rx_number       TEXT,
  ndc             TEXT,
  bin             TEXT,
  pcn             TEXT,
  group_id        TEXT,
  member_id       TEXT,
  reject_code     TEXT,
  reject_message  TEXT,
  submitted_at    TIMESTAMPTZ,
  adjudicated_at  TIMESTAMPTZ,
  status          TEXT NOT NULL DEFAULT 'rejected'
                    CHECK (status IN ('rejected','pending','resolved','ignored')),
  resolution_note TEXT,
  resolved_by     UUID REFERENCES users(id),
  resolved_at     TIMESTAMPTZ,
  ai_fix_suggestion TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_claims_status ON claims(status);
CREATE INDEX IF NOT EXISTS idx_claims_patient ON claims(patient_id);

-- ── MTM ───────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS mtm_opportunities (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  patient_id      UUID NOT NULL REFERENCES patients(id),
  type            TEXT NOT NULL CHECK (type IN (
                    'cmt','imt','tmo','annual_review','adherence'
                  )),
  status          TEXT NOT NULL DEFAULT 'open'
                    CHECK (status IN ('open','scheduled','completed','declined','billed')),
  billable_code   TEXT,
  billable_amount NUMERIC(10,2),
  notes           TEXT,
  completed_by    UUID REFERENCES users(id),
  completed_at    TIMESTAMPTZ,
  scheduled_at    TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_mtm_patient ON mtm_opportunities(patient_id);
CREATE INDEX IF NOT EXISTS idx_mtm_status ON mtm_opportunities(status);

-- ── Audit Log ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS audit_log (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID REFERENCES users(id),
  clerk_id        TEXT,
  action          TEXT NOT NULL,         -- 'read', 'create', 'update', 'delete'
  resource        TEXT NOT NULL,         -- table name
  resource_id     TEXT,
  patient_id      UUID REFERENCES patients(id),
  ip_address      TEXT,
  user_agent      TEXT,
  request_path    TEXT,
  request_method  TEXT,
  changes         JSONB,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_user ON audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_patient ON audit_log(patient_id);
CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_log(created_at);

-- ── PMS Sync Log ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS pms_sync_log (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  adapter         TEXT NOT NULL,         -- 'pioneerrx', 'csv'
  status          TEXT NOT NULL CHECK (status IN ('success','error','partial')),
  records_synced  INTEGER DEFAULT 0,
  records_failed  INTEGER DEFAULT 0,
  error_details   JSONB,
  started_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  finished_at     TIMESTAMPTZ
);
