import { NextRequest, NextResponse } from 'next/server';
import { getTokenFromRequest } from '@/lib/supabase/api-client';
import { callClaude } from '@/lib/ai/claude';

const FIDELITY_SYSTEM = `Eres un experto en ventas B2B en España. Escribes cold emails cortos, directos y personalizados para centros de estética, peluquerías, spas y clínicas de belleza.

El email es para presentar Fidelity (fidelity-one.vercel.app): un SaaS de fidelización automática por WhatsApp desde 39€/mes que evita que los centros pierdan clientas.

TONO: cercano, directo, español de España. Tutea. Sin formalismos.
LONGITUD: máximo 6-7 líneas. Nada de presentaciones largas.
GANCHO: habla del problema real (perder clientas que no vuelven) no del producto.
NO menciones "automatización" ni "IA" en el asunto — suena a spam.
El email debe parecer escrito a mano, no una campaña masiva.`;

const ASISTENTE_SYSTEM = `Eres un experto en ventas B2B en España. Escribes cold emails cortos, directos y personalizados para empresas profesionales (asesorías, despachos, inmobiliarias, consultoras, arquitectos...).

El email es para presentar un Asistente Personal IA por WhatsApp para directivos y cargos intermedios: 500€ setup + 50€/mes. Resume reuniones, redacta emails, gestiona recordatorios, responde consultas. Extensible a todo el equipo.

TONO: profesional pero cercano, español de España. Tutea.
LONGITUD: máximo 6-7 líneas.
GANCHO: habla del tiempo perdido en tareas administrativas, no del producto.
NO uses palabras como "revolucionario", "innovador", "disruptivo".
El email debe parecer escrito a mano, no una campaña masiva.`;

export async function POST(request: NextRequest) {
  try {
    const token = getTokenFromRequest(request);
    if (!token) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });

    const { tipo, empresa, ciudad, resumen, contacto_nombre } = await request.json();

    if (!tipo || !empresa) {
      return NextResponse.json({ error: 'Faltan campos requeridos' }, { status: 400 });
    }

    const system = tipo === 'fidelity' ? FIDELITY_SYSTEM : ASISTENTE_SYSTEM;

    const prompt = tipo === 'fidelity'
      ? `Escribe un cold email para este centro de estética/belleza:

Negocio: ${empresa}
Ciudad: ${ciudad || 'España'}
${contacto_nombre && contacto_nombre !== 'No encontrado' ? `Contacto: ${contacto_nombre}` : ''}
${resumen ? `Contexto: ${resumen.slice(0, 300)}` : ''}

El email debe:
- Asunto: corto, que genere curiosidad sobre perder clientas
- Cuerpo: 5-6 líneas máximo. Menciona que Fidelity les ayuda a no perder más clientas (recordatorios, seguimiento, reseñas automáticas). Precio desde 39€/mes.
- CTA: proponer una llamada rápida de 15 min o que visiten fidelity-one.vercel.app
- Firma: María, Simedalavida

Devuelve SOLO el email en texto plano con formato:
ASUNTO: [asunto]

[cuerpo del email]`
      : `Escribe un cold email para esta empresa profesional:

Negocio: ${empresa}
Ciudad: ${ciudad || 'España'}
${contacto_nombre && contacto_nombre !== 'No encontrado' ? `Contacto: ${contacto_nombre}` : ''}
${resumen ? `Contexto: ${resumen.slice(0, 300)}` : ''}

El email debe:
- Asunto: corto, sobre recuperar horas perdidas en trabajo administrativo
- Cuerpo: 5-6 líneas máximo. Asistente Personal IA por WhatsApp para directivos: resume reuniones, redacta emails, gestiona recordatorios. 500€ setup + 50€/mes. Extensible a todo el equipo.
- CTA: proponer una demo de 15 min
- Firma: María, Simedalavida

Devuelve SOLO el email en texto plano con formato:
ASUNTO: [asunto]

[cuerpo del email]`;

    const email = await callClaude(system, prompt);

    return NextResponse.json({ email });
  } catch (error) {
    console.error('Generate campaign email error:', error);
    return NextResponse.json({ error: 'Error al generar el email' }, { status: 500 });
  }
}
