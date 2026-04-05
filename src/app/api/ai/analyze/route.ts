import { NextRequest, NextResponse } from 'next/server';
import { createApiClient, getTokenFromRequest } from '@/lib/supabase/api-client';
import { callClaudeVision } from '@/lib/ai/claude';
import { spendCredit, logActivity } from '@/lib/credits';
import { scrapeWithFirecrawl, extractBusinessData } from '@/lib/audit/firecrawl';
import { getPageSpeed } from '@/lib/audit/pagespeed';
import { takeScreenshots } from '@/lib/audit/screenshot';
import { getGooglePlacesData } from '@/lib/audit/google-places';
import { VISUAL_ANALYSIS_SYSTEM, buildVisualPrompt } from '@/lib/audit/prompts';
import { runAuditAgentPipeline } from '@/lib/audit/agents';

// Allow up to 5 minutes for the full audit pipeline (scraping + 3 Claude calls)
export const maxDuration = 300;

// ─── Platform detection from links and content ─────────────────────────────

const PLATFORM_PATTERNS: Array<{ pattern: RegExp; name: string; type: 'booking' | 'reviews' | 'delivery' | 'payments' | 'social' }> = [
  // Booking / Appointments / Prices
  { pattern: /booksy\.com/i, name: 'Booksy (reservas + precios)', type: 'booking' },
  { pattern: /treatwell\.(es|com)/i, name: 'Treatwell (reservas + precios)', type: 'booking' },
  { pattern: /fresha\.com/i, name: 'Fresha (reservas + precios)', type: 'booking' },
  { pattern: /doctolib/i, name: 'Doctolib (citas médicas)', type: 'booking' },
  { pattern: /calendly\.com/i, name: 'Calendly (citas)', type: 'booking' },
  { pattern: /setmore\.com/i, name: 'Setmore (citas)', type: 'booking' },
  { pattern: /acuityscheduling\.com/i, name: 'Acuity Scheduling (citas)', type: 'booking' },
  { pattern: /simplybook\.me/i, name: 'SimplyBook (reservas)', type: 'booking' },
  { pattern: /mindbodyonline\.com|mindbody\.io/i, name: 'Mindbody (reservas + precios)', type: 'booking' },
  { pattern: /vagaro\.com/i, name: 'Vagaro (reservas + precios)', type: 'booking' },
  { pattern: /planyo\.com/i, name: 'Planyo (reservas)', type: 'booking' },
  { pattern: /reservio\.com/i, name: 'Reservio (reservas)', type: 'booking' },
  { pattern: /thefork\.com|eltenedor/i, name: 'TheFork/ElTenedor (reservas restaurante)', type: 'booking' },
  { pattern: /covermanager\.com/i, name: 'CoverManager (reservas restaurante)', type: 'booking' },
  { pattern: /booking\.com/i, name: 'Booking.com (reservas alojamiento)', type: 'booking' },
  { pattern: /airbnb\.(com|es)/i, name: 'Airbnb', type: 'booking' },
  // Delivery / Ecommerce
  { pattern: /glovo\.com/i, name: 'Glovo (delivery)', type: 'delivery' },
  { pattern: /ubereats\.com/i, name: 'Uber Eats (delivery)', type: 'delivery' },
  { pattern: /justeat\.(es|com)/i, name: 'Just Eat (delivery)', type: 'delivery' },
  { pattern: /deliveroo\.(es|com)/i, name: 'Deliveroo (delivery)', type: 'delivery' },
  // Payments
  { pattern: /paypal\.(com|me)/i, name: 'PayPal', type: 'payments' },
  { pattern: /stripe\.com/i, name: 'Stripe (pagos online)', type: 'payments' },
  { pattern: /bizum/i, name: 'Bizum', type: 'payments' },
  // WhatsApp
  { pattern: /wa\.me|api\.whatsapp\.com/i, name: 'WhatsApp (contacto directo)', type: 'social' },
];

function detectPlatformsInLinks(sources: string[]): string[] {
  const combined = sources.join(' ');
  const found: string[] = [];

  for (const { pattern, name } of PLATFORM_PATTERNS) {
    if (pattern.test(combined) && !found.includes(name)) {
      found.push(name);
    }
  }

  return found;
}

/** Case-insensitive check for "no encontrado" and similar empty values */
function isEmptyContact(val: string | undefined | null): boolean {
  if (!val) return true;
  const lower = val.toLowerCase().trim();
  return lower === 'no encontrado' || lower === 'no disponible' || lower === 'n/a' || lower === 'null' || lower === '';
}

