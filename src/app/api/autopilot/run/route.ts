import { NextRequest, NextResponse } from 'next/server';
import { createApiClient, getTokenFromRequest } from '@/lib/supabase/api-client';
import { callClaude } from '@/lib/ai/claude';
import { ANALYZE_BUSINESS_SYSTEM, buildAnalyzePrompt } from '@/lib/ai/prompts/analyze-business';
import { GENERATE_PROPOSAL_SYSTEM, buildProposalPrompt } from '@/lib/ai/prompts/generate-proposal';
import { GENERATE_SCRIPTS_SYSTEM, buildScriptsPrompt } from '@/lib/ai/prompts/generate-scripts';
import { parseJsonResponse } from '@/lib/ai/parsers';
import { spendCredit, logActivity, checkCredits } from '@/lib/credits';
import { sendEmail } from '@/lib/email/resend';
import { buildColdEmailHTML } from '@/lib/email/templates/cold-email-funnel';
import { searchGoogleMaps } from '@/lib/google-maps';

// ─── Quick scrape (fast, no Apify — but still checks legal/contact pages) ──
const QUICK_UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

async function quickFetch(pageUrl: string, timeoutMs = 8000): Promise<string> {
  try {
    const res = await fetch(pageUrl, {
      headers: { 'User-Agent': QUICK_UA, 'Accept': 'text/html,application/xhtml+xml', 'Accept-Language': 'es-ES,es;q=0.9' },
      signal: AbortSignal.timeout(timeoutMs),
      redirect: 'follow',
    });
    if (!res.ok) return '';
    return await res.text();
  } catch { return ''; }
}

