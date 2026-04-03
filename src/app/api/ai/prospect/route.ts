import { NextRequest, NextResponse } from 'next/server';
import { createApiClient, getTokenFromRequest } from '@/lib/supabase/api-client';
import { searchGoogleMaps } from '@/lib/google-maps';
import { spendCredit, logActivity } from '@/lib/credits';

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
      return NextResponse.json({ error: 'Datos de entrada inválidos' }, { status: 400 });
    }

    // Spend 2 credits
    const spent1 = await spendCredit(workspaceId, userId, 'prospeccion', `Prospección: ${nicho} en ${ciudad}`, token);
    if (!spent1) return NextResponse.json({ error: 'No tienes créditos suficientes' }, { status: 402 });
    const spent2 = await spendCredit(workspaceId, userId, 'prospeccion', `Prospección (2/2): ${nicho} en ${ciudad}`, token);
    if (!spent2) return NextResponse.json({ error: 'No tienes créditos suficientes' }, { status: 402 });

    // Search REAL businesses on Google Maps via Apify
    const query = `${nicho} ${ciudad}`;
    const mapResults = await searchGoogleMaps(query, cantidad);

    if (mapResults.length === 0) {
      return NextResponse.json({ error: 'No se encontraron negocios en Google Maps. Prueba con otro nicho o ciudad.' }, { status: 404 });
    }

    // Create empresas + leads from REAL data
    const createdLeads = [];

    for (const biz of mapResults) {
      // Calculate opportunity score based on real data
      let score = 70;
      if (!biz.website) score += 15; // No web = high opportunity
      if ((biz.reviewsCount || 0) < 20) score += 5; // Few reviews = opportunity
      if ((biz.totalScore || 5) < 4.5) score += 5; // Lower rating = room for improvement
      score = Math.min(95, Math.max(60, score));

      // Estimate value based on category
      const valor = biz.website ? 1000 : 2000; // No web = higher value deal

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
        })
        .select()
        .single();

      if (leadError) { console.error('Error creating lead:', leadError); continue; }

      createdLeads.push({ ...lead, empresa });
    }

    await logActivity(workspaceId, userId, 'prospeccion_completada',
      `Prospección real: ${createdLeads.length} negocios de ${nicho} en ${ciudad} (Google Maps)`,
      token, 'leads', createdLeads[0]?.id);

    return NextResponse.json({ leads: createdLeads, total: createdLeads.length });
  } catch (error) {
    console.error('Prospect error:', error);
    return NextResponse.json({ error: 'Error al prospectar.' }, { status: 500 });
  }
}
