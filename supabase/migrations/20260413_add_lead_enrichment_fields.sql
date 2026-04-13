-- Adds decision-maker enrichment fields to leads table

ALTER TABLE leads ADD COLUMN IF NOT EXISTS decisor_nombre TEXT;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS decisor_cargo TEXT;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS decisor_email TEXT;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS decisor_movil TEXT;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS decisor_linkedin TEXT;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS enrichment_status TEXT DEFAULT 'pending'
  CHECK (enrichment_status IN ('pending', 'full', 'partial', 'no_contact'));
ALTER TABLE leads ADD COLUMN IF NOT EXISTS enrichment_source TEXT;