function stripHtml(html: string): string {
  let text = html.replace(/<script[\s\S]*?<\/script>/gi, '').replace(/<style[\s\S]*?<\/style>/gi, '').replace(/<!--[\s\S]*?-->/g, '');
  // Preserve links as "text (URL)"
  text = text.replace(/<a\s[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi, (_, href, linkText) => {
    const clean = linkText.replace(/<[^>]+>/g, '').trim();
    if (href.startsWith('#') || href.startsWith('javascript:')) return clean;
    return `${clean} (${href})`;
  });
  return text.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

function quickMetadata(html: string): string {
  const meta: string[] = [];
  if (/<meta[^>]*name=["']viewport["'][^>]*content=["'][^"']*width=device-width/i.test(html)) meta.push('WEB RESPONSIVE: Sí');
  if (/treatwell|booksy|fresha/i.test(html)) meta.push('PLATAFORMA RESERVAS: Detectada');
  const wa = html.match(/(?:wa\.me|api\.whatsapp\.com)[^"'\s]*/i);
  if (wa) meta.push(`WHATSAPP: ${wa[0]}`);
  else if (/whatsapp/i.test(html)) meta.push('WHATSAPP: Detectado');
  return meta.length ? `\n--- Datos técnicos ---\n${meta.join('\n')}` : '';
}

function quickExtractContact(text: string): string {
  const rawEmails = text.match(/[\w.+-]+@[\w-]+\.[\w.-]+/g) || [];
  const emails = rawEmails.filter(e => !/\.(png|jpg|jpeg|gif|svg|webp|ico|css|js)$/i.test(e));
  const phones: string[] = [];
  for (const p of [/(?:\+34|0034)[\s.-]?[6-9]\d{1,2}[\s.-]?\d{2,3}[\s.-]?\d{2,3}[\s.-]?\d{0,3}/g, /\b[6789]\d{2}[\s.-]?\d{3}[\s.-]?\d{3}\b/g, /\b[6789]\d{2}[\s.-]?\d{2}[\s.-]?\d{2}[\s.-]?\d{2}\b/g]) {
    phones.push(...(text.match(p) || []));
  }
  return [...new Set([...emails, ...phones.map(t => t.trim())])].join(', ');
}

async function quickScrape(url: string) {
  try {
    const baseUrl = new URL(url);

    // Fetch main page + legal/contact pages in parallel (3 pages max for speed)
    const [mainHtml, legalHtml, contactHtml] = await Promise.all([
      quickFetch(url),
      quickFetch(`${baseUrl.origin}/aviso-legal`),
      quickFetch(`${baseUrl.origin}/contacto`),
    ]);

    if (!mainHtml) return { url, title: '', description: '', headings: [], bodyText: '', contactInfo: '', socialLinks: [] };

    const titleMatch = mainHtml.match(/<title[^>]*>(.*?)<\/title>/i);
    const descMatch = mainHtml.match(/<meta[^>]*name=["']description["'][^>]*content=["'](.*?)["']/i);
    const h1Matches = [...mainHtml.matchAll(/<h1[^>]*>(.*?)<\/h1>/gi)].map(m => m[1].replace(/<[^>]+>/g, ''));

    let bodyText = stripHtml(mainHtml).slice(0, 2500);
    if (legalHtml && legalHtml.length > 200) bodyText += `\n--- Página: ${baseUrl.origin}/aviso-legal ---\n${stripHtml(legalHtml).slice(0, 3000)}`;
    if (contactHtml && contactHtml.length > 200) bodyText += `\n--- Página: ${baseUrl.origin}/contacto ---\n${stripHtml(contactHtml).slice(0, 2000)}`;
    bodyText += quickMetadata(mainHtml);

    return {
      url,
      title: titleMatch?.[1] || '',
      description: descMatch?.[1] || '',
      headings: h1Matches,
      bodyText,
      contactInfo: quickExtractContact(bodyText),
      socialLinks: [] as string[],
    };
  } catch {
    return { url, title: '', description: '', headings: [], bodyText: '', contactInfo: '', socialLinks: [] };
  }
}

// ─── Prospect system prompt (same as /api/ai/prospect) ──────────────
const PROSPECT_SYSTEM_PROMPT = `Eres un experto en prospección de negocios locales en España.
Tu tarea es generar datos REALISTAS de negocios para un nicho y ciudad determinados.

Reglas:
- Genera nombres de negocios realistas y típicos de España (no inventados de forma obvia)
- Los sitios web deben seguir patrones reales (ej: clinicadentalgarcia.es, restauranteelmirador.com)
- Los teléfonos deben ser números españoles válidos (formato: +34 6XX XXX XXX o +34 9XX XXX XXX)
- Los emails deben ser coherentes con el nombre del negocio (info@, contacto@, etc.)
- Los scores deben variar entre 60 y 95, representando la probabilidad de que necesiten servicios digitales
- Los valores estimados deben variar entre 500 y 3000 euros, representando el valor potencial del contrato
- Varía los scores y valores: no todos iguales
- Usa español de España (no latinoamericano)

Responde SOLO con un JSON válido, sin texto adicional.`;

function buildProspectPrompt(nicho: string, ciudad: string, cantidad: number): string {
  return `Genera ${cantidad} negocios del nicho "${nicho}" en la ciudad de ${ciudad}, España.

Devuelve un JSON con esta estructura exacta:
{
  "prospects": [
    {
      "nombre": "Nombre del Negocio",
      "website": "https://www.ejemplo.es",
      "telefono": "+34 612 345 678",
      "email": "info@ejemplo.es",
      "ciudad": "${ciudad}",
      "nicho": "${nicho}",
      "score": 78,
      "valor_estimado": 1500
    }
  ]
}

Genera exactamente ${cantidad} negocios con datos variados y realistas.`;
}

// ─── UUID validation ────────────────────────────────────────────────
const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// ─── Route handler ──────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  try {
    const token = getTokenFromRequest(request);
    if (!token) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    const body = await request.json();
    const { action } = body;

    switch (action) {
      case 'estimate':
        return handleEstimate(body);
      case 'prospect':
        return handleProspect(body, token);
      case 'audit':
        return handleAudit(body, token);
      case 'generate':
        return handleGenerate(body, token);
      case 'send':
        return handleSend(body, token);
      default:
        return NextResponse.json({ error: 'Acción no válida' }, { status: 400 });
    }
  } catch (error) {
    console.error('Autopilot error:', error);
    return NextResponse.json(
      { error: 'Error en el piloto automático. Inténtalo de nuevo.' },
      { status: 500 }
    );
  }
}

// ─── Action: estimate ───────────────────────────────────────────────

function handleEstimate(body: { cantidad?: number }) {
  const cantidad = Math.min(Math.max(1, Number(body.cantidad) || 5), 20);
  // 2 (prospect) + 1 per audit + 1 per proposal + 1 per scripts = 2 + 3*cantidad
  const creditosNecesarios = 2 + 3 * cantidad;
  return NextResponse.json({ creditosNecesarios, cantidad });
}

// ─── Action: prospect ───────────────────────────────────────────────

async function handleProspect(
  body: { nicho: string; ciudad: string; cantidad?: number; workspaceId: string; userId: string },
  token: string
) {
  const { nicho, ciudad, workspaceId, userId } = body;
  const cantidad = Math.min(Math.max(1, Number(body.cantidad) || 5), 20);

  if (!nicho || !ciudad || !workspaceId || !userId) {
    return NextResponse.json({ error: 'Faltan campos requeridos' }, { status: 400 });
  }

  if (typeof nicho !== 'string' || nicho.length > 200 || typeof ciudad !== 'string' || ciudad.length > 200) {
    return NextResponse.json({ error: 'Datos de entrada inválidos' }, { status: 400 });
  }

  if (!uuidRegex.test(workspaceId) || !uuidRegex.test(userId)) {
    return NextResponse.json({ error: 'Formato de ID inválido' }, { status: 400 });
  }

  // Check credits upfront: 2 for prospecting
  const { available } = await checkCredits(workspaceId, token);
  if (available < 2) {
    return NextResponse.json({ error: 'No tienes créditos suficientes' }, { status: 402 });
  }

  const db = createApiClient(token);

  // ─── Get existing businesses in this workspace to avoid duplicates ───
  const { data: existingEmpresas } = await db
    .from('empresas')
    .select('nombre, website, telefono')
    .eq('workspace_id', workspaceId);

  const existingNames = (existingEmpresas || []).map(e => e.nombre || '');
  const existingWebsites = new Set(
    (existingEmpresas || [])
      .filter(e => e.website)
      .map(e => {
        try { return new URL(e.website!).hostname.replace('www.', '').toLowerCase(); }
        catch { return e.website!.toLowerCase().replace('www.', ''); }
      })
  );
  const existingPhones = new Set(
    (existingEmpresas || []).filter(e => e.telefono).map(e => e.telefono!.replace(/\s/g, ''))
  );

  // Spend 2 credits
  const spent1 = await spendCredit(workspaceId, userId, 'prospeccion', `Autopilot: Prospección ${nicho} en ${ciudad}`, token);
  if (!spent1) return NextResponse.json({ error: 'No tienes créditos suficientes' }, { status: 402 });

  const spent2 = await spendCredit(workspaceId, userId, 'prospeccion', `Autopilot: Prospección (2/2) ${nicho} en ${ciudad}`, token);
  if (!spent2) return NextResponse.json({ error: 'No tienes créditos suficientes' }, { status: 402 });

  // Search Google Maps — pass existing names so Apify fetches extras to compensate
  const mapResults = await searchGoogleMaps(`${nicho} ${ciudad}`, cantidad, existingNames);

  if (mapResults.length === 0) {
    return NextResponse.json({ error: 'No se encontraron negocios NUEVOS en Google Maps. Puede que ya tengas todos los del área.' }, { status: 404 });
  }

  const results: Array<{ empresaId: string; nombre: string; website: string; email: string }> = [];

  for (const biz of mapResults) {
    // Double-check deduplication by website and phone
    if (biz.website) {
      try {
        const domain = new URL(biz.website).hostname.replace('www.', '').toLowerCase();
        if (existingWebsites.has(domain)) continue;
      } catch { /* skip check */ }
    }
    if (biz.phone && existingPhones.has(biz.phone.replace(/\s/g, ''))) continue;

    let score = 70;
    if (!biz.website) score += 15;
    if ((biz.reviewsCount || 0) < 20) score += 5;
    if ((biz.totalScore || 5) < 4.5) score += 5;
    score = Math.min(95, Math.max(60, score));

    const { data: empresa, error: empresaError } = await db
      .from('empresas')
      .insert({
        workspace_id: workspaceId,
        nombre: biz.title,
        website: biz.website,
        telefono: biz.phone,
        ciudad: biz.city || ciudad,
        nicho,
        origen: 'autopilot',
      })
      .select()
      .single();

    if (empresaError) { console.error('Error creating empresa:', empresaError); continue; }

    const { error: leadError } = await db
      .from('leads')
      .insert({
        workspace_id: workspaceId,
        empresa_id: empresa.id,
        nombre_contacto: `Responsable de ${biz.title}`,
        telefono: biz.phone,
        estado_pipeline: 'Nuevo',
        score,
        valor_estimado: biz.website ? 1000 : 2000,
        fuente: 'Google Maps',
      })
      .select()
      .single();

    if (leadError) { console.error('Error creating lead:', leadError); continue; }

    results.push({
      empresaId: empresa.id,
      nombre: biz.title,
      website: biz.website || '',
      email: '',
    });

    // Track what we've added to avoid within-batch duplicates
    existingNames.push(biz.title);
    if (biz.website) {
      try { existingWebsites.add(new URL(biz.website).hostname.replace('www.', '').toLowerCase()); }
      catch { /* skip */ }
    }
    if (biz.phone) existingPhones.add(biz.phone.replace(/\s/g, ''));
  }

  await logActivity(workspaceId, userId, 'autopilot_prospeccion', `Autopilot: ${results.length} negocios reales de ${nicho} en ${ciudad}`, token);

  return NextResponse.json({ prospects: results, total: results.length });
}

// ─── Action: audit ──────────────────────────────────────────────────

async function handleAudit(
  body: { empresaId: string; url: string; workspaceId: string; userId: string },
  token: string
) {
  const { empresaId, url, workspaceId, userId } = body;

  if (!url || !workspaceId || !userId || !empresaId) {
    return NextResponse.json({ error: 'Faltan campos requeridos' }, { status: 400 });
  }

  if (!uuidRegex.test(workspaceId) || !uuidRegex.test(userId) || !uuidRegex.test(empresaId)) {
    return NextResponse.json({ error: 'Formato de ID inválido' }, { status: 400 });
  }

  if (typeof url !== 'string' || url.length > 2048) {
    return NextResponse.json({ error: 'URL demasiado larga' }, { status: 400 });
  }

  // Validate URL
  try {
    const parsed = new URL(url);
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      return NextResponse.json({ error: 'URL inválida' }, { status: 400 });
    }
    const hostname = parsed.hostname.toLowerCase();
    if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '0.0.0.0' ||
        hostname.startsWith('10.') || hostname.startsWith('192.168.') || hostname.startsWith('172.') ||
        hostname.endsWith('.local') || hostname.endsWith('.internal') ||
        hostname === '169.254.169.254' || hostname === 'metadata.google.internal') {
      return NextResponse.json({ error: 'URL inválida' }, { status: 400 });
    }
  } catch {
    return NextResponse.json({ error: 'URL inválida' }, { status: 400 });
  }

  const spent = await spendCredit(workspaceId, userId, 'auditoria', `Autopilot: Auditoría de ${url}`, token);
  if (!spent) return NextResponse.json({ error: 'No tienes créditos suficientes' }, { status: 402 });

  const db = createApiClient(token);

  // Create audit record
  const { data: auditoria, error: insertError } = await db
    .from('auditorias')
    .insert({ workspace_id: workspaceId, empresa_id: empresaId, url, estado: 'procesando' })
    .select()
    .single();

  if (insertError) throw insertError;

  // Quick scrape (no Apify, no Google — fast, stays under 60s)
  const scraped = await quickScrape(url);

  // Analyze with Claude
  const rawResponse = await callClaude(ANALYZE_BUSINESS_SYSTEM, buildAnalyzePrompt(scraped));
  const analysis = parseJsonResponse<{
    resumen_negocio: string; cliente_ideal: string; servicios: string;
    problemas: string[]; oportunidades: string[];
    automatizaciones_recomendadas: Array<{ nombre: string; descripcion: string; impacto: string }>;
    agentes_recomendados: Array<{ nombre: string; tipo: string; descripcion: string; precio: number }>;
    mejoras_web: string[]; roi_estimado: string;
    pricing_sugerido: { setup: number; mensual: number }; score_oportunidad: number;
    contacto_nombre?: string; contacto_cargo?: string; contacto_email?: string; contacto_telefono?: string;
  }>(rawResponse);

  // Update audit
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
      raw_scraping: scraped,
      raw_ai_response: rawResponse,
      contacto_nombre: analysis.contacto_nombre !== 'No encontrado' ? analysis.contacto_nombre : null,
      contacto_cargo: analysis.contacto_cargo !== 'No encontrado' ? analysis.contacto_cargo : null,
      contacto_email: analysis.contacto_email !== 'No encontrado' ? analysis.contacto_email : null,
      contacto_telefono: analysis.contacto_telefono !== 'No encontrado' ? analysis.contacto_telefono : null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', auditoria.id)
    .select()
    .single();

  if (updateError) throw updateError;

  // Update empresa contact if found
  if (analysis.contacto_email && analysis.contacto_email !== 'No encontrado') {
    await db.from('empresas').update({
      email: analysis.contacto_email,
      ...(analysis.contacto_telefono && analysis.contacto_telefono !== 'No encontrado' ? { telefono: analysis.contacto_telefono } : {}),
    }).eq('id', empresaId);
  }

  await logActivity(workspaceId, userId, 'autopilot_auditoria', `Autopilot: Auditoría completada de ${url}`, token, 'auditorias', auditoria.id);

  return NextResponse.json({
    auditoriaId: auditoria.id,
    estado: 'completada',
    score: updated?.score_oportunidad,
    contactoEmail: analysis.contacto_email !== 'No encontrado' ? analysis.contacto_email : null,
  });
}

// ─── Action: generate ───────────────────────────────────────────────

async function handleGenerate(
  body: { auditoriaId: string; workspaceId: string; userId: string },
  token: string
) {
  const { auditoriaId, workspaceId, userId } = body;

  if (!auditoriaId || !workspaceId || !userId) {
    return NextResponse.json({ error: 'Faltan campos requeridos' }, { status: 400 });
  }

  if (!uuidRegex.test(auditoriaId) || !uuidRegex.test(workspaceId) || !uuidRegex.test(userId)) {
    return NextResponse.json({ error: 'Formato de ID inválido' }, { status: 400 });
  }

  const db = createApiClient(token);

  const { data: auditoria } = await db
    .from('auditorias')
    .select('*, empresas(nombre, nicho)')
    .eq('id', auditoriaId)
    .single();

  if (!auditoria || auditoria.estado !== 'completada') {
    return NextResponse.json({ error: 'Auditoría no encontrada o no completada' }, { status: 404 });
  }

  // Check enough credits for proposal + scripts (2 credits)
  const { available } = await checkCredits(workspaceId, token);
  if (available < 2) {
    return NextResponse.json({ error: 'No tienes créditos suficientes' }, { status: 402 });
  }

  // ── Generate proposal ──
  const spentP = await spendCredit(workspaceId, userId, 'propuesta', `Autopilot: Propuesta para ${auditoria.url}`, token);
  if (!spentP) return NextResponse.json({ error: 'No tienes créditos suficientes' }, { status: 402 });

  const proposalPrompt = buildProposalPrompt({
    empresa: auditoria.empresas?.nombre || new URL(auditoria.url).hostname,
    url: auditoria.url,
    resumen: auditoria.resumen_negocio || '',
    problemas: auditoria.problemas || [],
    oportunidades: auditoria.oportunidades || [],
    automatizaciones: auditoria.automatizaciones_recomendadas || [],
    agentes: auditoria.agentes_recomendados || [],
    pricing: auditoria.pricing_sugerido,
  });

  const rawProposal = await callClaude(GENERATE_PROPOSAL_SYSTEM, proposalPrompt);
  const proposal = parseJsonResponse<{
    titulo: string; resumen_ejecutivo: string; problemas: string; solucion: string;
    metodologia: string; cronograma: string; precio_setup: number; precio_mensual: number;
    roi: string; cta_cierre: string;
  }>(rawProposal);

  const { data: propuesta, error: propError } = await db
    .from('propuestas')
    .insert({
      workspace_id: workspaceId, empresa_id: auditoria.empresa_id, auditoria_id: auditoriaId,
      titulo: proposal.titulo, resumen_ejecutivo: proposal.resumen_ejecutivo,
      problemas: proposal.problemas, solucion: proposal.solucion,
      stack: proposal.metodologia, cronograma: proposal.cronograma,
      precio_setup: proposal.precio_setup, precio_mensual: proposal.precio_mensual,
      roi: proposal.roi, cta_cierre: proposal.cta_cierre,
    })
    .select()
    .single();

  if (propError) throw propError;

  // ── Generate scripts ──
  const spentS = await spendCredit(workspaceId, userId, 'scripts', `Autopilot: Scripts para ${auditoria.url}`, token);
  if (!spentS) return NextResponse.json({ error: 'No tienes créditos suficientes' }, { status: 402 });

  const scriptsPrompt = buildScriptsPrompt({
    empresa: auditoria.empresas?.nombre || new URL(auditoria.url).hostname,
    url: auditoria.url,
    resumen: auditoria.resumen_negocio || '',
    problemas: auditoria.problemas || [],
    servicios: auditoria.servicios || '',
    nicho: auditoria.empresas?.nicho,
  });

  const rawScripts = await callClaude(GENERATE_SCRIPTS_SYSTEM, scriptsPrompt);
  const scripts = parseJsonResponse<{
    cold_email: string; script_llamada: string; mensaje_whatsapp: string;
    follow_up: string; pitch_demo: string;
    objeciones: Array<{ objecion: string; respuesta: string }>;
  }>(rawScripts);

  const { data: script, error: scriptError } = await db
    .from('scripts')
    .insert({
      workspace_id: workspaceId, empresa_id: auditoria.empresa_id, auditoria_id: auditoriaId,
      cold_email: scripts.cold_email, script_llamada: scripts.script_llamada,
      mensaje_whatsapp: scripts.mensaje_whatsapp, follow_up: scripts.follow_up,
      pitch_demo: scripts.pitch_demo, objeciones: scripts.objeciones,
    })
    .select()
    .single();

  if (scriptError) throw scriptError;

  await logActivity(workspaceId, userId, 'autopilot_generacion', `Autopilot: Propuesta y scripts generados para ${auditoria.url}`, token, 'propuestas', propuesta.id);

  return NextResponse.json({
    propuestaId: propuesta.id,
    scriptId: script.id,
  });
}

// ─── Action: send ───────────────────────────────────────────────────

async function handleSend(
  body: { scriptId: string; to: string; workspaceId: string; userId: string },
  token: string
) {
  const { scriptId, to, workspaceId, userId } = body;

  if (!scriptId || !to || !workspaceId || !userId) {
    return NextResponse.json({ error: 'Faltan campos requeridos' }, { status: 400 });
  }

  if (!uuidRegex.test(scriptId) || !uuidRegex.test(workspaceId) || !uuidRegex.test(userId)) {
    return NextResponse.json({ error: 'Formato de ID inválido' }, { status: 400 });
  }

  const db = createApiClient(token);

  const { data: script, error: scriptError } = await db
    .from('scripts')
    .select('*, auditorias(*, empresas(*))')
    .eq('id', scriptId)
    .single();

  if (scriptError || !script) {
    return NextResponse.json({ error: 'Script no encontrado' }, { status: 404 });
  }

  const auditoria = script.auditorias;
  const empresa = auditoria?.empresas;
  const empresaNombre = empresa?.nombre || 'tu empresa';
  const contactoNombre = to.split('@')[0].split(/[._-]/).map((w: string) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');

  const { data: workspace } = await db
    .from('workspaces')
    .select('nombre')
    .eq('id', workspaceId)
    .single();

  const agenciaNombre = workspace?.nombre || 'AI Agency OS';
  const agenciaEmail = 'contacto@simedalavida.com';

  const subject = `Oportunidades de mejora para ${empresaNombre}`;
  const html = buildColdEmailHTML({
    empresaNombre,
    contactoNombre,
    problemas: auditoria?.problemas || ['Oportunidades de mejora detectadas en tu web'],
    solucion: script.cold_email?.split('\n').slice(1).join(' ').substring(0, 300) || 'Podemos ayudarte a mejorar tus resultados con automatización e IA.',
    roi: auditoria?.roi_estimado || 'Mejora significativa en conversión y eficiencia',
    ctaUrl: auditoria ? `${process.env.NEXT_PUBLIC_APP_URL || 'https://app.simedalavida.com'}/propuestas?empresa=${empresa?.id || ''}` : '#',
    ctaText: 'Ver propuesta personalizada',
    agenciaNombre,
    agenciaEmail,
    psText: 'Esta propuesta se ha preparado específicamente para tu negocio. Solo te llevará 2 minutos revisarla.',
  });

  const result = await sendEmail({ to, subject, html, replyTo: agenciaEmail });

  if (!result.success) {
    return NextResponse.json({ error: result.error || 'Error al enviar email' }, { status: 500 });
  }

  await logActivity(workspaceId, userId, 'autopilot_email', `Autopilot: Email enviado a ${empresaNombre} (${to})`, token, 'scripts', scriptId);

  return NextResponse.json({ success: true, emailId: result.id });
}
