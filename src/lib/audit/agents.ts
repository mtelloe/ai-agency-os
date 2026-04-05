/**
 * Multi-agent audit pipeline — 3 agents
 *
 * 1. Verificador de Hechos — structured fact sheet from raw data
 * 2. Auditor + Estratega — analysis + what's MISSING + concrete service proposals
 * 3. Control de Calidad — cross-check against verified data, remove hallucinations
 */

import { callClaude } from '@/lib/ai/claude';
import { parseJsonResponse } from '@/lib/ai/parsers';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface FactSheet {
  nombre_negocio: string;
  sector: string;
  ubicacion: string;
  contacto: {
    nombre_titular: string | null;
    cargo: string | null;
    email: string | null;
    telefono: string | null;
    whatsapp: boolean;
    direccion: string | null;
    nif_cif: string | null;
    fuente: string;
  };
  presencia_digital: {
    tiene_web: boolean;
    calidad_web: string;
    plataformas_reserva: string[];
    redes_sociales: Array<{ red: string; url: string; seguidores?: string }>;
    delivery: string[];
    pagos_online: string[];
    email_marketing: boolean;
    tiene_blog: boolean;
    tiene_tienda_online: boolean;
    tiene_chatbot: boolean;
    tiene_crm: boolean;
    tiene_automatizaciones: boolean;
  };
  rendimiento_web: {
    mobile: { performance: number; seo: number; accessibility: number; best_practices: number } | null;
    desktop: { performance: number; seo: number; accessibility: number; best_practices: number } | null;
  };
  google_maps: {
    rating: number | null;
    num_reviews: number | null;
    estado: string | null;
  };
  analisis_visual: string | null;
  idiomas: string[];
  tecnologias: string[];
}

export interface QualityCheckedAudit {
  resumen_negocio: string;
  cliente_ideal: string;
  servicios: string;
  lo_que_hace_bien: string[];
  problemas: string[];
  oportunidades: string[];
  servicios_a_ofrecer: Array<{
    servicio: string;
    porque: string;
    evidencia: string;
    prioridad: 'alta' | 'media' | 'baja';
    precio_estimado: number;
  }>;
  automatizaciones_recomendadas: Array<{ nombre: string; descripcion: string; impacto: string }>;
  agentes_recomendados: Array<{ nombre: string; tipo: string; descripcion: string; precio: number }>;
  mejoras_web: string[];
  analisis_visual: string;
  pagespeed_resumen: string;
  google_reviews_resumen: string;
  roi_estimado: string;
  pricing_sugerido: { setup: number; mensual: number };
  score_oportunidad: number;
  contacto_nombre: string;
  contacto_cargo: string;
  contacto_email: string;
  contacto_telefono: string;
  correcciones_realizadas: string[];
}

// ─── Agent 1: Verificador de Hechos ──────────────────────────────────────────

const FACT_CHECKER_SYSTEM = `Eres un verificador de datos. Tu ÚNICO trabajo es organizar datos RAW en un informe estructurado de HECHOS.

REGLAS:
- Solo reporta lo que puedes demostrar con los datos que recibes.
- Si un dato existe en CUALQUIER fuente, repórtalo como existente.
- Si un dato NO aparece en NINGUNA fuente, repórtalo como ausente.
- NUNCA interpretes ni opines. Solo hechos.
- Busca el aviso legal en el contenido web — en España contiene nombre, NIF, dirección, email, teléfono obligatoriamente.
- Detecta si tiene chatbot, CRM, automatizaciones, email marketing — busca indicios en el contenido y tecnologías.

Responde SOLO con JSON válido (sin markdown, sin backticks).`;

