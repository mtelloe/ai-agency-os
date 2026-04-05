/**
 * Prompts for the multi-source audit pipeline
 */

// ─── Visual Analysis Prompt (Claude Vision) ────────────────────────────────

export const VISUAL_ANALYSIS_SYSTEM = `Eres un experto en diseño web y UX. Analiza screenshots de webs de negocios españoles.
Escribe SIEMPRE en español de España. Sé conciso y específico.
Responde SOLO con JSON válido, sin markdown, sin backticks.`;

export function buildVisualPrompt(url: string): string {
  return `Analiza estas capturas de pantalla (desktop y/o móvil) de ${url}.

Evalúa y responde en JSON:
{
  "impresion_general": "Primera impresión en 1 frase (profesional, amateur, moderna, anticuada, etc.)",
  "calidad_diseno": "alta/media/baja — con justificación breve",
  "colores_marca": "Descripción de la paleta de colores y si es coherente",
  "cta_visible": true/false,
  "cta_texto": "Texto del CTA principal si existe (Reservar, Contactar, etc.)",
  "fotos_calidad": "profesionales/stock/amateur/sin fotos",
  "navegacion_clara": true/false,
  "contenido_above_fold": "Qué se ve sin hacer scroll — describe brevemente",
  "responsive_visual": "Si ves versión móvil: se adapta bien o se ve mal",
  "puntos_fuertes_visuales": ["Punto 1", "Punto 2"],
  "problemas_visuales": ["Problema 1", "Problema 2"]
}

Sé honesto pero justo. Si la web se ve profesional, dilo. Si se ve amateur, dilo también.`;
}

// ─── Final Synthesis Prompt ─────────────────────────────────────────────────

export const AUDIT_SYNTHESIS_SYSTEM = `Eres un consultor experto en transformación digital e IA para PYMEs en España.
Recibes datos REALES verificados de múltiples fuentes (PageSpeed, Google Places, scraping, análisis visual).
Tu trabajo es sintetizar TODO en un informe de auditoría preciso y útil.

IMPORTANTE:
- Español de España. Tutea siempre.
- Los datos de PageSpeed, Google Places y extracción automática son HECHOS — no los contradigas.
- Si PageSpeed dice "performance: 45", la web es lenta. Si dice "90", es rápida. Usa los números reales.
- Si Google Places tiene teléfono/reviews, son datos reales del negocio.
- Si la extracción automática encontró email/teléfono, úsalos directamente.
- El análisis visual describe lo que se VE en la web — confía en él.
- NO inventes problemas. Solo reporta lo que los datos demuestran.
- SÉ JUSTO: reconoce lo que hacen bien antes de señalar lo que falta.

REGLA CRÍTICA SOBRE PLATAFORMAS EXTERNAS:
- Si hay plataformas de reserva detectadas (Booksy, Treatwell, Fresha, Mindbody, etc.) → el negocio SÍ TIENE sistema de reservas y precios online. NO digas "no tienen precios visibles" ni "no tienen sistema de reservas". El hecho de que los precios estén en una plataforma externa y no en la propia web es normal y válido.
- Si hay WhatsApp detectado → SÍ tienen canal de contacto directo. NO digas "no tienen forma de contacto rápida".
- Si hay link a Glovo/UberEats/JustEat → SÍ tienen delivery. NO digas "no ofrecen delivery".
- En los problemas, puedes SUGERIR que centralicen precios en su propia web como mejora, pero NO como si fuera un fallo o ausencia. La diferencia es: "Podrían mostrar precios directamente en su web además de en Booksy" (sugerencia) vs "No tienen precios visibles" (falso).

Responde SIEMPRE en JSON válido (sin markdown, sin backticks):

{
  "resumen_negocio": "Descripción del negocio en 2-3 frases",
  "cliente_ideal": "Perfil del cliente ideal",
  "servicios": "Servicios/productos principales",
  "idiomas_web": ["es", "en"],
  "tiene_multiidioma": false,
  "redes_sociales_detectadas": ["Instagram: @usuario", "Facebook: /pagina"],
  "tecnologias_detectadas": ["WordPress", "Google Analytics"],
  "plataformas_reserva": ["Treatwell", "Booksy"],
  "tiene_whatsapp": true,
  "tiene_tienda_online": false,
  "problemas": ["Problema 1 — basado en datos reales", "Problema 2"],
  "oportunidades": ["Oportunidad 1", "Oportunidad 2"],
  "automatizaciones_recomendadas": [
    {"nombre": "Nombre", "descripcion": "Qué hace", "impacto": "Alto/Medio/Bajo"}
  ],
  "agentes_recomendados": [
    {"nombre": "Nombre", "tipo": "chat_web/whatsapp/reservas", "descripcion": "Qué hace", "precio": 200}
  ],
  "mejoras_web": ["Mejora 1 basada en datos", "Mejora 2"],
  "analisis_visual": "Resumen del análisis visual (diseño, UX, primera impresión)",
  "pagespeed_resumen": "Resumen de rendimiento: Performance X/100, SEO Y/100, LCP, etc.",
  "google_reviews_resumen": "Rating X/5 con N reseñas — qué implica",
  "roi_estimado": "ROI esperado con cifras concretas basadas en lo que realmente falta",
  "pricing_sugerido": {"setup": 1500, "mensual": 300},
  "score_oportunidad": 75,
  "contacto_nombre": "Nombre del propietario/responsable",
  "contacto_cargo": "Cargo",
  "contacto_email": "Email",
  "contacto_telefono": "Teléfono"
}

REGLAS PARA EL SCORE (0-100):
- 80-100: Negocio con web mala/inexistente + sin presencia digital → MUCHA oportunidad
- 60-79: Negocio con web decente pero sin automatización → oportunidad media
- 40-59: Negocio ya digitalizado pero con margen de mejora → oportunidad moderada
- 20-39: Negocio bien digitalizado, poco margen → baja oportunidad
- 0-19: Negocio con todo resuelto → casi sin oportunidad

REGLAS PARA CONTACTO:
- Prioridad 1: Datos de extracción automática (Firecrawl/Jina)
- Prioridad 2: Google Places (teléfono, dirección)
- Prioridad 3: Datos en el contenido de la web
- Si tienes email genérico (info@, contacto@), úsalo. Es mejor que "No encontrado".
- NUNCA inventes un nombre o email.`;

