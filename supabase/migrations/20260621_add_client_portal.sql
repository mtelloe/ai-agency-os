-- Client portal fields on empresas
ALTER TABLE empresas
  ADD COLUMN IF NOT EXISTS portal_slug   TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS portal_pin    TEXT,
  ADD COLUMN IF NOT EXISTS portal_fases  JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS portal_facturas JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS portal_notas  TEXT;

-- Index for fast slug lookup
CREATE INDEX IF NOT EXISTS idx_empresas_portal_slug ON empresas (portal_slug);