function buildFactCheckerPrompt(data: {
  url: string;
  markdown: string;
  title: string;
  description: string;
  extractedData: Record<string, unknown> | null;
  pagespeedMobile: Record<string, unknown> | null;
  pagespeedDesktop: Record<string, unknown> | null;
  placesData: Record<string, unknown> | null;
  visualAnalysis: string | null;
  detectedPlatforms: string[];
}): string {
  const parts: string[] = [];

  parts.push(`Organiza los siguientes datos RAW de ${data.url} en un informe de hechos verificados.`);

  if (data.detectedPlatforms.length > 0) {
    parts.push(`\n--- PLATAFORMAS DETECTADAS EN LINKS (HECHO VERIFICADO) ---`);
    for (const p of data.detectedPlatforms) {
      parts.push(`  * ${p}`);
    }
  }

  if (data.extractedData) {
    parts.push(`\n--- DATOS EXTRAÍDOS POR FIRECRAWL ---`);
    parts.push(JSON.stringify(data.extractedData, null, 2));
  }

  if (data.placesData) {
    parts.push(`\n--- DATOS DE GOOGLE PLACES ---`);
    parts.push(JSON.stringify(data.placesData, null, 2));
  }

  if (data.pagespeedMobile) {
    parts.push(`\n--- PAGESPEED MÓVIL (Lighthouse) ---`);
    parts.push(JSON.stringify(data.pagespeedMobile, null, 2));
  }
  if (data.pagespeedDesktop) {
    parts.push(`\n--- PAGESPEED DESKTOP (Lighthouse) ---`);
    parts.push(JSON.stringify(data.pagespeedDesktop, null, 2));
  }

  if (data.visualAnalysis) {
    parts.push(`\n--- ANÁLISIS VISUAL DE SCREENSHOTS ---`);
    parts.push(data.visualAnalysis);
  }

  // Send more content + search for aviso legal specifically
  const fullMarkdown = data.markdown;
  const avisoLegalIdx = fullMarkdown.toLowerCase().indexOf('aviso legal');
  const politicaIdx = fullMarkdown.toLowerCase().indexOf('política de privacidad');

  let contentToSend = fullMarkdown.slice(0, 10000);

  if (avisoLegalIdx > 10000) {
    contentToSend += `\n\n--- [AVISO LEGAL encontrado en posición ${avisoLegalIdx}] ---\n`;
    contentToSend += fullMarkdown.slice(avisoLegalIdx, avisoLegalIdx + 3000);
  }
  if (politicaIdx > 10000 && politicaIdx !== avisoLegalIdx) {
    contentToSend += `\n\n--- [POLÍTICA DE PRIVACIDAD encontrada en posición ${politicaIdx}] ---\n`;
    contentToSend += fullMarkdown.slice(politicaIdx, politicaIdx + 2000);
  }

  parts.push(`\n--- CONTENIDO WEB (título: ${data.title || 'N/A'}) ---`);
  parts.push(`Meta: ${data.description || 'N/A'}`);
  parts.push(contentToSend);

  parts.push(`\nResponde con este JSON exacto:
{
  "nombre_negocio": "nombre real del negocio",
  "sector": "sector/industria",
  "ubicacion": "ciudad/dirección si disponible",
  "contacto": {
    "nombre_titular": "del aviso legal o extracción | null",
    "cargo": "si disponible | null",
    "email": "email verificado | null",
    "telefono": "teléfono verificado | null",
    "whatsapp": true/false,
    "direccion": "dirección completa | null",
    "nif_cif": "NIF/CIF del aviso legal | null",
    "fuente": "de dónde sacaste los datos (aviso_legal/firecrawl/google_places/web)"
  },
  "presencia_digital": {
    "tiene_web": true,
    "calidad_web": "profesional/básica/anticuada/sin_web",
    "plataformas_reserva": ["Booksy", "etc"],
    "redes_sociales": [{"red": "Instagram", "url": "url", "seguidores": "10K si disponible"}],
    "delivery": ["Glovo", "etc"],
    "pagos_online": ["PayPal", "etc"],
    "email_marketing": true/false,
    "tiene_blog": true/false,
    "tiene_tienda_online": true/false,
    "tiene_chatbot": true/false,
    "tiene_crm": true/false,
    "tiene_automatizaciones": true/false
  },
  "rendimiento_web": {
    "mobile": {"performance": 78, "seo": 92, "accessibility": 88, "best_practices": 90},
    "desktop": {"performance": 95, "seo": 95, "accessibility": 90, "best_practices": 92}
  },
  "google_maps": {
    "rating": 4.8,
    "num_reviews": 247,
    "estado": "OPERATIONAL"
  },
  "analisis_visual": "resumen del análisis visual si disponible | null",
  "idiomas": ["es"],
  "tecnologias": ["WordPress", "etc"]
}`);

  return parts.join('\n');
}

