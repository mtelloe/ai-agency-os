/**
 * Firecrawl: scraping + structured extraction
 * Fallback: Jina AI Reader (free, no API key needed)
 */

export interface FirecrawlResult {
  markdown: string;
  title: string;
  description: string;
  links: string[];
  sourceUrl: string;
  method: 'firecrawl' | 'jina' | 'none';
}

export interface ExtractedBusinessData {
  business_name: string | null;
  owner_name: string | null;
  owner_title: string | null;
  email: string | null;
  phone: string | null;
  whatsapp: string | null;
  address: string | null;
  cif_nif: string | null;
  social_instagram: string | null;
  social_facebook: string | null;
  social_linkedin: string | null;
  social_twitter: string | null;
  social_tiktok: string | null;
  social_youtube: string | null;
  booking_platform: string | null;
  technologies: string[];
  languages: string[];
  method: 'firecrawl-extract' | 'none';
}

// ─── Firecrawl Scrape ──────────────────────────────────────────────────────

export async function scrapeWithFirecrawl(url: string): Promise<FirecrawlResult> {
  const apiKey = process.env.FIRECRAWL_API_KEY;

  // Try Firecrawl first
  if (apiKey) {
    try {
      const res = await fetch('https://api.firecrawl.dev/v1/scrape', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          url,
          formats: ['markdown'],
          onlyMainContent: false,
          waitFor: 3000, // Wait for JS to render
        }),
        signal: AbortSignal.timeout(25000),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.success && data.data) {
          return {
            markdown: data.data.markdown || '',
            title: data.data.metadata?.title || '',
            description: data.data.metadata?.description || '',
            links: data.data.links || [],
            sourceUrl: data.data.metadata?.sourceURL || url,
            method: 'firecrawl',
          };
        }
      }
    } catch { /* fall through to Jina */ }
  }

  // Fallback: Jina AI Reader (free, no API key)
  return scrapeWithJina(url);
}

async function scrapeWithJina(url: string): Promise<FirecrawlResult> {
  try {
    const res = await fetch(`https://r.jina.ai/${url}`, {
      headers: {
        'Accept': 'application/json',
        'X-Return-Format': 'markdown',
      },
      signal: AbortSignal.timeout(20000),
    });

    if (!res.ok) throw new Error(`Jina ${res.status}`);

    const data = await res.json();
    return {
      markdown: data.data?.content || '',
      title: data.data?.title || '',
      description: data.data?.description || '',
      links: data.data?.links || [],
      sourceUrl: url,
      method: 'jina',
    };
  } catch {
    return { markdown: '', title: '', description: '', links: [], sourceUrl: url, method: 'none' };
  }
}

// ─── Firecrawl Extract (structured data via LLM) ───────────────────────────

export async function extractBusinessData(url: string): Promise<ExtractedBusinessData> {
  const apiKey = process.env.FIRECRAWL_API_KEY;
  if (!apiKey) return emptyExtraction();

  try {
    const res = await fetch('https://api.firecrawl.dev/v1/scrape', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        url,
        formats: ['extract'],
        extract: {
          schema: {
            type: 'object',
            properties: {
              business_name: { type: 'string', description: 'Nombre del negocio' },
              owner_name: { type: 'string', description: 'Nombre del propietario, director o responsable. Buscar en aviso legal, sobre nosotros, equipo.' },
              owner_title: { type: 'string', description: 'Cargo: CEO, Propietario, Director, Fundador, etc.' },
              email: { type: 'string', description: 'Email de contacto principal (info@, contacto@, etc.)' },
              phone: { type: 'string', description: 'Teléfono de contacto (formato español +34...)' },
              whatsapp: { type: 'string', description: 'Número de WhatsApp si tiene botón o enlace wa.me' },
              address: { type: 'string', description: 'Dirección física del negocio' },
              cif_nif: { type: 'string', description: 'CIF o NIF del negocio (del aviso legal)' },
              social_instagram: { type: 'string', description: 'URL o @usuario de Instagram' },
              social_facebook: { type: 'string', description: 'URL de Facebook' },
              social_linkedin: { type: 'string', description: 'URL de LinkedIn' },
              social_twitter: { type: 'string', description: 'URL o @usuario de X/Twitter' },
              social_tiktok: { type: 'string', description: 'URL o @usuario de TikTok' },
              social_youtube: { type: 'string', description: 'URL de YouTube' },
              booking_platform: { type: 'string', description: 'Plataforma de reservas: Treatwell, Booksy, Fresha, Doctolib, Calendly, etc.' },
              technologies: { type: 'array', items: { type: 'string' }, description: 'Tecnologías detectadas: WordPress, Wix, Shopify, Google Analytics, etc.' },
              languages: { type: 'array', items: { type: 'string' }, description: 'Idiomas disponibles en la web (es, en, ca, etc.)' },
            },
            required: ['business_name'],
          },
          prompt: 'Extrae TODOS los datos de contacto y del negocio. Busca especialmente en el aviso legal (obligatorio en España, siempre tiene nombre, CIF, teléfono, email). Busca también en la página de contacto, sobre nosotros, y footer. No inventes datos.',
        },
        waitFor: 3000,
      }),
      signal: AbortSignal.timeout(30000),
    });

    if (!res.ok) return emptyExtraction();

    const data = await res.json();
    if (!data.success || !data.data?.extract) return emptyExtraction();

    const ext = data.data.extract;
    return {
      business_name: ext.business_name || null,
      owner_name: ext.owner_name || null,
      owner_title: ext.owner_title || null,
      email: ext.email || null,
      phone: ext.phone || null,
      whatsapp: ext.whatsapp || null,
      address: ext.address || null,
      cif_nif: ext.cif_nif || null,
      social_instagram: ext.social_instagram || null,
      social_facebook: ext.social_facebook || null,
      social_linkedin: ext.social_linkedin || null,
      social_twitter: ext.social_twitter || null,
      social_tiktok: ext.social_tiktok || null,
      social_youtube: ext.social_youtube || null,
      booking_platform: ext.booking_platform || null,
      technologies: ext.technologies || [],
      languages: ext.languages || [],
      method: 'firecrawl-extract',
    };
  } catch {
    return emptyExtraction();
  }
}

function emptyExtraction(): ExtractedBusinessData {
  return {
    business_name: null, owner_name: null, owner_title: null,
    email: null, phone: null, whatsapp: null, address: null, cif_nif: null,
    social_instagram: null, social_facebook: null, social_linkedin: null,
    social_twitter: null, social_tiktok: null, social_youtube: null,
    booking_platform: null, technologies: [], languages: [],
    method: 'none',
  };
}
