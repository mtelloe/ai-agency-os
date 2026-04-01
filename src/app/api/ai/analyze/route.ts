import { NextRequest, NextResponse } from 'next/server';
import { createApiClient, getTokenFromRequest } from '@/lib/supabase/api-client';
import { callClaude } from '@/lib/ai/claude';
import { ANALYZE_BUSINESS_SYSTEM, buildAnalyzePrompt } from '@/lib/ai/prompts/analyze-business';
import { parseJsonResponse } from '@/lib/ai/parsers';
import { spendCredit, logActivity } from '@/lib/credits';

async function scrapeUrl(url: string) {
  const token = process.env.APIFY_API_TOKEN;
  if (!token) return basicScrape(url);

  try {
    const runResponse = await fetch(
      `https://api.apify.com/v2/acts/apify~website-content-crawler/run-sync-get-dataset-items?token=${token}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          startUrls: [{ url }],
          maxCrawlPages: 1,
          crawlerType: 'cheerio',
        }),
        signal: AbortSignal.timeout(60000),
      }
    );

    if (!runResponse.ok) return basicScrape(url);

    const items = await runResponse.json();
    const page = items[0];
    if (!page) return basicScrape(url);

    return {
      url,
      title: page.metadata?.title || '',
      description: page.metadata?.description || '',
      headings: page.metadata?.headers?.h1 || [],
      bodyText: (page.text || '').slice(0, 5000),
      contactInfo: extractContact(page.text || ''),
      socialLinks: extractSocials(page.text || '', page.html || ''),
    };
  } catch {
    return basicScrape(url);
  }
}

async function basicScrape(url: string) {
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; AIAgencyOS/1.0)' },
      signal: AbortSignal.timeout(15000),
    });
    const html = await res.text();

    const titleMatch = html.match(/<title[^>]*>(.*?)<\/title>/i);
    const descMatch = html.match(/<meta[^>]*name=["']description["'][^>]*content=["'](.*?)["']/i);
    const h1Matches = [...html.matchAll(/<h1[^>]*>(.*?)<\/h1>/gi)].map(m => m[1].replace(/<[^>]+>/g, ''));
    const bodyText = html.replace(/<script[\s\S]*?<\/script>/gi, '')
      .replace(/<style[\s\S]*?<\/style>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 5000);

    return {
      url,
      title: titleMatch?.[1] || '',
      description: descMatch?.[1] || '',
      headings: h1Matches,
      bodyText,
      contactInfo: extractContact(bodyText),
      socialLinks: extractSocials(bodyText, html),
    };
  } catch {
    return { url, title: '', description: '', headings: [], bodyText: '', contactInfo: '', socialLinks: [] };
  }
}

function extractContact(text: string): string {
  const emails = text.match(/[\w.+-]+@[\w-]+\.[\w.-]+/g) || [];
  const phones = text.match(/(?:\+34|0034)?[\s.-]?(?:6|7|9)\d{1,2}[\s.-]?\d{3}[\s.-]?\d{3,4}/g) || [];
  return [...new Set([...emails, ...phones])].join(', ');
}

function extractSocials(text: string, html: string): string[] {
  const combined = text + ' ' + html;
  const socials: string[] = [];
  if (combined.includes('facebook.com') || combined.includes('fb.com')) socials.push('Facebook');
  if (combined.includes('instagram.com')) socials.push('Instagram');
  if (combined.includes('twitter.com') || combined.includes('x.com')) socials.push('X/Twitter');
  if (combined.includes('linkedin.com')) socials.push('LinkedIn');
  if (combined.includes('tiktok.com')) socials.push('TikTok');
  if (combined.includes('youtube.com')) socials.push('YouTube');
  return socials;
}

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

    // Validate URL length to prevent abuse
    if (typeof url !== 'string' || url.length > 2048) {
      return NextResponse.json({ error: 'URL demasiado larga (máximo 2048 caracteres)' }, { status: 400 });
    }

    // Validate URL format, reject dangerous protocols and internal addresses (SSRF protection)
    try {
      const parsed = new URL(url);
      if (!['http:', 'https:'].includes(parsed.protocol)) {
        return NextResponse.json({ error: 'URL inválida: solo se permiten URLs http/https' }, { status: 400 });
      }
      // Block requests to private/internal networks
      const hostname = parsed.hostname.toLowerCase();
      if (
        hostname === 'localhost' ||
        hostname === '127.0.0.1' ||
        hostname === '0.0.0.0' ||
        hostname.startsWith('10.') ||
        hostname.startsWith('192.168.') ||
        hostname.startsWith('172.') ||
        hostname.endsWith('.local') ||
        hostname.endsWith('.internal') ||
        hostname === '169.254.169.254' || // AWS metadata
        hostname === 'metadata.google.internal' // GCP metadata
      ) {
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

    // Scrape
    const scraped = await scrapeUrl(url);

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

    // Create empresa if not provided
    if (!empresaId && analysis.resumen_negocio) {
      const nombreEmpresa = scraped.title || new URL(url).hostname;
      const { data: empresa } = await db
        .from('empresas')
        .insert({
          workspace_id: workspaceId,
          nombre: nombreEmpresa,
          website: url,
          email: analysis.contacto_email !== 'No encontrado' ? analysis.contacto_email : null,
          telefono: analysis.contacto_telefono !== 'No encontrado' ? analysis.contacto_telefono : null,
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