// ─── Agent 2: Auditor + Estratega (combinado) ───────────────────────────────

const AUDITOR_SYSTEM = `Eres un consultor de negocio digital para PYMEs en España. Recibes HECHOS VERIFICADOS de un negocio.

Tu trabajo tiene DOS partes:

PARTE 1 — DIAGNÓSTICO HONESTO:
- Los hechos son VERDAD. No los contradigas.
- "lo_que_hace_bien" es OBLIGATORIO.
- "problemas" = SOLO lo que FALTA o HACE MAL según los hechos.
- Si tiene Booksy → NO es un problema. Si tiene Instagram → NO le faltan redes.

PARTE 2 — QUÉ VENDERLE (lo más importante):
Para cada cosa que NO TIENE o HACE MAL, propón un servicio concreto.
Piensa como un vendedor: ¿qué le puedo ofrecer que REALMENTE necesite?

Ejemplos de servicios concretos según lo que FALTA:
- No tiene chatbot → "Agente IA para atención 24/7 en web"
- Web lenta (PageSpeed < 50) → "Optimización de velocidad web"
- No tiene automatizaciones → "Automatización de seguimiento post-visita"
- No tiene email marketing → "Sistema de email marketing automatizado"
- Pocas reseñas Google → "Estrategia de generación de reseñas"
- No tiene reservas online → "Sistema de reservas integrado en web"
- Web anticuada → "Rediseño web profesional"
- No tiene blog/SEO → "Estrategia de contenido y SEO local"
- Sin presencia en redes → "Gestión de redes sociales"

SCORE = cuánto nos necesita (oportunidad de venta):
- 85-100: Sin web o web inútil, sin nada digital → oportunidad máxima
- 70-84: Web básica, le faltan varias cosas importantes → alta
- 50-69: Web decente pero le faltan automatización, chatbot, SEO → media
- 30-49: Web buena, tiene lo esencial, le faltan extras → baja-media
- 15-29: Todo bien, solo mejoras puntuales → baja
- 0-14: Completamente digitalizado → casi nada que ofrecer

Español de España. Tutea.
Responde SOLO con JSON válido (sin markdown, sin backticks).`;

function buildAuditorPrompt(url: string, factSheet: FactSheet): string {
  return `Analiza este negocio y propón servicios concretos para lo que le FALTA:

URL: ${url}

=== HECHOS VERIFICADOS ===
${JSON.stringify(factSheet, null, 2)}

Responde con este JSON:
{
  "resumen_negocio": "Qué es, qué hace, en 2-3 frases",
  "cliente_ideal": "Perfil del cliente ideal de este negocio",
  "servicios": "Servicios/productos principales del negocio",
  "lo_que_hace_bien": ["Punto fuerte 1", "Punto fuerte 2"],
  "problemas": ["Solo problemas REALES demostrados por los hechos"],
  "oportunidades": ["Solo lo que NO TIENEN y aportaría valor"],
  "servicios_a_ofrecer": [
    {
      "servicio": "Nombre del servicio concreto que le venderíamos",
      "porque": "Por qué lo necesita — basado en un problema o carencia real",
      "evidencia": "Dato concreto que demuestra que lo necesita (ej: 'PageSpeed mobile 28/100', 'no tiene chatbot')",
      "prioridad": "alta/media/baja",
      "precio_estimado": 300
    }
  ],
  "automatizaciones_recomendadas": [
    {"nombre": "Nombre", "descripcion": "Qué hace", "impacto": "Alto/Medio/Bajo"}
  ],
  "agentes_recomendados": [
    {"nombre": "Nombre", "tipo": "chat_web/whatsapp/seguimiento", "descripcion": "Qué hace", "precio": 200}
  ],
  "mejoras_web": ["Mejoras técnicas concretas basadas en PageSpeed"],
  "analisis_visual": "Resumen visual de la web",
  "pagespeed_resumen": "Performance móvil X/100, desktop Y/100",
  "google_reviews_resumen": "Rating X/5 con N reseñas",
  "roi_estimado": "ROI honesto basado en lo que REALMENTE falta",
  "pricing_sugerido": {"setup": 500, "mensual": 100},
  "score_oportunidad": 45
}

IMPORTANTE:
- "servicios_a_ofrecer" es el campo MÁS IMPORTANTE. Cada servicio debe tener evidencia concreta.
- Si el negocio ya tiene todo → pocos servicios, score bajo (15-30), pricing bajo.
- Si le faltan muchas cosas → muchos servicios, score alto (70+), pricing proporcional.
- NO propongas servicios para cosas que YA TIENE según los hechos.`;
}

