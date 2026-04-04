import { NextRequest, NextResponse } from 'next/server';
import { createApiClient, getTokenFromRequest } from '@/lib/supabase/api-client';
import { callClaude } from '@/lib/ai/claude';
import { ANALYZE_BUSINESS_SYSTEM, buildAnalyzePrompt } from '@/lib/ai/prompts/analyze-business';
import { parseJsonResponse } from '@/lib/ai/parsers';
import { spendCredit, logActivity } from '@/lib/credits';

// ─── Constants ──────────────────────────────────────────────────────────────

const BROWSER_UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

// Ordered by priority: legal first (legally required in Spain), then contact, then about
const CONTACT_PATHS = [
  '/aviso-legal', '/legal', '/aviso_legal', '/avisolegal',
  '/politica-de-privacidad', '/politica-privacidad', '/privacidad', '/privacy',
  '/contacto', '/contact', '/contacta', '/contactar',
  '/sobre-nosotros', '/nosotros', '/about', '/quienes-somos',
  '/empresa', '/la-empresa', '/conocenos', '/quien-soy',
  '/equipo', '/team', '/nuestro-equipo',
  '/terminos-y-condiciones', '/terminos', '/cookies',
];

const PRIORITY_KEYWORDS = ['aviso-legal', 'legal', 'privacidad', 'privacy', 'contacto', 'contact'];

function isHighPriority(url: string): boolean {
  const path = new URL(url).pathname.toLowerCase();
  return PRIORITY_KEYWORDS.some(k => path.includes(k));
}

// ─── Fetch helpers ──────────────────────────────────────────────────────────

async function fetchPage(pageUrl: string, timeoutMs = 10000): Promise<{ html: string; status: number }> {
  try {
    const res = await fetch(pageUrl, {
      headers: {
        'User-Agent': BROWSER_UA,
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'es-ES,es;q=0.9,en;q=0.5',
      },
      signal: AbortSignal.timeout(timeoutMs),
      redirect: 'follow',
    });
    if (!res.ok) return { html: '', status: res.status };
    const ct = res.headers.get('content-type') || '';
    // Accept responses without content-type header (some servers omit it)
    if (ct && !ct.includes('text/') && !ct.includes('html') && !ct.includes('xml')) return { html: '', status: res.status };
    return { html: await res.text(), status: res.status };
  } catch {
    return { html: '', status: 0 };
  }
}

// ─── HTML → Text (preserving links) ────────────────────────────────────────

function htmlToText(html: string): string {
  let text = html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<!--[\s\S]*?-->/g, '');

  // Preserve links: <a href="URL">text</a> → "text (URL)"
  text = text.replace(/<a\s[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi, (_, href, linkText) => {
    const clean = linkText.replace(/<[^>]+>/g, '').trim();
    if (href.startsWith('#') || href.startsWith('javascript:')) return clean;
    return `${clean} (${href})`;
  });

  text = text.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  return text;
}

// ─── Extract contact from RAW HTML (before stripping tags) ──────────────────

