-- Sales Orchestrator Phase 2: outreach (contactes descoberts, plantilles d'email, log d'enviaments)

-- ============================================================
-- outreach_contacts: leads descoberts via Apollo + Hunter
-- ============================================================
CREATE TABLE IF NOT EXISTS outreach_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT NOT NULL,
  email_status TEXT NOT NULL DEFAULT 'unknown'
    CHECK (email_status IN ('valid', 'invalid', 'accept_all', 'unknown')),
  title TEXT,
  company_name TEXT,
  company_domain TEXT,
  company_size_range TEXT,           -- e.g. "1,50"
  industry TEXT,
  apollo_id TEXT UNIQUE,             -- dedup across runs
  hunter_score INT,                  -- 0-100 confidence score from Hunter
  source TEXT NOT NULL DEFAULT 'apollo',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_outreach_contacts_workspace ON outreach_contacts(workspace_id);
CREATE INDEX IF NOT EXISTS idx_outreach_contacts_email ON outreach_contacts(email);
CREATE INDEX IF NOT EXISTS idx_outreach_contacts_apollo_id ON outreach_contacts(apollo_id) WHERE apollo_id IS NOT NULL;

-- ============================================================
-- email_templates: plantilles editables sense redeploy
-- ============================================================
CREATE TABLE IF NOT EXISTS email_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  slug TEXT NOT NULL,
  name TEXT NOT NULL,
  subject TEXT NOT NULL,
  body_text TEXT NOT NULL,           -- versió text pla
  body_html TEXT,                    -- versió HTML opcional
  variables JSONB NOT NULL DEFAULT '[]'::jsonb,  -- array de noms de variable
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (workspace_id, slug)
);

-- ============================================================
-- outreach_log: una fila per intent d'enviament per contacte
-- ============================================================
CREATE TABLE IF NOT EXISTS outreach_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  contact_id UUID NOT NULL REFERENCES outreach_contacts(id) ON DELETE CASCADE,
  template_id UUID NOT NULL REFERENCES email_templates(id) ON DELETE RESTRICT,
  agent_execution_id UUID REFERENCES agent_executions(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'sent', 'failed', 'bounced', 'replied')),
  gmail_message_id TEXT,             -- de la resposta de l'API de Gmail
  error TEXT,
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (contact_id, template_id)   -- prevenir enviaments duplicats
);

CREATE INDEX IF NOT EXISTS idx_outreach_log_workspace ON outreach_log(workspace_id);
CREATE INDEX IF NOT EXISTS idx_outreach_log_contact ON outreach_log(contact_id);
CREATE INDEX IF NOT EXISTS idx_outreach_log_status ON outreach_log(status);
CREATE INDEX IF NOT EXISTS idx_outreach_log_sent_at ON outreach_log(sent_at DESC);

-- ============================================================
-- RLS: activar seguretat a nivell de fila
-- ============================================================
ALTER TABLE outreach_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE outreach_log ENABLE ROW LEVEL SECURITY;

-- Polítiques SELECT per workspace propi
CREATE POLICY "outreach_contacts_select_own_workspace" ON outreach_contacts
  FOR SELECT USING (
    workspace_id IN (SELECT workspace_id FROM users_profile WHERE id = auth.uid())
  );

CREATE POLICY "email_templates_select_own_workspace" ON email_templates
  FOR SELECT USING (
    workspace_id IN (SELECT workspace_id FROM users_profile WHERE id = auth.uid())
  );

CREATE POLICY "outreach_log_select_own_workspace" ON outreach_log
  FOR SELECT USING (
    workspace_id IN (SELECT workspace_id FROM users_profile WHERE id = auth.uid())
  );

-- ============================================================
-- Triggers updated_at per outreach_contacts i email_templates
-- (reutilitzem la funció creada a 20260414_add_agents_tables.sql)
-- ============================================================
DROP TRIGGER IF EXISTS trg_outreach_contacts_updated ON outreach_contacts;
CREATE TRIGGER trg_outreach_contacts_updated
  BEFORE UPDATE ON outreach_contacts
  FOR EACH ROW EXECUTE FUNCTION update_agent_updated_at();

DROP TRIGGER IF EXISTS trg_email_templates_updated ON email_templates;
CREATE TRIGGER trg_email_templates_updated
  BEFORE UPDATE ON email_templates
  FOR EACH ROW EXECUTE FUNCTION update_agent_updated_at();
