import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { url } = await req.json();
    if (!url) return Response.json({ error: 'URL requerida' }, { status: 400 });

    // Use LLM with internet context to analyze the website
    const result = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt: `Eres un experto en automatización e inteligencia artificial para agencias de marketing. 
      Analiza este negocio web: ${url}
      
      Visita la URL y analiza en profundidad el negocio. Devuelve un JSON estructurado con:
      
      1. nombre_negocio: nombre del negocio
      2. tipo_negocio: tipo/sector del negocio
      3. descripcion: descripción breve del negocio (2-3 frases)
      4. score_oportunidad: puntuación 0-100 de qué tan buena oportunidad es para venderles IA
      5. problemas_detectados: array de objetos { titulo, descripcion, severidad: "alta"|"media"|"baja" } (mínimo 4 problemas reales detectados)
      6. agentes_recomendados: array de 3 objetos { nombre, tipo, descripcion, roi_estimado_mensual_eur: número, casos_uso: string }
      7. ahorro_mensual_eur: número estimado de ahorro mensual en euros que puede generar la IA
      8. precio_sugerido_setup: número en euros para el setup inicial
      9. precio_sugerido_mensual: número en euros para la tarifa mensual
      10. script_ventas: objeto con { gancho_apertura, problemas_especificos, solucion_ia, precio_argumento, manejo_objeciones: array de {objecion, respuesta}, cta_cierre }
      11. oportunidades: array de strings con las principales oportunidades detectadas
      
      Sé específico y personalizado para este negocio concreto. El score debe reflejar realmente el potencial.`,
      add_context_from_internet: true,
      response_json_schema: {
        type: "object",
        properties: {
          nombre_negocio: { type: "string" },
          tipo_negocio: { type: "string" },
          descripcion: { type: "string" },
          score_oportunidad: { type: "number" },
          problemas_detectados: {
            type: "array",
            items: {
              type: "object",
              properties: {
                titulo: { type: "string" },
                descripcion: { type: "string" },
                severidad: { type: "string" }
              }
            }
          },
          agentes_recomendados: {
            type: "array",
            items: {
              type: "object",
              properties: {
                nombre: { type: "string" },
                tipo: { type: "string" },
                descripcion: { type: "string" },
                roi_estimado_mensual_eur: { type: "number" },
                casos_uso: { type: "string" }
              }
            }
          },
          ahorro_mensual_eur: { type: "number" },
          precio_sugerido_setup: { type: "number" },
          precio_sugerido_mensual: { type: "number" },
          script_ventas: {
            type: "object",
            properties: {
              gancho_apertura: { type: "string" },
              problemas_especificos: { type: "string" },
              solucion_ia: { type: "string" },
              precio_argumento: { type: "string" },
              manejo_objeciones: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    objecion: { type: "string" },
                    respuesta: { type: "string" }
                  }
                }
              },
              cta_cierre: { type: "string" }
            }
          },
          oportunidades: { type: "array", items: { type: "string" } }
        }
      }
    });

    return Response.json({ success: true, data: result });
  } catch (error) {
    console.error('Error analyzing website:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});