function extractContactFromHtml(html: string): {
  emails: string[];
  phones: string[];
  whatsapp: string[];
  mailtoLinks: string[];
  telLinks: string[];
} {
  const emails = new Set<string>();
  const phones = new Set<string>();
  const whatsapp = new Set<string>();
  const mailtoLinks = new Set<string>();
  const telLinks = new Set<string>();

  // 1. mailto: links — most reliable email source
  const mailtos = html.matchAll(/href=["']mailto:([^"'?]+)/gi);
  for (const m of mailtos) {
    const email = m[1].trim().toLowerCase();
    if (email && !email.endsWith('.png') && !email.endsWith('.jpg')) {
      mailtoLinks.add(email);
      emails.add(email);
    }
  }

  // 2. tel: links — most reliable phone source
  const tels = html.matchAll(/href=["']tel:([^"']+)/gi);
  for (const m of tels) {
    const phone = m[1].replace(/\s/g, '').trim();
    if (phone.length >= 9) {
      telLinks.add(phone);
      phones.add(phone);
    }
  }

  // 3. WhatsApp links
  const waLinks = html.matchAll(/(?:wa\.me|api\.whatsapp\.com\/send\?phone=)(\d+)/gi);
  for (const m of waLinks) whatsapp.add(`+${m[1]}`);
  if (whatsapp.size === 0 && /wa\.me|whatsapp\.com\/send/i.test(html)) {
    const waFull = html.match(/(?:wa\.me|api\.whatsapp\.com\/send\?phone=)[^"'\s&]*/i);
    if (waFull) whatsapp.add(waFull[0]);
  }

  // 4. JSON-LD structured data (Schema.org)
  const jsonLdBlocks = html.matchAll(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi);
  for (const block of jsonLdBlocks) {
    try {
      const data = JSON.parse(block[1]);
      const items = Array.isArray(data) ? data : [data];
      for (const item of items) {
        if (item.telephone) phones.add(String(item.telephone).trim());
        if (item.email) emails.add(String(item.email).trim().toLowerCase());
        if (item.contactPoint) {
          const points = Array.isArray(item.contactPoint) ? item.contactPoint : [item.contactPoint];
          for (const cp of points) {
            if (cp.telephone) phones.add(String(cp.telephone).trim());
            if (cp.email) emails.add(String(cp.email).trim().toLowerCase());
          }
        }
        // Also check address for name
        if (item.founder?.name) emails.add(`NOMBRE_FUNDADOR: ${item.founder.name}`);
        if (item.name && (item['@type'] === 'Person' || item['@type'] === 'Organization')) {
          emails.add(`ENTIDAD: ${item.name}`);
        }
      }
    } catch { /* invalid JSON-LD, skip */ }
  }

  // 5. Regex fallback on text content — emails
  const textContent = html.replace(/<script[\s\S]*?<\/script>/gi, '').replace(/<style[\s\S]*?<\/style>/gi, '');
  const rawEmails = textContent.match(/[\w.+-]+@[\w-]+\.[\w.-]+/g) || [];
  for (const e of rawEmails) {
    if (!/\.(png|jpg|jpeg|gif|svg|webp|ico|css|js|woff|ttf|eot)$/i.test(e)) {
      emails.add(e.toLowerCase());
    }
  }

  // 6. Regex fallback — Spanish phones
  const phonePats = [
    /(?:\+34|0034)[\s.-]?[6-9]\d{1,2}[\s.-]?\d{2,3}[\s.-]?\d{2,3}[\s.-]?\d{0,3}/g,
    /\b[6789]\d{2}[\s.-]?\d{3}[\s.-]?\d{3}\b/g,
    /\b[6789]\d{2}[\s.-]?\d{2}[\s.-]?\d{2}[\s.-]?\d{2}\b/g,
  ];
  for (const pat of phonePats) {
    const matches = textContent.match(pat) || [];
    for (const p of matches) phones.add(p.trim());
  }

  // 7. CIF/NIF
  const cifs = textContent.match(/\b[A-Z]\d{7}[A-Z0-9]\b/g) || [];
  const nifs = textContent.match(/\b\d{8}[A-Z]\b/g) || [];
  for (const c of [...cifs, ...nifs]) emails.add(`CIF/NIF: ${c}`);

  return {
    emails: [...emails],
    phones: [...phones],
    whatsapp: [...whatsapp],
    mailtoLinks: [...mailtoLinks],
    telLinks: [...telLinks],
  };
}

// ─── Extract metadata from raw HTML ────────────────────────────────────────

function extractMetadata(html: string): string[] {
  const meta: string[] = [];

  if (/<meta[^>]*name=["']viewport["'][^>]*content=["'][^"']*width=device-width/i.test(html)) {
    meta.push('WEB RESPONSIVE: Sí (tiene meta viewport con width=device-width)');
  }
  if (/@media\s*\([^)]*max-width|@media\s*\([^)]*min-width/i.test(html)) {
    meta.push('CSS RESPONSIVE: Sí (tiene media queries adaptativas)');
  }

  const platforms: string[] = [];
  if (/treatwell\.es|treatwell\.com/i.test(html)) platforms.push('Treatwell');
  if (/booksy\.com/i.test(html)) platforms.push('Booksy');
  if (/fresha\.com/i.test(html)) platforms.push('Fresha');
  if (/doctolib/i.test(html)) platforms.push('Doctolib');
  if (/booking\.com/i.test(html)) platforms.push('Booking.com');
  if (/thefork\.com|eltenedor/i.test(html)) platforms.push('TheFork');
  if (/calendly\.com/i.test(html)) platforms.push('Calendly');
  if (platforms.length) meta.push(`PLATAFORMAS DE RESERVA/PRECIOS: ${platforms.join(', ')}`);

  if (/maps\.google|google\.com\/maps|goo\.gl\/maps/i.test(html)) meta.push('GOOGLE MAPS: Detectado');
  if (/woocommerce|shopify|prestashop|añadir al carrito|add.to.cart/i.test(html)) meta.push('TIENDA ONLINE: Detectada');

  if (/wp-content|wordpress/i.test(html)) meta.push('CMS: WordPress');
  else if (/wix\.com/i.test(html)) meta.push('CMS: Wix');
  else if (/squarespace/i.test(html)) meta.push('CMS: Squarespace');
  else if (/webflow/i.test(html)) meta.push('CMS: Webflow');

  return meta;
}

// ─── Social links extraction ───────────────────────────────────────────────

function extractSocials(text: string, html: string): string[] {
  const combined = text + ' ' + html;
  const socials: string[] = [];

  const fbMatch = combined.match(/(?:facebook\.com|fb\.com)\/[a-zA-Z0-9._-]+/i);
  if (fbMatch) socials.push(`Facebook: ${fbMatch[0]}`);
  else if (/facebook\.com|fb\.com/i.test(combined)) socials.push('Facebook (enlace detectado)');

  const igMatch = combined.match(/instagram\.com\/([a-zA-Z0-9._]+)/i);
  if (igMatch) socials.push(`Instagram: @${igMatch[1]}`);
  else if (/instagram\.com/i.test(combined)) socials.push('Instagram (enlace detectado)');

  const liMatch = combined.match(/linkedin\.com\/(?:company|in)\/([a-zA-Z0-9._-]+)/i);
  if (liMatch) socials.push(`LinkedIn: ${liMatch[0]}`);
  else if (/linkedin\.com/i.test(combined)) socials.push('LinkedIn (enlace detectado)');

  const twMatch = combined.match(/(?:twitter\.com|x\.com)\/([a-zA-Z0-9._]+)/i);
  if (twMatch) socials.push(`X/Twitter: @${twMatch[1]}`);

  const tkMatch = combined.match(/tiktok\.com\/@?([a-zA-Z0-9._]+)/i);
  if (tkMatch) socials.push(`TikTok: @${tkMatch[1]}`);

  if (/youtube\.com/i.test(combined)) socials.push('YouTube (enlace detectado)');

  return socials;
}

// ─── Language detection ────────────────────────────────────────────────────

function detectLanguages(html: string): string[] {
  const langs: string[] = [];
  const langAttr = html.match(/<html[^>]*lang=["']([a-z]{2})/i);
  if (langAttr) langs.push(langAttr[1]);

  const hreflangs = [...html.matchAll(/hreflang=["']([a-z]{2})/gi)];
  for (const m of hreflangs) {
    const l = m[1].toLowerCase();
    if (!langs.includes(l)) langs.push(l);
  }

  if (/wpml|polylang|translatepress|gtranslate/i.test(html)) {
    if (!langs.includes('multiidioma')) langs.push('multiidioma');
  }

  return langs.length > 0 ? langs : ['es'];
}

// ─── Main scraper — Apify first, direct fetch as supplement ────────────────

async function scrapeUrl(url: string) {
  const baseUrl = new URL(url);
  const debugLog: string[] = [];

  // Build the list of URLs to scrape (homepage + legal/contact pages)
  const startUrls = [
    url,
    `${baseUrl.origin}/aviso-legal`,
    `${baseUrl.origin}/contacto`,
    `${baseUrl.origin}/politica-de-privacidad`,
    `${baseUrl.origin}/sobre-nosotros`,
  ];

  // ─── Strategy 1: Apify (reliable, handles anti-bot) ───
  const apifyResult = await scrapeWithApify(startUrls, debugLog);
  if (apifyResult) return apifyResult;

  // ─── Strategy 2: Direct fetch (fallback, may be blocked) ───
  debugLog.push('Apify no disponible — intentando fetch directo');
  return directScrape(url, debugLog);
}

async function scrapeWithApify(
  startUrls: string[],
  debugLog: string[],
) {
  const token = process.env.APIFY_API_TOKEN;
  if (!token) {
    debugLog.push('⚠ APIFY_API_TOKEN no configurado');
    return null;
  }

  try {
    // Apify website-content-crawler with multiple start URLs
    // This crawls each URL we give it + follows links up to depth 1
    const res = await fetch(
      `https://api.apify.com/v2/acts/apify~website-content-crawler/run-sync-get-dataset-items?token=${token}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          startUrls: startUrls.map(u => ({ url: u })),
          maxCrawlPages: 8,
          maxCrawlDepth: 1,
          crawlerType: 'playwright', // Full browser — handles JS rendering, Cloudflare, etc.
          requestHandlerTimeoutSecs: 30,
          maxRequestRetries: 2,
        }),
        signal: AbortSignal.timeout(55000),
      }
    );

    if (!res.ok) {
      debugLog.push(`Apify error: ${res.status} ${res.statusText}`);
      return null;
    }

    const items = await res.json();
    if (!items?.length) {
      debugLog.push('Apify: 0 resultados');
      return null;
    }

    debugLog.push(`Apify: ${items.length} páginas scrapeadas`);

    // Process all pages
    const textParts: string[] = [];
    const allHtmlParts: string[] = [];
    let title = '';
    let description = '';
    let headings: string[] = [];

    for (const page of items as Array<{ url?: string; text?: string; html?: string; metadata?: { title?: string; description?: string; headers?: { h1?: string[] } } }>) {
      const pageUrl = page.url || '';
      const pageText = (page.text || '').slice(0, isHighPriority(pageUrl) ? 4000 : 2500);
      debugLog.push(`  ${pageUrl}: ${pageText.length} chars texto, ${(page.html || '').length} chars html`);

      if (pageText.length > 100) {
        textParts.push(`--- Página: ${pageUrl} ---\n${pageText}`);
      }
      if (page.html) allHtmlParts.push(page.html);

      // First page with metadata = main page
      if (!title && page.metadata?.title) {
        title = page.metadata.title;
        description = page.metadata.description || '';
        headings = page.metadata.headers?.h1 || [];
      }
    }

    const allText = textParts.join('\n\n');
    const allHtml = allHtmlParts.join('\n');

    // Extract contact from raw HTML
    const contactData = extractContactFromHtml(allHtml);
    const contactInfo = buildContactString(contactData);

    // Metadata
    const metadata = extractMetadata(allHtml);
    if (contactData.whatsapp.length) metadata.push(`WHATSAPP: ${contactData.whatsapp.join(', ')}`);

    const detectedLangs = detectLanguages(allHtml);
    const langInfo = detectedLangs.length > 1
      ? `\n--- Idiomas: ${detectedLangs.join(', ')} (multiidioma) ---`
      : `\n--- Idioma: ${detectedLangs[0] || 'es'} ---`;

    return {
      url: startUrls[0],
      title,
      description,
      headings,
      bodyText: allText + langInfo
        + (metadata.length ? `\n--- Datos técnicos detectados ---\n${metadata.join('\n')}` : '')
        + `\n--- Debug ---\n${debugLog.join('\n')}`,
      contactInfo,
      socialLinks: extractSocials(allText, allHtml),
    };
  } catch (err) {
    debugLog.push(`Apify exception: ${String(err)}`);
    return null;
  }
}

// ─── Direct fetch fallback ─────────────────────────────────────────────────

async function directScrape(url: string, debugLog: string[]) {
  const baseUrl = new URL(url);
  const allHtmlParts: string[] = [];

  try {
    const { html: mainHtml, status } = await fetchPage(url);
    debugLog.push(`Homepage: ${status} — ${mainHtml.length} bytes`);

    if (!mainHtml) {
      return { url, title: '', description: '', headings: [], bodyText: `[No se pudo acceder a ${url} — sitio bloqueado]\n${debugLog.join('\n')}`, contactInfo: '', socialLinks: [] };
    }

    allHtmlParts.push(mainHtml);
    const titleMatch = mainHtml.match(/<title[^>]*>(.*?)<\/title>/i);
    const descMatch = mainHtml.match(/<meta[^>]*name=["']description["'][^>]*content=["'](.*?)["']/i);
    const h1Matches = [...mainHtml.matchAll(/<h1[^>]*>(.*?)<\/h1>/gi)].map(m => m[1].replace(/<[^>]+>/g, ''));
    const mainText = htmlToText(mainHtml).slice(0, 3000);

    // Find links in HTML + try common paths
    const foundLinks = new Set<string>();
    for (const match of mainHtml.matchAll(/href=["']([^"'#]+)["']/gi)) {
      const href = match[1].toLowerCase();
      if (CONTACT_PATHS.some(p => href.includes(p)) ||
          /legal|contact|privac|aviso|nosotros|about|equipo|empresa/i.test(href)) {
        try {
          const full = new URL(match[1], baseUrl.origin).href;
          if (new URL(full).hostname === baseUrl.hostname) foundLinks.add(full);
        } catch { /* skip */ }
      }
    }
    for (const p of ['/aviso-legal', '/contacto', '/politica-de-privacidad', '/sobre-nosotros', '/legal', '/nosotros']) {
      foundLinks.add(`${baseUrl.origin}${p}`);
    }

    const allLinks = [...foundLinks].sort((a, b) => (isHighPriority(a) ? 0 : 1) - (isHighPriority(b) ? 0 : 1));
    const pageResults = await Promise.all(
      allLinks.slice(0, 8).map(async (pageUrl) => {
        const { html, status: s } = await fetchPage(pageUrl, 8000);
        debugLog.push(`  ${new URL(pageUrl).pathname}: ${s} — ${html.length} bytes`);
        return { pageUrl, html };
      })
    );

    const extraParts: string[] = [];
    for (const { pageUrl, html } of pageResults) {
      if (!html || html.length < 200) continue;
      allHtmlParts.push(html);
      const limit = isHighPriority(pageUrl) ? 4000 : 2000;
      extraParts.push(`\n--- Página: ${pageUrl} ---\n${htmlToText(html).slice(0, limit)}`);
    }

    const allText = mainText + extraParts.join('\n');
    const allRawHtml = allHtmlParts.join('\n');
    const contactData = extractContactFromHtml(allRawHtml);
    const contactInfo = buildContactString(contactData);

    const metadata = extractMetadata(allRawHtml);
    if (contactData.whatsapp.length) metadata.push(`WHATSAPP: ${contactData.whatsapp.join(', ')}`);

    const detectedLangs = detectLanguages(mainHtml);
    const langInfo = detectedLangs.length > 1
      ? `\n--- Idiomas: ${detectedLangs.join(', ')} ---`
      : `\n--- Idioma: ${detectedLangs[0] || 'es'} ---`;

    return {
      url,
      title: titleMatch?.[1] || '',
      description: descMatch?.[1] || '',
      headings: h1Matches,
      bodyText: allText + langInfo
        + (metadata.length ? `\n--- Datos técnicos detectados ---\n${metadata.join('\n')}` : '')
        + `\n--- Debug (fetch directo) ---\n${debugLog.join('\n')}`,
      contactInfo,
      socialLinks: extractSocials(allText, allRawHtml),
    };
  } catch (err) {
    return { url, title: '', description: '', headings: [], bodyText: `[Error: ${String(err)}]`, contactInfo: '', socialLinks: [] };
  }
}

// ─── Contact string builder ────────────────────────────────────────────────

function buildContactString(contactData: ReturnType<typeof extractContactFromHtml>): string {
  const parts: string[] = [];
  if (contactData.mailtoLinks.length) parts.push(`Emails (mailto): ${contactData.mailtoLinks.join(', ')}`);
  if (contactData.telLinks.length) parts.push(`Teléfonos (tel:): ${contactData.telLinks.join(', ')}`);
  if (contactData.whatsapp.length) parts.push(`WhatsApp: ${contactData.whatsapp.join(', ')}`);

  const realEmails = contactData.emails.filter(e => !e.startsWith('CIF') && !e.startsWith('NOMBRE') && !e.startsWith('ENTIDAD'));
  if (realEmails.length) parts.push(`Todos los emails: ${realEmails.join(', ')}`);
  if (contactData.phones.length) parts.push(`Todos los teléfonos: ${contactData.phones.join(', ')}`);

  const entities = contactData.emails.filter(e => e.startsWith('CIF/NIF:') || e.startsWith('NOMBRE_FUNDADOR:') || e.startsWith('ENTIDAD:'));
  if (entities.length) parts.push(`Datos de entidad: ${entities.join(', ')}`);

  return parts.join('\n');
}

// ─── Google search for contact (supplementary) ─────────────────────────────

async function searchGoogleForContact(businessName: string, websiteUrl: string): Promise<string> {
  const apifyToken = process.env.APIFY_API_TOKEN;
  if (!apifyToken) return '';

  try {
    const domain = new URL(websiteUrl).hostname.replace('www.', '');
    const queries = [
      `"${businessName}" CEO OR director OR propietario OR fundador site:linkedin.com`,
      `"${businessName}" "${domain}" email contacto responsable`,
    ];

    const searchResults: string[] = [];

    for (const query of queries) {
      try {
        const res = await fetch(
          `https://api.apify.com/v2/acts/apify~google-search-scraper/run-sync-get-dataset-items?token=${apifyToken}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ queries: query, maxPagesPerQuery: 1, resultsPerPage: 5, languageCode: 'es', countryCode: 'es' }),
            signal: AbortSignal.timeout(30000),
          }
        );
        if (!res.ok) continue;

        const items = await res.json();
        for (const item of items) {
          if (item.organicResults) {
            for (const result of item.organicResults.slice(0, 5)) {
              const text = [result.title, result.description, result.url].filter(Boolean).join(' — ');
              if (text.length > 20) searchResults.push(text);
            }
          }
        }
        if (searchResults.length >= 3) break;
      } catch { continue; }
    }

    if (searchResults.length === 0) return '';
    return `Resultados de búsqueda en Google/LinkedIn para "${businessName}":\n${searchResults.join('\n')}`;
  } catch {
    return '';
  }
}

// ─── API Route ─────────────────────────────────────────────────────────────

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
      return NextResponse.json({ error: 'URL demasiado larga (máximo 2048 caracteres)' }, { status: 400 });
    }

    // SSRF protection
    try {
      const parsed = new URL(url);
      if (!['http:', 'https:'].includes(parsed.protocol)) {
        return NextResponse.json({ error: 'URL inválida: solo se permiten URLs http/https' }, { status: 400 });
      }
      const hostname = parsed.hostname.toLowerCase();
      if (
        hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '0.0.0.0' ||
        hostname.startsWith('10.') || hostname.startsWith('192.168.') || hostname.startsWith('172.') ||
        hostname.endsWith('.local') || hostname.endsWith('.internal') ||
        hostname === '169.254.169.254' || hostname === 'metadata.google.internal'
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

    // Scrape website
    const scraped = await scrapeUrl(url);

    // Supplementary Google search
    const googleContactInfo = await searchGoogleForContact(scraped.title || new URL(url).hostname, url);
    if (googleContactInfo) {
      scraped.bodyText += `\n\n--- Resultados de búsqueda en Google/LinkedIn ---\n${googleContactInfo}`;
    }

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
