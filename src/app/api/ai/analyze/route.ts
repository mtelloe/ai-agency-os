import { NextRequest, NextResponse } from 'next/server';
import { createApiClient, getTokenFromRequest } from '@/lib/supabase/api-client';
import { callClaude, callClaudeVision } from '@/lib/ai/claude';
import { parseJsonResponse } from '@/lib/ai/parsers';
import { spendCredit, logActivity } from '@/lib/credits';
import { scrapeWithFirecrawl, extractBusinessData } from '@/lib/audit/firecrawl';
import { getPageSpeed } from '@/lib/audit/pagespeed';
import { takeScreenshots } from '@/lib/audit/screenshot';
import { getGooglePlacesData } from '@/lib/audit/google-places';
import { VISUAL_ANALYSIS_SYSTEM, buildVisualPrompt, AUDIT_SYNTHESIS_SYSTEM, buildSynthesisPrompt } from '@/lib/audit/prompts';

export async function POST(request: NextRequest) {
  try {
    const token = getTokenFromRequest(request);
    if (!token) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    const db = createApiClient(token);
    const { url, workspaceId, userId, empresaId } = await request.json();

    if (!url || !workspaceId || !userId) {
      return NextResponse.json({ error: 'Faltan campos requeridos' }, { status: 400 });
    }
    if (typeof url !== 'string' || url.length > 2048) {
      return NextResponse.json({ error: 'URL demasiado larga' }, { status: 400 });
    }

    // SSRF protection
    try {
      const parsed = new URL(url);
      if (!['http:', 'https:'].includes(parsed.protocol)) {
        return NextResponse.json({ error: 'URL inválida: solo http/https' }, { status: 400 });
      }
      const h = parsed.hostname.toLowerCase();
      if (h === 'localhost' || h === '127.0.0.1' || h === '0.0.0.0' ||
          h.startsWith('10.') || h.startsWith('192.168.') || h.startsWith('172.') ||
          h.endsWith('.local') || h.endsWith('.internal') ||
          h === '169.254.169.254' || h === 'metadata.google.internal') {
        return NextResponse.json({ error: 'URL inválida: no se permiten direcciones internas' }, { status: 400 });
      }
    } catch {
      return NextResponse.json({ error: 'URL inválida' }, { status: 400 });
    }

    // Check and spend credit
    const spent = await spendCredit(workspaceId, userId, 'auditoria', `Auditoría de ${url}`, token);
    if (!spent) {
      return NextResponse.json({ error: 'No tienes créditos suficientes' }, { status: 402 });
    }

    // Create audit record
    const { data: auditoria, error: insertError } = await db
      .from('auditorias')
      .insert({ workspace_id: workspaceId, empresa_id: empresaId || null, url, estado: 'procesando' })
      .select()
      .single();

    if (insertError) throw insertError;

    // ─────────────────────────────────────────────────────────────────────
    // STEP 1: Gather data from ALL sources in parallel
    // ─────────────────────────────────────────────────────────────────────

    const [
      scrapeResult,
      extractResult,
      pagespeedMobile,
      pagespeedDesktop,
      screenshots,
    ] = await Promise.all([
      scrapeWithFirecrawl(url),
      extractBusinessData(url),
      getPageSpeed(url, 'mobile'),
      getPageSpeed(url, 'desktop'),
      takeScreenshots(url),
    ]);

    // Google Places needs the business name, so we run it after scraping
    const businessName = extractResult.business_name || scrapeResult.title || new URL(url).hostname;
    const placesData = await getGooglePlacesData(businessName, url);

    // ─────────────────────────────────────────────────────────────────────
    // STEP 2: Visual analysis with Claude Vision (if screenshots available)
    // ─────────────────────────────────────────────────────────────────────

    let visualAnalysis: string | null = null;

    const screenshotUrls = [screenshots.desktopUrl, screenshots.mobileUrl].filter(Boolean) as string[];
    if (screenshotUrls.length > 0) {
      try {
        visualAnalysis = await callClaudeVision(
          VISUAL_ANALYSIS_SYSTEM,
          buildVisualPrompt(url),
          screenshotUrls,
        );
      } catch (e) {
        console.error('Visual analysis error:', e);
      }
    }

    // ─────────────────────────────────────────────────────────────────────
    // STEP 3: Final synthesis with Claude — ALL data combined
    // ─────────────────────────────────────────────────────────────────────

    const synthesisPrompt = buildSynthesisPrompt({
      url,
      markdown: scrapeResult.markdown,
      title: scrapeResult.title,
      description: scrapeResult.description,
      scrapingMethod: scrapeResult.method,
      extractedData: extractResult.method !== 'none' ? extractResult as unknown as Record<string, unknown> : null,
      extractionMethod: extractResult.method,
      pagespeedMobile: pagespeedMobile as unknown as Record<string, unknown>,
      pagespeedDesktop: pagespeedDesktop as unknown as Record<string, unknown>,
      placesData: placesData as unknown as Record<string, unknown>,
      visualAnalysis,
      hasScreenshots: screenshotUrls.length > 0,
    });

    const rawResponse = await callClaude(AUDIT_SYNTHESIS_SYSTEM, synthesisPrompt);
    const analysis = parseJsonResponse<{
      resumen_negocio: string; cliente_ideal: string; servicios: string;
      problemas: string[]; oportunidades: string[];
      automatizaciones_recomendadas: Array<{ nombre: string; descripcion: string; impacto: string }>;
      agentes_recomendados: Array<{ nombre: string; tipo: string; descripcion: string; precio: number }>;
      mejoras_web: string[]; roi_estimado: string;
      pricing_sugerido: { setup: number; mensual: number }; score_oportunidad: number;
      contacto_nombre?: string; contacto_cargo?: string; contacto_email?: string; contacto_telefono?: string;
      analisis_visual?: string; pagespeed_resumen?: string; google_reviews_resumen?: string;
    }>(rawResponse);

    // ─────────────────────────────────────────────────────────────────────
    // STEP 4: Merge contact data from all sources
    // ─────────────────────────────────────────────────────────────────────

    // Priority: Firecrawl extract > Claude analysis > Google Places
    const contactEmail = extractResult.email
      || (analysis.contacto_email !== 'No encontrado' ? analysis.contacto_email : null)
      || null;
    const contactPhone = extractResult.phone
      || (analysis.contacto_telefono !== 'No encontrado' ? analysis.contacto_telefono : null)
      || placesData?.phone
      || null;
    const contactName = extractResult.owner_name
      || (analysis.contacto_nombre !== 'No encontrado' ? analysis.contacto_nombre : null)
      || null;
    const contactCargo = extractResult.owner_title
      || (analysis.contacto_cargo !== 'No encontrado' ? analysis.contacto_cargo : null)
      || null;

    // ─────────────────────────────────────────────────────────────────────
    // STEP 5: Save everything
    // ─────────────────────────────────────────────────────────────────────

    const rawScraping = {
      method: scrapeResult.method,
      extractionMethod: extractResult.method,
      title: scrapeResult.title,
      description: scrapeResult.description,
      markdownLength: scrapeResult.markdown.length,
      extractedData: extractResult,
      pagespeedMobile,
      pagespeedDesktop,
      placesData,
      screenshots,
      visualAnalysis,
      sources: {
        firecrawl: scrapeResult.method === 'firecrawl',
        jina: scrapeResult.method === 'jina',
        firecrawlExtract: extractResult.method === 'firecrawl-extract',
        pagespeed: !!pagespeedMobile,
        googlePlaces: !!placesData,
        screenshotDesktop: !!screenshots.desktopUrl,
        screenshotMobile: !!screenshots.mobileUrl,
        visualAnalysis: !!visualAnalysis,
      },
    };

    const { data: updated, error: updateError } = await db
      .from('auditorias')
      .update({
        estado: 'completada',
        score_oportunidad: Math.min(100, Math.max(0, analysis.score_oportunidad || 50)),
        resumen_negocio: analysis.resumen_negocio,
        cliente_ideal: analysis.cliente_ideal,
        servicios: analysis.servicios,
        problemas: analysis.problemas,
        oportunidades: analysis.oportunidades,
        automatizaciones_recomendadas: analysis.automatizaciones_recomendadas,
        agentes_recomendados: analysis.agentes_recomendados,
        mejoras_web: analysis.mejoras_web,
        roi_estimado: analysis.roi_estimado,
        pricing_sugerido: analysis.pricing_sugerido,
        raw_scraping: rawScraping,
        raw_ai_response: rawResponse,
        contacto_nombre: contactName,
        contacto_cargo: contactCargo,
        contacto_email: contactEmail,
        contacto_telefono: contactPhone,
        updated_at: new Date().toISOString(),
      })
      .eq('id', auditoria.id)
      .select()
      .single();

    if (updateError) throw updateError;

    // Create empresa if not provided
    if (!empresaId && analysis.resumen_negocio) {
      const nombreEmpresa = extractResult.business_name || scrapeResult.title || new URL(url).hostname;
      const { data: empresa } = await db
        .from('empresas')
        .insert({
          workspace_id: workspaceId,
          nombre: nombreEmpresa,
          website: url,
          email: contactEmail,
          telefono: contactPhone,
          origen: 'scraping',
        })
        .select('id')
        .single();
      if (empresa) {
        await db.from('auditorias').update({ empresa_id: empresa.id }).eq('id', auditoria.id);
      }
    }

    await logActivity(workspaceId, userId, 'auditoria_completada', `Auditoría completada: ${url}`, token, 'auditorias', auditoria.id);

    return NextResponse.json(updated);
  } catch (error) {
    console.error('Analyze error:', error);
    return NextResponse.json(
      { error: 'Error al analizar. Inténtalo de nuevo más tarde.' },
      { status: 500 }
    );
  }
}
