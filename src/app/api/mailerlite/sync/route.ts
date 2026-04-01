import { NextRequest, NextResponse } from 'next/server';
import { createApiClient, getTokenFromRequest } from '@/lib/supabase/api-client';
import { addSubscriber, findOrCreateGroup, isConfigured } from '@/lib/email/mailerlite';

export async function POST(request: NextRequest) {
  try {
    const token = getTokenFromRequest(request);
    if (!token) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    if (!isConfigured()) {
      return NextResponse.json({ error: 'MailerLite no configurado' }, { status: 503 });
    }

    const db = createApiClient(token);
    const { leadId, workspaceId, syncAll } = await request.json();

    if (!workspaceId) {
      return NextResponse.json({ error: 'workspaceId es requerido' }, { status: 400 });
    }

    // Get workspace name for group
    const { data: workspace, error: wsError } = await db
      .from('workspaces')
      .select('nombre')
      .eq('id', workspaceId)
      .single();

    if (wsError || !workspace) {
      return NextResponse.json({ error: 'Workspace no encontrado' }, { status: 404 });
    }

    // Find or create the MailerLite group
    const groupName = `AI Agency OS - ${workspace.nombre}`;
    const groupId = await findOrCreateGroup(groupName);
    const groups = groupId ? [groupId] : [];

    let synced = 0;
    let errors = 0;

    if (syncAll) {
      // Fetch all leads with email for this workspace
      const { data: leads, error: leadsError } = await db
        .from('leads')
        .select('*, empresas(nombre, nicho, website)')
        .eq('workspace_id', workspaceId)
        .not('email', 'is', null);

      if (leadsError) {
        return NextResponse.json({ error: 'Error al obtener leads' }, { status: 500 });
      }

      for (const lead of leads || []) {
        if (!lead.email) continue;

        const empresa = lead.empresas as { nombre?: string; nicho?: string; website?: string } | null;

        const result = await addSubscriber({
          email: lead.email,
          name: lead.nombre_contacto || undefined,
          fields: {
            company: empresa?.nombre || '',
            ...(empresa?.nicho ? { last_name: empresa.nicho } : {}),
            ...(lead.score != null ? { z_score: String(lead.score) } : {}),
            ...(lead.valor_estimado != null ? { z_valor_estimado: String(lead.valor_estimado) } : {}),
            ...(lead.estado_pipeline ? { z_estado_pipeline: lead.estado_pipeline } : {}),
          },
          groups,
        });

        if (result.success) {
          synced++;
        } else {
          errors++;
        }
      }
    } else if (leadId) {
      // Fetch single lead
      const { data: lead, error: leadError } = await db
        .from('leads')
        .select('*, empresas(nombre, nicho, website)')
        .eq('id', leadId)
        .eq('workspace_id', workspaceId)
        .single();

      if (leadError || !lead) {
        return NextResponse.json({ error: 'Lead no encontrado' }, { status: 404 });
      }

      if (!lead.email) {
        return NextResponse.json({ error: 'El lead no tiene email' }, { status: 400 });
      }

      const empresa = lead.empresas as { nombre?: string; nicho?: string; website?: string } | null;

      const result = await addSubscriber({
        email: lead.email,
        name: lead.nombre_contacto || undefined,
        fields: {
          company: empresa?.nombre || '',
          ...(empresa?.nicho ? { last_name: empresa.nicho } : {}),
          ...(lead.score != null ? { z_score: String(lead.score) } : {}),
          ...(lead.valor_estimado != null ? { z_valor_estimado: String(lead.valor_estimado) } : {}),
          ...(lead.estado_pipeline ? { z_estado_pipeline: lead.estado_pipeline } : {}),
        },
        groups,
      });

      if (result.success) {
        synced = 1;
      } else {
        errors = 1;
      }
    } else {
      return NextResponse.json({ error: 'Se requiere leadId o syncAll: true' }, { status: 400 });
    }

    return NextResponse.json({ synced, errors });
  } catch (error) {
    console.error('MailerLite sync error:', error);
    return NextResponse.json(
      { error: 'Error al sincronizar con MailerLite' },
      { status: 500 }
    );
  }
}