export function buildSynthesisPrompt(data: {
  url: string;
  markdown: string;
  title: string;
  description: string;
  scrapingMethod: string;
  extractedData: Record<string, unknown> | null;
  extractionMethod: string;
  pagespeedMobile: Record<string, unknown> | null;
  pagespeedDesktop: Record<string, unknown> | null;
  placesData: Record<string, unknown> | null;
  visualAnalysis: string | null;
  hasScreenshots: boolean;
  detectedPlatforms: string[];
}): string {
  const parts: string[] = [];

  parts.push(`=== AUDITORÍA DE: ${data.url} ===`);
  parts.push(`Título: ${data.title || 'No disponible'}`);
  parts.push(`Meta descripción: ${data.description || 'No disponible'}`);

  // Detected platforms — CRITICAL for accurate audit
  if (data.detectedPlatforms.length > 0) {
    parts.push(`\n=== PLATAFORMAS EXTERNAS DETECTADAS (enlaces encontrados en la web) ===`);
    parts.push(`IMPORTANTE: El negocio ENLAZA a estas plataformas desde su web:`);
    for (const p of data.detectedPlatforms) {
      parts.push(`  ✓ ${p}`);
    }
    parts.push(`→ Si hay plataformas de reserva (Booksy, Treatwell, Fresha, etc.) = el negocio SÍ tiene sistema de citas y precios online, aunque no estén directamente en su web.`);
    parts.push(`→ Si hay WhatsApp = SÍ tienen contacto directo.`);
    parts.push(`→ NO digas que "no tienen precios visibles" o "no tienen sistema de reservas" si hay una plataforma de reservas enlazada.`);
  }

  // Extracted business data
  if (data.extractedData && data.extractionMethod !== 'none') {
    parts.push(`\n=== DATOS EXTRAÍDOS AUTOMÁTICAMENTE (${data.extractionMethod}) ===`);
    parts.push(JSON.stringify(data.extractedData, null, 2));
  }

  // Google Places
  if (data.placesData) {
    parts.push(`\n=== DATOS DE GOOGLE MAPS/PLACES (verificados) ===`);
    parts.push(JSON.stringify(data.placesData, null, 2));
  }

  // PageSpeed
  if (data.pagespeedMobile) {
    parts.push(`\n=== PAGESPEED — MÓVIL (datos reales de Google Lighthouse) ===`);
    parts.push(JSON.stringify(data.pagespeedMobile, null, 2));
  }
  if (data.pagespeedDesktop) {
    parts.push(`\n=== PAGESPEED — DESKTOP ===`);
    parts.push(JSON.stringify(data.pagespeedDesktop, null, 2));
  }

  // Visual analysis
  if (data.visualAnalysis) {
    parts.push(`\n=== ANÁLISIS VISUAL (de los screenshots) ===`);
    parts.push(data.visualAnalysis);
  }

  // Web content
  parts.push(`\n=== CONTENIDO DE LA WEB (markdown, ${data.scrapingMethod}) ===`);
  parts.push(data.markdown.slice(0, 6000));

  parts.push(`\nGenera el JSON de auditoría completo. USA los datos reales de arriba, NO inventes. Si hay plataformas de reserva detectadas, el negocio SÍ tiene precios y reservas online.`);

  return parts.join('\n');
}
