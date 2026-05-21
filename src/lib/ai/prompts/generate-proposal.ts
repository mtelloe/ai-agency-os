export const GENERATE_PROPOSAL_SYSTEM = `Eres un experto en ventas B2B de servicios de automatización e IA en España. Generas propuestas comerciales profesionales, persuasivas y personalizadas.

IMPORTANTE: Escribe SIEMPRE en español de España (no latinoamericano). Tutea al cliente, nunca uses "usted". Usa vocabulario español: "ordenador" no "computadora", "móvil" no "celular", "negocio" no "emprendimiento", etc. El tono debe ser profesional pero cercano, como un consultor español hablaría con un empresario local.

Responde SIEMPRE en JSON válido con esta estructura exacta (sin markdown, sin backticks, solo JSON puro):

{
  "titulo": "Propuesta de [servicio] para [empresa]",
  "resumen_ejecutivo": "Resumen ejecutivo de 3-4 frases que enganche al lector",
  "problemas": "Descripción detallada de los problemas detectados y su impacto en el negocio (2-3 párrafos)",
  "solucion": "Descripción de la solución propuesta con detalle técnico accesible (2-3 párrafos)",
  "metodologia": "Descripción de la metodología de trabajo en 2-3 frases (sin nombrar herramientas técnicas concretas, habla de fases y procesos)",
  "cronograma": "Fase 1 (Semana 1-2): Análisis y configuración...\\nFase 2 (Semana 3-4): Implementación y pruebas...\\nFase 3 (Semana 5): Lanzamiento y formación",
  "precio_setup": 1500,
  "precio_mensual": 300,
  "roi": "ROI estimado con cifras concretas: ahorro de X horas/semana, incremento de Y% en leads, etc.",
  "cta_cierre": "Frase de cierre persuasiva invitando a una demo o reunión"
}

Sé concreto, usa cifras, personaliza al máximo con los datos del negocio. Español de España, tutea siempre.`;

export function buildProposalPrompt(auditData: {
  empresa: string;
  url: string;
  resumen: string;
  problemas: string[];
  oportunidades: string[];
  automatizaciones: Array<{ nombre: string; descripcion: string }>;
  agentes: Array<{ nombre: string; tipo: string; descripcion: string }>;
  pricing: { setup: number; mensual: number } | null;
  servicios_a_ofrecer?: Array<{ servicio: string; porque: string; evidencia: string; prioridad: string; precio_estimado: number }>;
}): string {
  const tienePromoWeb = auditData.servicios_a_ofrecer?.some(s =>
    s.servicio.toLowerCase().includes('página web') || s.servicio.toLowerCase().includes('web profesional')
  );
  const tieneAsistenteDirectivos = auditData.servicios_a_ofrecer?.some(s =>
    s.servicio.toLowerCase().includes('asistente personal') || s.servicio.toLowerCase().includes('directivos')
  );

  const promoWebBloque = tienePromoWeb ? `
SERVICIO ESPECIAL — PÁGINA WEB CON IA (PROMO MAYO 2026):
Este negocio no tiene web o la tiene muy desactualizada. Incluye en la propuesta una oferta de lanzamiento:
- Página web profesional creada con IA: 600€ (precio habitual 1.200€)
- Precio especial solo disponible durante mayo 2026
- Incluye: diseño adaptado al sector, textos generados con IA, SEO básico, formulario de contacto, adaptada a móvil
- Destaca el ahorro de 600€ y la urgencia de la oferta
` : '';

  const asistenteBloque = tieneAsistenteDirectivos ? `
SERVICIO ESPECIAL — ASISTENTE PERSONAL IA POR WHATSAPP:
Este negocio tiene directivos/responsables con alta carga administrativa. Incluye en la propuesta:
- Asistente Personal IA disponible 24/7 por WhatsApp
- Tareas: resumir reuniones y documentos, redactar emails y propuestas, gestionar recordatorios, responder consultas internas, buscar información
- Precio: 500€ setup (configuración personalizada) + 50€/mes (mantenimiento, mejoras y servicio incluidos)
- Beneficio clave: 2-3 horas diarias recuperadas por directivo. El mensual es casi simbólico comparado con el tiempo que ahorra.
- Extensible a todo el equipo directivo: cada miembro tiene su propio asistente y pueden comunicarse entre sí — un director puede pedirle algo al asistente de otro departamento directamente desde WhatsApp, sin emails ni reuniones intermedias. Diseñado para crecer con el equipo.
` : '';

  return `Genera una propuesta comercial para este negocio:

Empresa: ${auditData.empresa}
Web: ${auditData.url}
Resumen: ${auditData.resumen}

Problemas detectados:
${auditData.problemas.map((p) => `- ${p}`).join('\n')}

Oportunidades:
${auditData.oportunidades.map((o) => `- ${o}`).join('\n')}

Automatizaciones recomendadas:
${auditData.automatizaciones.map((a) => `- ${a.nombre}: ${a.descripcion}`).join('\n')}

Agentes IA recomendados:
${auditData.agentes.map((a) => `- ${a.nombre} (${a.tipo}): ${a.descripcion}`).join('\n')}

Servicios priorizados por la auditoría:
${(auditData.servicios_a_ofrecer || []).map(s => `- [${s.prioridad.toUpperCase()}] ${s.servicio} (${s.precio_estimado}€): ${s.porque}`).join('\n')}
${promoWebBloque}${asistenteBloque}
Pricing base sugerido: Setup ${auditData.pricing?.setup || 1500}€, Mensual ${auditData.pricing?.mensual || 300}€

Genera la propuesta en JSON.`;
}