// ─── Agent 3: Control de Calidad ─────────────────────────────────────────────

const QA_SYSTEM = `Eres un controlador de calidad. Tu trabajo es COMPARAR una auditoría contra los hechos verificados y CORREGIR cualquier error.

REGLAS:
1. Lee los hechos verificados (VERDAD ABSOLUTA).
2. Lee la auditoría.
3. Busca CONTRADICCIONES:
   - ¿Se lista como "problema" algo que los hechos dicen que EXISTE? → ELIMINAR
   - ¿Se propone un "servicio_a_ofrecer" para algo que YA TIENE? → ELIMINAR
   - ¿Se recomienda una automatización que ya tiene? → ELIMINAR
   - ¿El score no encaja con los hechos? → CORREGIR
   - ¿Falta algo en "lo_que_hace_bien" que los hechos demuestran? → AÑADIR
4. VERIFICA cada "servicio_a_ofrecer": ¿la evidencia es real según los hechos? Si no → ELIMINAR
5. Genera el JSON FINAL corregido.
6. Lista TODAS las correcciones en "correcciones_realizadas".

Si no hay correcciones, devuelve la auditoría tal cual con correcciones_realizadas: [].

Español de España. Tutea.
Responde SOLO con JSON válido (sin markdown, sin backticks).`;

function buildQAPrompt(factSheet: FactSheet, audit: Record<string, unknown>): string {
  return `Verifica esta auditoría contra los hechos y corrige errores:

=== HECHOS VERIFICADOS (VERDAD ABSOLUTA) ===
${JSON.stringify(factSheet, null, 2)}

=== AUDITORÍA A VERIFICAR ===
${JSON.stringify(audit, null, 2)}

CHECKLIST:
- ¿Algún "problema" contradice un hecho? → ELIMINAR
- ¿Algún "servicio_a_ofrecer" propone algo que ya tienen? → ELIMINAR
- ¿La "evidencia" de cada servicio es real según los hechos? → Si no, ELIMINAR
- ¿Alguna automatización/agente duplica funcionalidad existente? → ELIMINAR
- ¿El score es coherente con la presencia digital real?
- ¿"lo_que_hace_bien" refleja los puntos fuertes de los hechos?
- ¿Los datos de contacto son correctos?

Responde con el JSON FINAL COMPLETO (ya corregido):
{
  "resumen_negocio": "...",
  "cliente_ideal": "...",
  "servicios": "...",
  "lo_que_hace_bien": ["..."],
  "problemas": ["solo problemas REALES"],
  "oportunidades": ["solo lo que NO tienen"],
  "servicios_a_ofrecer": [
    {"servicio": "...", "porque": "...", "evidencia": "dato real", "prioridad": "alta/media/baja", "precio_estimado": 0}
  ],
  "automatizaciones_recomendadas": [{"nombre": "...", "descripcion": "...", "impacto": "..."}],
  "agentes_recomendados": [{"nombre": "...", "tipo": "...", "descripcion": "...", "precio": 0}],
  "mejoras_web": ["..."],
  "analisis_visual": "...",
  "pagespeed_resumen": "...",
  "google_reviews_resumen": "...",
  "roi_estimado": "...",
  "pricing_sugerido": {"setup": 0, "mensual": 0},
  "score_oportunidad": 0,
  "contacto_nombre": "del aviso legal o extracción | No encontrado",
  "contacto_cargo": "... | No encontrado",
  "contacto_email": "... | No encontrado",
  "contacto_telefono": "... | No encontrado",
  "correcciones_realizadas": ["Descripción de cada corrección"]
}`;
}

