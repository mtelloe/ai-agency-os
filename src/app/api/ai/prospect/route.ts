import { NextRequest, NextResponse } from 'next/server';
import { createApiClient, getTokenFromRequest } from '@/lib/supabase/api-client';
import { callClaude } from '@/lib/ai/claude';
import { parseJsonResponse } from '@/lib/ai/parsers';
import { spendCredit, logActivity } from '@/lib/credits';

const PROSPECT_SYSTEM_PROMPT = `Eres un experto en prospección de negocios locales en España.
Tu tarea es generar datos REALISTAS de negocios para un nicho y ciudad determinados.

Reglas:
- Genera nombres de negocios realistas y típicos de España (no inventados de forma obvia)
- Los sitios web deben seguir patrones reales (ej: clinicadentalgarcia.es, restauranteelmirador.com)
- Los teléfonos deben ser números españoles válidos (formato: +34 6XX XXX XXX o +34 9XX XXX XXX)
- Los emails deben ser coherentes con el nombre del negocio (info@, contacto@, etc.)
- Los scores deben variar entre 60 y 95, representando la probabilidad de que necesiten servicios digitales
- Los valores estimados deben variar entre 500 y 3000 euros, representando el valor potencial del contrato
- Varía los scores y valores: no todos iguales
- Usa español de España (no latinoamericano)

Responde SOLO con un JSON válido, sin texto adicional.`;

function buildProspectPrompt(nicho: string, ciudad: string, cantidad: number): string {
  return `Genera ${cantidad} negocios del nicho "${nicho}" en la ciudad de ${ciudad}, España.

Devuelve un JSON con esta estructura exacta:
{
  "prospects": [
    {
      "nombre": "Nombre del Negocio",
      "website": "https://www.ejemplo.es",
      "telefono": "+34 612 345 678",
      "email": "info@ejemplo.es",
      "ciudad": "${ciudad}",
      "nicho": "${nicho}",
      "score": 78,
      "valor_estimado": 1500
    }
  ]
}

Genera exactamente ${cantidad} negocios con datos variados y realistas.`;
}

export async function POST(request: NextRequest) {
  try {
    const token = getTokenFromRequest(request);
    if (!token) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    const db = createApiClient(token);
    const body = await request.json();
    const { nicho, ciudad, workspaceId, userId } = body;
    const cantidad = body.cantidad || 5;

    if (!nicho || !ciudad || !workspaceId || !userId) {
      return NextResponse.json({ error: 'Faltan campos requeridos' }, { status: 400 });
    }

    // Spend 2 credits for prospecting
    const spent1 = await spendCredit(
      workspaceId, userId, 'prospeccion',
      `Prospección: ${cantidad} negocios de ${nicho} en ${ciudad}`,
      token
    );
    if (!spent1) {
      return NextResponse.json({ error: 'No tienes créditos suficientes' }, { status: 402 });
    }

    // Spend second credit
    const spent2 = await spendCredit(
      workspaceId, userId, 'prospeccion',
      `Prospección (2/2): ${nicho} en ${ciudad}`,
      token
    );
    if (!spent2) {
      return NextResponse.json({ error: 'No tienes créditos suficientes para completar la prospección' }, { status: 402 });
    }

    // Call Claude to generate prospects
    const rawResponse = await callClaude(
      PROSPECT_SYSTEM_PROMPT,
      buildProspectPrompt(nicho, ciudad, cantidad)
    );

    const parsed = parseJsonResponse<{
      prospects: Array<{
        nombre: string;
        website: string;
        telefono: string;
        email: string;
        ciudad: string;
        nicho: string;
        score: number;
        valor_estimado: number;
      }>;
    }>(rawResponse);

    if (!parsed.prospects || !Array.isArray(parsed.prospects)) {
      throw new Error('La IA no generó prospecciones válidas');
    }

    // Create empresas and leads in Supabase
    const createdLeads = [];

    for (const prospect of parsed.prospects) {
      // Create empresa
      const { data: empresa, error: empresaError } = await db
        .from('empresas')
        .insert({
          workspace_id: workspaceId,
          nombre: prospect.nombre,
          website: prospect.website,
          telefono: prospect.telefono,
          email: prospect.email,
          ciudad: prospect.ciudad,
          nicho: prospect.nicho,
          origen: 'prospecting',
        })
        .select()
        .single();

      if (empresaError) {
        console.error('Error creating empresa:', empresaError);
        continue;
      }

      // Create lead
      const { data: lead, error: leadError } = await db
        .from('leads')
        .insert({
          workspace_id: workspaceId,
          empresa_id: empresa.id,
          nombre_contacto: `Responsable de ${prospect.nombre}`,
          estado_pipeline: 'Nuevo',
          score: Math.min(95, Math.max(60, prospect.score)),
          valor_estimado: Math.min(3000, Math.max(500, prospect.valor_estimado)),
          fuente: 'Prospección IA',
        })
        .select()
        .single();

      if (leadError) {
        console.error('Error creating lead:', leadError);
        continue;
      }

      createdLeads.push({ ...lead, empresa });
    }

    // Log activity
    await logActivity(
      workspaceId, userId,
      'prospeccion_completada',
      `Prospección completada: ${createdLeads.length} leads de ${nicho} en ${ciudad}`,
      token,
      'leads',
      createdLeads[0]?.id
    );

    return NextResponse.json({
      leads: createdLeads,
      total: createdLeads.length,
    });
  } catch (error) {
    console.error('Prospect error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Error al prospectar' },
      { status: 500 }
    );
  }
}
