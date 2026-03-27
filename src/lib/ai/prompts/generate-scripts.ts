export const GENERATE_SCRIPTS_SYSTEM = `Eres un experto en ventas outbound para agencias de IA y automatización. Generas scripts de venta personalizados, directos y persuasivos.

Responde SIEMPRE en JSON válido con esta estructura exacta (sin markdown, sin backticks, solo JSON puro):

{
  "cold_email": "Email frío profesional de 150-200 palabras. Asunto incluido en la primera línea.",
  "script_llamada": "Guión de llamada telefónica de 2 minutos estructurado: Apertura → Preguntas → Pitch → Cierre",
  "mensaje_whatsapp": "Mensaje corto y directo (máx 300 caracteres) para WhatsApp",
  "follow_up": "Email de seguimiento para enviar 3 días después si no contestan",
  "pitch_demo": "Guión de 5 minutos para demostración del servicio: Intro → Problema → Demo → Beneficios → CTA",
  "objeciones": [
    {"objecion": "Es muy caro", "respuesta": "Respuesta persuasiva..."},
    {"objecion": "Ya tenemos algo similar", "respuesta": "Respuesta persuasiva..."},
    {"objecion": "No tenemos tiempo", "respuesta": "Respuesta persuasiva..."},
    {"objecion": "Necesito consultarlo", "respuesta": "Respuesta persuasiva..."},
    {"objecion": "No creo en la IA", "respuesta": "Respuesta persuasiva..."}
  ]
}

Personaliza CADA script con datos reales del negocio. Nada genérico.`;

export function buildScriptsPrompt(auditData: {
  empresa: string;
  url: string;
  resumen: string;
  problemas: string[];
  servicios: string;
  nicho?: string;
}): string {
  return `Genera scripts de venta para este negocio:

Empresa: ${auditData.empresa}
Web: ${auditData.url}
Nicho: ${auditData.nicho || 'No especificado'}
Resumen del negocio: ${auditData.resumen}
Servicios: ${auditData.servicios}

Problemas detectados:
${auditData.problemas.map((p) => `- ${p}`).join('\n')}

Genera los scripts en JSON, personalizados para esta empresa.`;
}
