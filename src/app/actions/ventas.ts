'use server';

import { createClient } from '@/lib/supabase/server';
import type { EmailTemplateRow } from '@/lib/types/database';

// ─── launchCampaign ───────────────────────────────────────────────────────────

export interface LaunchCampaignParams {
  templateSlug: string;
  subject: string;
  body: string;
  workspaceId: string;
  searchCriteria: {
    q_organization_industries: string[];
    person_titles: string[];
    person_locations: string[];
    per_page: number;
  };
}

export async function launchCampaign(
  params: LaunchCampaignParams,
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: 'No autenticado' };

  // Upsert template so the orchestrator can load it by slug
  const { error: tplError } = await supabase.from('email_templates').upsert(
    {
      workspace_id: params.workspaceId,
      slug: params.templateSlug,
      name: params.templateSlug,
      subject: params.subject,
      body_text: params.body,
      body_html: null,
      variables: ['nombre', 'empresa', 'cargo'],
      active: true,
    },
    { onConflict: 'workspace_id,slug' },
  );
  if (tplError) return { success: false, error: `Template: ${tplError.message}` };

  // Call Sales Orchestrator
  let res: Response;
  try {
    res = await fetch(
      `${process.env.SALES_ORCHESTRATOR_URL}/api/prospect`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${process.env.SALES_ORCHESTRATOR_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          templateSlug: params.templateSlug,
          searchCriteria: params.searchCriteria,
        }),
      },
    );
  } catch (err) {
    return { success: false, error: `Orchestrator unreachable: ${(err as Error).message}` };
  }

  if (!res.ok) {
    const text = await res.text();
    return { success: false, error: `Orchestrator ${res.status}: ${text}` };
  }

  return { success: true };
}

// ─── toggleAgent ─────────────────────────────────────────────────────────────

export async function toggleAgent(
  agentId: string,
  active: boolean,
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: 'No autenticado' };

  const newStatus = active ? 'active' : 'paused';
  const { error } = await supabase
    .from('agents')
    .update({ status: newStatus })
    .eq('id', agentId);

  if (error) return { success: false, error: error.message };
  return { success: true };
}

// ─── saveTemplate ─────────────────────────────────────────────────────────────

export async function saveTemplate(
  template: Pick<EmailTemplateRow, 'id' | 'slug' | 'subject' | 'body_text' | 'workspace_id'>,
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: 'No autenticado' };

  const { error } = await supabase
    .from('email_templates')
    .update({ subject: template.subject, body_text: template.body_text })
    .eq('id', template.id)
    .eq('workspace_id', template.workspace_id);

  if (error) return { success: false, error: error.message };
  return { success: true };
}