// ─── Orchestrator ─────────────────────────────────────────────────────────────

export interface AgentPipelineInput {
  url: string;
  markdown: string;
  title: string;
  description: string;
  extractedData: Record<string, unknown> | null;
  extractionMethod: string;
  pagespeedMobile: Record<string, unknown> | null;
  pagespeedDesktop: Record<string, unknown> | null;
  placesData: Record<string, unknown> | null;
  visualAnalysis: string | null;
  detectedPlatforms: string[];
}

export interface AgentPipelineResult {
  finalAudit: QualityCheckedAudit;
  factSheet: FactSheet;
  rawResponses: {
    agent1_facts: string;
    agent2_audit: string;
    agent3_qa: string;
  };
  agentTimings: {
    agent1_ms: number;
    agent2_ms: number;
    agent3_ms: number;
    total_ms: number;
  };
}

export async function runAuditAgentPipeline(input: AgentPipelineInput): Promise<AgentPipelineResult> {
  const totalStart = Date.now();

  // ─── Agent 1: Verificador de Hechos ───
  const t1 = Date.now();
  console.log('[Audit Agent 1/3] Verificador de Hechos...');
  const agent1Prompt = buildFactCheckerPrompt({
    url: input.url,
    markdown: input.markdown,
    title: input.title,
    description: input.description,
    extractedData: input.extractedData,
    pagespeedMobile: input.pagespeedMobile,
    pagespeedDesktop: input.pagespeedDesktop,
    placesData: input.placesData,
    visualAnalysis: input.visualAnalysis,
    detectedPlatforms: input.detectedPlatforms,
  });
  const raw1 = await callClaude(FACT_CHECKER_SYSTEM, agent1Prompt);
  const factSheet = parseJsonResponse<FactSheet>(raw1);
  const t1End = Date.now();
  console.log(`[Audit Agent 1/3] Completado en ${t1End - t1}ms`);

  // ─── Agent 2: Auditor + Estratega ───
  const t2 = Date.now();
  console.log('[Audit Agent 2/3] Auditor + Estratega...');
  const raw2 = await callClaude(AUDITOR_SYSTEM, buildAuditorPrompt(input.url, factSheet));
  const audit = parseJsonResponse<Record<string, unknown>>(raw2);
  const t2End = Date.now();
  console.log(`[Audit Agent 2/3] Completado en ${t2End - t2}ms`);

  // ─── Agent 3: Control de Calidad ───
  const t3 = Date.now();
  console.log('[Audit Agent 3/3] Control de Calidad...');
  const raw3 = await callClaude(QA_SYSTEM, buildQAPrompt(factSheet, audit));
  const finalAudit = parseJsonResponse<QualityCheckedAudit>(raw3);
  const t3End = Date.now();
  console.log(`[Audit Agent 3/3] Completado en ${t3End - t3}ms`);

  const totalEnd = Date.now();
  console.log(`[Audit Pipeline] Total: ${totalEnd - totalStart}ms | Correcciones QA: ${finalAudit.correcciones_realizadas?.length || 0}`);

  return {
    finalAudit,
    factSheet,
    rawResponses: {
      agent1_facts: raw1,
      agent2_audit: raw2,
      agent3_qa: raw3,
    },
    agentTimings: {
      agent1_ms: t1End - t1,
      agent2_ms: t2End - t2,
      agent3_ms: t3End - t3,
      total_ms: totalEnd - totalStart,
    },
  };
}
