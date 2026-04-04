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

    // ─── Get existing businesses to avoid duplicates ───
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

    // Spend 2 credits
    const spent1 = await spendCredit(workspaceId, userId, 'prospeccion', `Prospección: ${nicho} en ${ciudad}`, token);
    if (!spent1) return NextResponse.json({ error: 'No tienes créditos suficientes' }, { status: 402 });
    const spent2 = await spendCredit(workspaceId, userId, 'prospeccion', `Prospección (2/2): ${nicho} en ${ciudad}`, token);
    if (!spent2) return NextResponse.json({ error: 'No tienes créditos suficientes' }, { status: 402 });

    // Search Google Maps — exclude businesses already in the system
    const query = `${nicho} ${ciudad}`;
    const mapResults = await searchGoogleMaps(query, cantidad, existingNames);

    if (mapResults.length === 0) {
      return NextResponse.json({ error: 'No se encontraron negocios NUEVOS en Google Maps. Puede que ya tengas todos los del área — prueba otro nicho o ciudad.' }, { status: 404 });
    }

    // Create empresas + leads from REAL data
    const createdLeads = [];

    for (const biz of mapResults) {
      // Double-check deduplication by website and phone
      if (biz.website) {
        try {
          const domain = new URL(biz.website).hostname.replace('www.', '').toLowerCase();
          if (existingWebsites.has(domain)) continue;
        } catch { /* skip */ }
      }
      if (biz.phone && existingPhones.has(biz.phone.replace(/\s/g, ''))) continue;

      // Calculate opportunity score based on real data
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
        })
        .select()
        .single();

      if (leadError) { console.error('Error creating lead:', leadError); continue; }

      createdLeads.push({ ...lead, empresa });

      // Track for within-batch dedup
      existingNames.push(biz.title);
      if (biz.website) {
        try { existingWebsites.add(new URL(biz.website).hostname.replace('www.', '').toLowerCase()); }
        catch { /* skip */ }
      }
      if (biz.phone) existingPhones.add(biz.phone.replace(/\s/g, ''));
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