export async function POST(request: NextRequest) {
  let auditoriaId: string | null = null;
  let db: ReturnType<typeof createApiClient> | null = null;

  try {
    const token = getTokenFromRequest(request);
    if (!token) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    db = createApiClient(token);
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
    auditoriaId = auditoria.id;

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

    // ─── Detect booking/pricing platforms in links ───
    const detectedPlatforms = detectPlatformsInLinks([
      ...scrapeResult.links,
      scrapeResult.markdown, // also check the markdown content
    ]);

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
    // STEP 3: Multi-agent audit pipeline (4 specialized agents)
    // ─────────────────────────────────────────────────────────────────────

    const pipelineResult = await runAuditAgentPipeline({
      url,
      markdown: scrapeResult.markdown,
      title: scrapeResult.title,
      description: scrapeResult.description,
      extractedData: extractResult.method !== 'none' ? extractResult as unknown as Record<string, unknown> : null,
      extractionMethod: extractResult.method,
      pagespeedMobile: pagespeedMobile as unknown as Record<string, unknown>,
      pagespeedDesktop: pagespeedDesktop as unknown as Record<string, unknown>,
      placesData: placesData as unknown as Record<string, unknown>,
      visualAnalysis,
      detectedPlatforms,
    });

    const analysis = pipelineResult.finalAudit;

    // ─────────────────────────────────────────────────────────────────────
    // STEP 4: Merge contact data from all sources (case-insensitive)
    // ─────────────────────────────────────────────────────────────────────

    // Priority: Firecrawl extract > Fact sheet (from aviso legal) > Claude QA > Google Places
    const factContact = pipelineResult.factSheet.contacto;

    const contactEmail = extractResult.email
      || (!isEmptyContact(factContact.email) ? factContact.email : null)
      || (!isEmptyContact(analysis.contacto_email) ? analysis.contacto_email : null)
      || null;
    const contactPhone = extractResult.phone
      || (!isEmptyContact(factContact.telefono) ? factContact.telefono : null)
      || (!isEmptyContact(analysis.contacto_telefono) ? analysis.contacto_telefono : null)
      || placesData?.phone
      || null;
    const contactName = extractResult.owner_name
      || (!isEmptyContact(factContact.nombre_titular) ? factContact.nombre_titular : null)
      || (!isEmptyContact(analysis.contacto_nombre) ? analysis.contacto_nombre : null)
      || null;
    const contactCargo = extractResult.owner_title
      || (!isEmptyContact(factContact.cargo) ? factContact.cargo : null)
      || (!isEmptyContact(analysis.contacto_cargo) ? analysis.contacto_cargo : null)
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
      detectedPlatforms,
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
      // Multi-agent pipeline metadata
      agentPipeline: {
        factSheet: pipelineResult.factSheet,
        timings: pipelineResult.agentTimings,
        qaCorrections: analysis.correcciones_realizadas || [],
      },
    };

    const scoreNum = typeof analysis.score_oportunidad === 'string'
      ? parseInt(analysis.score_oportunidad, 10)
      : analysis.score_oportunidad;

    const { data: updated, error: updateError } = await db
      .from('auditorias')
      .update({
        estado: 'completada',
        score_oportunidad: Math.min(100, Math.max(0, scoreNum || 50)),
        resumen_negocio: analysis.resumen_negocio,
        cliente_ideal: analysis.cliente_ideal,
        servicios: analysis.servicios,
        problemas: Array.isArray(analysis.problemas) ? analysis.problemas : [],
        oportunidades: Array.isArray(analysis.oportunidades) ? analysis.oportunidades : [],
        automatizaciones_recomendadas: Array.isArray(analysis.automatizaciones_recomendadas) ? analysis.automatizaciones_recomendadas : [],
        agentes_recomendados: Array.isArray(analysis.agentes_recomendados) ? analysis.agentes_recomendados : [],
        mejoras_web: Array.isArray(analysis.mejoras_web) ? analysis.mejoras_web : [],
        roi_estimado: analysis.roi_estimado,
        pricing_sugerido: analysis.pricing_sugerido,
        raw_scraping: rawScraping,
        raw_ai_response: JSON.stringify(pipelineResult.rawResponses),
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

    // Save error state to DB so we can debug
    if (auditoriaId && db) {
      try {
        await db.from('auditorias').update({
          estado: 'error',
          error_message: error instanceof Error ? error.message : 'Error desconocido',
          updated_at: new Date().toISOString(),
        }).eq('id', auditoriaId);
      } catch (dbErr) {
        console.error('Failed to save error state:', dbErr);
      }
    }

    return NextResponse.json(
      { error: 'Error al analizar. Inténtalo de nuevo más tarde.' },
      { status: 500 }
    );
  }
}
