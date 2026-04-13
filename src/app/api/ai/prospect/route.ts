import { NextRequest, NextResponse } from 'next/server';
import { createApiClient, getTokenFromRequest } from '@/lib/supabase/api-client';
import { spendCredit, logActivity } from '@/lib/credits';
import { triggerN8nWebhook, isN8nConfigured } from '@/lib/n8n/client';
import { searchGoogleMaps } from '@/lib/google-maps';

export async function POST(request: NextRequest) {
  try {
    const token = getTokenFromRequest(request);
    if (!token) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });

    const db = createApiClient(token);
    const body = await request.json();
    const { nicho, ciudad, workspaceId, userId } = body;
    const cantidad = Math.min(Math.max(1, Number(body.cantidad) || 5), 20);

    if (!nicho || !ciudad || !workspaceId || !userId) {
      return NextResponse.json({ error: 'Faltan campos requeridos' }, { status: 400 });
    }

    if (typeof nicho !== 'string' || nicho.length > 200 || typeof ciudad !== 'string' || ciudad.length > 200) {
      return NextResponse.json({ error: 'Datos de entrada invalidos' }, { status: 400 });
    }

    // Spend 2 credits
    const spent1 = await spendCredit(workspaceId, userId, 'prospeccion', `Prospeccion: ${nicho} en ${ciudad}`, token);
    if (!spent1) return NextResponse.json({ error: 'No tienes creditos suficientes' }, { status: 402 });
    const spent2 = await spendCredit(workspaceId, userId, 'prospeccion', `Prospeccion (2/2): ${nicho} en ${ciudad}`, token);
    if (!spent2) return NextResponse.json({ error: 'No tienes creditos suficientes' }, { status: 402 });

    // If n8n is configured, use the async pipeline (Apify + Apollo enrichment)
    if (isN8nConfigured()) {
      await triggerN8nWebhook('prospect-enrich', {
        workspace_id: workspaceId,
        nicho,
        ciudad,
        cantidad,
        callback_url: `${process.env.BASE_URL || process.env.NEXT_PUBLIC_APP_URL}/api/webhooks/n8n`,
      });

      await logActivity(
        workspaceId, userId, 'prospeccion_iniciada',
        `Prospeccion con enriquecimiento: ${nicho} en ${ciudad} (${cantidad} leads)`,
        token,
      );

      return NextResponse.json({
        message: 'Prospeccion iniciada. Los leads apareceran en el pipeline cuando esten listos.',
        status: 'processing',
        async: true,
      });
    }

    // Fallback: direct Apify call without Apollo enrichment (if n8n not configured)
    const { data: existingEmpresas } = await db
      .from('empresas')
      .select('nombre, website, telefono')
      .eq('workspace_id', workspaceId);

    const existingNames = (existingEmpresas || []).map(e => e.nombre || '');
    const existingWebsites = new Set(
      (existingEmpresas || []).filter(e => e.website).map(e => {
        try { return new URL(e.website!).hostname.replace('www.', '').toLowerCase(); }
        catch { return e.website!.toLowerCase().replace('www.', ''); }
      })
    );
    const existingPhones = new Set(
      (existingEmpresas || []).filter(e => e.telefono).map(e => e.telefono!.replace(/\s/g, ''))
    );

    const query = `${nicho} ${ciudad}`;
    const mapResults = await searchGoogleMaps(query, cantidad, existingNames);

    if (mapResults.length === 0) {
      return NextResponse.json({ error: 'No se encontraron negocios NUEVOS en Google Maps.' }, { status: 404 });
    }

    const createdLeads = [];

    for (const biz of mapResults) {
      if (biz.website) {
        try {
          const domain = new URL(biz.website).hostname.replace('www.', '').toLowerCase();
          if (existingWebsites.has(domain)) continue;
        } catch { /* skip */ }
      }
      if (biz.phone && existingPhones.has(biz.phone.replace(/\s/g, ''))) continue;

      let score = 70;
      if (!biz.website) score += 15;
      if ((biz.reviewsCount || 0) < 20) score += 5;
      if ((biz.totalScore || 5) < 4.5) score += 5;
      score = Math.min(95, Math.max(60, score));

      const valor = biz.website ? 1000 : 2000;

      const { data: empresa, error: empresaError } = await db
        .from('empresas')
        .insert({
          workspace_id: workspaceId,
          nombre: biz.title,
          website: biz.website,
          telefono: biz.phone,
          ciudad: biz.city || ciudad,
          nicho,
          origen: 'prospecting',
        })
        .select()
        .single();

      if (empresaError) { console.error('Error creating empresa:', empresaError); continue; }

      const { data: lead, error: leadError } = await db
        .from('leads')
        .insert({
          workspace_id: workspaceId,
          empresa_id: empresa.id,
          nombre_contacto: `Responsable de ${biz.title}`,
          telefono: biz.phone,
          estado_pipeline: 'Nuevo',
          score,
          valor_estimado: valor,
          fuente: 'Google Maps',
          enrichment_status: 'pending',
          enrichment_source: 'apify',
        })
        .select()
        .single();

      if (leadError) { console.error('Error creating lead:', leadError); continue; }
      createdLeads.push({ ...lead, empresa });

      existingNames.push(biz.title);
      if (biz.website) {
        try { existingWebsites.add(new URL(biz.website).hostname.replace('www.', '').toLowerCase()); }
        catch { /* skip */ }
      }
      if (biz.phone) existingPhones.add(biz.phone.replace(/\s/g, ''));
    }

    await logActivity(workspaceId, userId, 'prospeccion_completada',
      `Prospeccion directa: ${createdLeads.length} negocios de ${nicho} en ${ciudad} (sin enriquecimiento)`,
      token, 'leads', createdLeads[0]?.id);

    return NextResponse.json({ leads: createdLeads, total: createdLeads.length, async: false });
  } catch (error) {
    console.error('Prospect error:', error);
    return NextResponse.json({ error: 'Error al prospectar.' }, { status: 500 });
  }
}
