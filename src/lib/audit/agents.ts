/**
 * Multi-agent audit pipeline
 *
 * 4 specialized agents instead of 1 monolithic prompt:
 * 1. Verificador de Hechos — structured fact sheet from raw data
 * 2. Auditor de Negocio — analysis, problems, opportunities
 * 3. Estratega Comercial — score, pricing, ROI, recommendations
 * 4. Control de Calidad — cross-check against verified data, remove hallucinations
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
    plataformas_reserva: string[];
    redes_sociales: Array<{ red: string; url: string; seguidores?: string }>;
    delivery: string[];
    pagos_online: string[];
    email_marketing: boolean;
    tiene_blog: boolean;
    tiene_tienda_online: boolean;
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

export interface BusinessAudit {
  resumen_negocio: string;
  cliente_ideal: string;
  servicios: string;
  lo_que_hace_bien: string[];
  problemas: string[];
  oportunidades: string[];
  mejoras_web: string[];
  analisis_visual: string;
  pagespeed_resumen: string;
  google_reviews_resumen: string;
}

export interface CommercialStrategy {
  score_oportunidad: number;
  automatizaciones_recomendadas: Array<{ nombre: string; descripcion: string; impacto: string }>;
  agentes_recomendados: Array<{ nombre: string; tipo: string; descripcion: string; precio: number }>;
  roi_estimado: string;
  pricing_sugerido: { setup: number; mensual: number };
}

export interface QualityCheckedAudit {
  resumen_negocio: string;
  cliente_ideal: string;
  servicios: string;
  lo_que_hace_bien: string[];
  problemas: string[];
  oportunidades: string[];
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

  // Always include first 10000 chars
  let contentToSend = fullMarkdown.slice(0, 10000);

  // If aviso legal is beyond 10000, include that section too
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
    "plataformas_reserva": ["Booksy", "etc"],
    "redes_sociales": [{"red": "Instagram", "url": "url", "seguidores": "10K si disponible"}],
    "delivery": ["Glovo", "etc"],
    "pagos_online": ["PayPal", "etc"],
    "email_marketing": true/false,
    "tiene_blog": true/false,
    "tiene_tienda_online": true/false
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

// ─── Agent 2: Auditor de Negocio ─────────────────────────────────────────────

const BUSINESS_AUDITOR_SYSTEM = `Eres un auditor de negocio digital para PYMEs en España. Recibes un INFORME DE HECHOS VERIFICADOS.

Tu trabajo: analizar la situación digital del negocio basándote SOLO en los hechos.

REGLAS:
- Los hechos del informe son VERDAD. No los contradigas.
- Si el informe dice que TIENE reservas, redes, contacto → LO TIENE. No lo listes como problema.
- "problemas" = solo lo que FALTA según los hechos verificados.
- "lo_que_hace_bien" es OBLIGATORIO — reconoce lo bueno primero.
- "oportunidades" = solo cosas que NO TIENEN y les aportarían valor real.
- Sé honesto: si el negocio está bien digitalizado, dilo.

Español de España. Tutea.
Responde SOLO con JSON válido (sin markdown, sin backticks).`;

function buildBusinessAuditorPrompt(url: string, factSheet: FactSheet): string {
  return `Analiza este negocio basándote ÚNICAMENTE en los hechos verificados:

URL: ${url}

=== HECHOS VERIFICADOS ===
${JSON.stringify(factSheet, null, 2)}

Responde con este JSON:
{
  "resumen_negocio": "Qué es, qué hace, en 2-3 frases",
  "cliente_ideal": "Perfil del cliente ideal de este negocio",
  "servicios": "Servicios/productos principales",
  "lo_que_hace_bien": ["Punto fuerte 1 basado en hechos", "Punto fuerte 2", "..."],
  "problemas": ["Solo problemas DEMOSTRADOS por los hechos — si no hay datos que lo demuestren, NO lo incluyas"],
  "oportunidades": ["Solo cosas que NO TIENEN y aportarían valor — nunca lo que ya tienen"],
  "mejoras_web": ["Mejoras técnicas concretas basadas en PageSpeed y análisis visual"],
  "analisis_visual": "Resumen de la impresión visual de la web",
  "pagespeed_resumen": "Performance móvil X/100, desktop Y/100, SEO Z/100",
  "google_reviews_resumen": "Rating X/5 con N reseñas"
}`;
}

// ─── Agent 3: Estratega Comercial ────────────────────────────────────────────

const COMMERCIAL_STRATEGIST_SYSTEM = `Eres un estratega comercial para una agencia de IA que vende servicios a PYMEs en España.

Recibes un informe de hechos + una auditoría de negocio. Tu trabajo: evaluar la oportunidad comercial REAL.

REGLAS ABSOLUTAS:
- SCORE = OPORTUNIDAD DE VENTA, NO CALIDAD DEL NEGOCIO.
  85-100: Sin web o completamente inútil → oportunidad máxima
  70-84: Web muy básica, sin reservas, sin redes → alta
  50-69: Web decente pero le faltan automatización, chatbot, SEO → media
  30-49: Web buena, tiene lo esencial, le faltan extras → baja-media
  15-29: Web profesional con reservas, redes, contacto → solo mejoras puntuales
  0-14: Completamente digitalizado → casi nada que ofrecer

- NO recomiendes automatizaciones ni agentes para cosas que YA TIENEN.
- Si tiene Booksy → no recomiendes "sistema de reservas".
- Si tiene Instagram activo → no recomiendes "presencia en redes".
- Pricing realista para PYMEs españolas.
- ROI honesto: si hay poco que ofrecer, el ROI es bajo.

Español de España. Tutea.
Responde SOLO con JSON válido (sin markdown, sin backticks).`;

function buildCommercialStrategistPrompt(factSheet: FactSheet, audit: BusinessAudit): string {
  return `Evalúa la oportunidad comercial:

=== HECHOS VERIFICADOS ===
${JSON.stringify(factSheet, null, 2)}

=== AUDITORÍA DE NEGOCIO ===
${JSON.stringify(audit, null, 2)}

Responde con este JSON:
{
  "score_oportunidad": 45,
  "automatizaciones_recomendadas": [
    {"nombre": "Nombre concreto", "descripcion": "Qué hace y por qué lo necesitan", "impacto": "Alto/Medio/Bajo"}
  ],
  "agentes_recomendados": [
    {"nombre": "Nombre", "tipo": "chat_web/whatsapp/reservas/seguimiento", "descripcion": "Qué hace concretamente", "precio": 200}
  ],
  "roi_estimado": "Estimación honesta del retorno — si no hay mucho que ofrecer, sé honesto",
  "pricing_sugerido": {"setup": 500, "mensual": 100}
}

IMPORTANTE: Si los hechos muestran que el negocio ya tiene casi todo (reservas, redes, contacto, buena web), el score debe ser 15-30 y las recomendaciones deben ser pocas y específicas.`;
}

// ─── Agent 4: Control de Calidad ─────────────────────────────────────────────

const QA_SYSTEM = `Eres un controlador de calidad. Tu trabajo es COMPARAR una auditoría contra los hechos verificados y CORREGIR cualquier error.

REGLAS:
1. Lee los hechos verificados.
2. Lee la auditoría y la estrategia.
3. Busca CONTRADICCIONES:
   - ¿Se lista como "problema" algo que los hechos dicen que EXISTE? → ELIMINAR
   - ¿Se recomienda algo que ya TIENEN según los hechos? → ELIMINAR
   - ¿El score no encaja con los hechos? → CORREGIR
   - ¿Falta algo en "lo_que_hace_bien" que los hechos demuestran? → AÑADIR
4. Genera el JSON FINAL corregido.
5. Lista TODAS las correcciones que hiciste en "correcciones_realizadas".

Si no hay correcciones necesarias, devuelve la auditoría tal cual con correcciones_realizadas: [].

Español de España. Tutea.
Responde SOLO con JSON válido (sin markdown, sin backticks).`;

function buildQAPrompt(factSheet: FactSheet, audit: BusinessAudit, strategy: CommercialStrategy): string {
  return `Verifica esta auditoría contra los hechos y corrige errores:

=== HECHOS VERIFICADOS (VERDAD ABSOLUTA) ===
${JSON.stringify(factSheet, null, 2)}

=== AUDITORÍA A VERIFICAR ===
${JSON.stringify(audit, null, 2)}

=== ESTRATEGIA COMERCIAL A VERIFICAR ===
${JSON.stringify(strategy, null, 2)}

CHECKLIST DE VERIFICACIÓN:
- ¿Algún "problema" contradice un hecho verificado? (ej: dice "sin reservas" pero tiene Booksy)
- ¿Alguna "oportunidad" propone algo que ya tienen?
- ¿Alguna "automatización recomendada" duplica funcionalidad existente?
- ¿El score es coherente con la presencia digital real?
- ¿"lo_que_hace_bien" refleja todos los puntos fuertes demostrados por los hechos?
- ¿Los datos de contacto son correctos según el aviso legal / extracción?

Responde con el JSON FINAL COMPLETO (todos los campos juntos, ya corregidos):
{
  "resumen_negocio": "...",
  "cliente_ideal": "...",
  "servicios": "...",
  "lo_que_hace_bien": ["..."],
  "problemas": ["solo problemas REALES que no contradicen los hechos"],
  "oportunidades": ["solo oportunidades para lo que NO tienen"],
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
  "correcciones_realizadas": ["Descripción de cada corrección hecha"]
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
    agent3_strategy: string;
    agent4_qa: string;
  };
  agentTimings: {
    agent1_ms: number;
    agent2_ms: number;
    agent3_ms: number;
    agent4_ms: number;
    total_ms: number;
  };
}

export async function runAuditAgentPipeline(input: AgentPipelineInput): Promise<AgentPipelineResult> {
  const totalStart = Date.now();

  // ─── Agent 1: Verificador de Hechos ───
  const t1 = Date.now();
  console.log('[Audit Agent 1/4] Verificador de Hechos...');
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
  console.log(`[Audit Agent 1/4] Completado en ${t1End - t1}ms`);

  // ─── Agent 2: Auditor de Negocio ───
  const t2 = Date.now();
  console.log('[Audit Agent 2/4] Auditor de Negocio...');
  const raw2 = await callClaude(BUSINESS_AUDITOR_SYSTEM, buildBusinessAuditorPrompt(input.url, factSheet));
  const audit = parseJsonResponse<BusinessAudit>(raw2);
  const t2End = Date.now();
  console.log(`[Audit Agent 2/4] Completado en ${t2End - t2}ms`);

  // ─── Agent 3: Estratega Comercial ───
  const t3 = Date.now();
  console.log('[Audit Agent 3/4] Estratega Comercial...');
  const raw3 = await callClaude(COMMERCIAL_STRATEGIST_SYSTEM, buildCommercialStrategistPrompt(factSheet, audit));
  const strategy = parseJsonResponse<CommercialStrategy>(raw3);
  const t3End = Date.now();
  console.log(`[Audit Agent 3/4] Completado en ${t3End - t3}ms`);

  // ─── Agent 4: Control de Calidad ───
  const t4 = Date.now();
  console.log('[Audit Agent 4/4] Control de Calidad...');
  const raw4 = await callClaude(QA_SYSTEM, buildQAPrompt(factSheet, audit, strategy));
  const finalAudit = parseJsonResponse<QualityCheckedAudit>(raw4);
  const t4End = Date.now();
  console.log(`[Audit Agent 4/4] Completado en ${t4End - t4}ms`);

  const totalEnd = Date.now();
  console.log(`[Audit Pipeline] Total: ${totalEnd - totalStart}ms | Correcciones QA: ${finalAudit.correcciones_realizadas?.length || 0}`);

  return {
    finalAudit,
    factSheet,
    rawResponses: {
      agent1_facts: raw1,
      agent2_audit: raw2,
      agent3_strategy: raw3,
      agent4_qa: raw4,
    },
    agentTimings: {
      agent1_ms: t1End - t1,
      agent2_ms: t2End - t2,
      agent3_ms: t3End - t3,
      agent4_ms: t4End - t4,
      total_ms: totalEnd - totalStart,
    },
  };
}
