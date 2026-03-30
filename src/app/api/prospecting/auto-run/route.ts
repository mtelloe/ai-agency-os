import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { callClaude } from '@/lib/ai/claude';
import { parseJsonResponse } from '@/lib/ai/parsers';

// Server-to-server client that bypasses RLS using the service role key
function getServerClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}

// Verify the request originates from n8n via shared secret
function verifyN8nAuth(request: NextRequest): boolean {
  const apiKey = process.env.N8N_API_KEY;
  if (!apiKey) {
    console.warn('[auto-prospecting] N8N_API_KEY no configurada, omitiendo verificacion');
    return true;
  }
  const headerKey = request.headers.get('X-N8N-API-KEY');
  return headerKey === apiKey;
}

const PROSPECT_SYSTEM_PROMPT = `Eres un experto en prospeccion de negocios locales en Espana.
Tu tarea es generar datos REALISTAS de negocios para un nicho y ciudad determinados.

Reglas:
- Genera nombres de negocios realistas y tipicos de Espana (no inventados de forma obvia)
- Los sitios web deben seguir patrones reales (ej: clinicadentalgarcia.es, restauranteelmirador.com)
- Los telefonos deben ser numeros espanoles validos (formato: +34 6XX XXX XXX o +34 9XX XXX XXX)
- Los emails deben ser coherentes con el nombre del negocio (info@, contacto@, etc.)
- Los scores deben variar entre 60 y 95, representando la probabilidad de que necesiten servicios digitales
- Los valores estimados deben variar entre 500 y 3000 euros, representando el valor potencial del contrato
- Varia los scores y valores: no todos iguales
- Usa espanol de Espana (no latinoamericano)

Responde SOLO con un JSON valido, sin texto adicional.`;

function buildProspectPrompt(nicho: string, ciudad: string, cantidad: number): string {
  return `Genera ${cantidad} negocios del nicho "${nicho}" en la ciudad de ${ciudad}, Espana.

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

/**
 * Determine the most-used nicho for a workspace by looking at auditorias -> empresa.nicho
 */
async function getMostUsedNicho(
  db: ReturnType<typeof getServerClient>,
  workspaceId: string,
): Promise<string> {
  const { data: auditorias } = await db
    .from('auditorias')
    .select('empresa_id')
    .eq('workspace_id', workspaceId)
    .not('empresa_id', 'is', null)
    .limit(50);

  if (!auditorias || auditorias.length === 0) return 'Restaurantes';

  const empresaIds = auditorias.map((a) => a.empresa_id).filter(Boolean) as string[];
  if (empresaIds.length === 0) return 'Restaurantes';

  const { data: empresas } = await db
    .from('empresas')
    .select('nicho')
    .in('id', empresaIds)
    .not('nicho', 'is', null);

  if (!empresas || empresas.length === 0) return 'Restaurantes';

  // Count nicho occurrences and return the most common one
  const counts: Record<string, number> = {};
  for (const e of empresas) {
    if (e.nicho) {
      counts[e.nicho] = (counts[e.nicho] || 0) + 1;
    }
  }

  const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
  return sorted[0]?.[0] || 'Restaurantes';
}

/**
 * Determine the most-used ciudad for a workspace by looking at empresas.ciudad
 */
async function getMostUsedCiudad(
  db: ReturnType<typeof getServerClient>,
  workspaceId: string,
): Promise<string> {
  const { data: empresas } = await db
    .from('empresas')
    .select('ciudad')
    .eq('workspace_id', workspaceId)
    .not('ciudad', 'is', null)
    .limit(100);

  if (!empresas || empresas.length === 0) return 'Madrid';

  const counts: Record<string, number> = {};
  for (const e of empresas) {
    if (e.ciudad) {
      counts[e.ciudad] = (counts[e.ciudad] || 0) + 1;
    }
  }

  const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
  return sorted[0]?.[0] || 'Madrid';
}

/**
 * POST /api/prospecting/auto-run
 *
 * Called by n8n every Monday at 8:00 AM. For each workspace with auto_prospecting
 * enabled and sufficient credits, generates 5 new prospects using Claude and
 * creates the corresponding empresas + leads records.
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    if (!verifyN8nAuth(request)) {
      console.error('[auto-prospecting] Autenticacion fallida: X-N8N-API-KEY invalida');
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 },
      );
    }

    const db = getServerClient();

    // Query all workspaces with auto_prospecting enabled
    const { data: workspaces, error: wsError } = await db
      .from('workspaces')
      .select('id, nombre, creditos_total, creditos_usados, config_autonomia')
      .filter('config_autonomia->>auto_prospecting', 'eq', 'true');

    if (wsError) {
      console.error('[auto-prospecting] Error al consultar workspaces:', wsError);
      return NextResponse.json(
        { error: 'Error al consultar workspaces', details: wsError.message },
        { status: 500 },
      );
    }

    if (!workspaces || workspaces.length === 0) {
      console.log('[auto-prospecting] No hay workspaces con auto_prospecting habilitado');
      return NextResponse.json({ workspaces_processed: 0, total_leads_created: 0 });
    }

    console.log(`[auto-prospecting] Encontrados ${workspaces.length} workspaces con auto_prospecting`);

    let totalLeadsCreated = 0;
    let workspacesProcessed = 0;
    const results: Array<{
      workspaceId: string;
      nombre: string;
      leadsCreated: number;
      error?: string;
    }> = [];

    for (const ws of workspaces) {
      try {
        // Check available credits (need at least 2 for prospecting)
        const available = ws.creditos_total - ws.creditos_usados;
        if (available < 2) {
          console.log(
            `[auto-prospecting] Workspace ${ws.id} (${ws.nombre}): creditos insuficientes (${available})`,
          );
          results.push({
            workspaceId: ws.id,
            nombre: ws.nombre,
            leadsCreated: 0,
            error: `Creditos insuficientes: ${available} disponibles, 2 requeridos`,
          });
          continue;
        }

        // Determine nicho and ciudad for this workspace
        const [nicho, ciudad] = await Promise.all([
          getMostUsedNicho(db, ws.id),
          getMostUsedCiudad(db, ws.id),
        ]);

        console.log(
          `[auto-prospecting] Workspace ${ws.id} (${ws.nombre}): nicho=${nicho}, ciudad=${ciudad}`,
        );

        // Call Claude to generate 5 prospects
        const rawResponse = await callClaude(
          PROSPECT_SYSTEM_PROMPT,
          buildProspectPrompt(nicho, ciudad, 5),
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
          console.error(`[auto-prospecting] Workspace ${ws.id}: respuesta IA invalida`);
          results.push({
            workspaceId: ws.id,
            nombre: ws.nombre,
            leadsCreated: 0,
            error: 'Respuesta de IA invalida',
          });
          continue;
        }

        // Deduct 2 credits
        const { error: creditError } = await db.rpc('increment_creditos_usados', {
          ws_id: ws.id,
        });
        if (creditError) {
          console.error(`[auto-prospecting] Error deduciendo credito 1 para workspace ${ws.id}:`, creditError);
        }
        const { error: creditError2 } = await db.rpc('increment_creditos_usados', {
          ws_id: ws.id,
        });
        if (creditError2) {
          console.error(`[auto-prospecting] Error deduciendo credito 2 para workspace ${ws.id}:`, creditError2);
        }

        // Log credit usage in the ledger
        await db.from('creditos_ledger').insert({
          workspace_id: ws.id,
          user_id: null,
          accion: 'prospeccion_automatica',
          creditos: 2,
          tipo_movimiento: 'cargo',
          descripcion: `Prospeccion automatica: 5 negocios de ${nicho} en ${ciudad}`,
          balance_despues: available - 2,
        });

        // Create empresas and leads
        let leadsCreated = 0;

        for (const prospect of parsed.prospects) {
          try {
            // Create empresa
            const { data: empresa, error: empresaError } = await db
              .from('empresas')
              .insert({
                workspace_id: ws.id,
                nombre: prospect.nombre,
                website: prospect.website,
                telefono: prospect.telefono,
                email: prospect.email,
                ciudad: prospect.ciudad,
                nicho: prospect.nicho,
                origen: 'auto_prospecting',
              })
              .select('id')
              .single();

            if (empresaError) {
              console.error(
                `[auto-prospecting] Error creando empresa en workspace ${ws.id}:`,
                empresaError,
              );
              continue;
            }

            // Create lead
            const { error: leadError } = await db
              .from('leads')
              .insert({
                workspace_id: ws.id,
                empresa_id: empresa.id,
                nombre_contacto: `Responsable de ${prospect.nombre}`,
                estado_pipeline: 'Nuevo',
                score: Math.min(95, Math.max(60, prospect.score)),
                valor_estimado: Math.min(3000, Math.max(500, prospect.valor_estimado)),
                fuente: 'Prospeccion automatica',
              });

            if (leadError) {
              console.error(
                `[auto-prospecting] Error creando lead en workspace ${ws.id}:`,
                leadError,
              );
              continue;
            }

            leadsCreated++;
          } catch (prospectError) {
            console.error(
              `[auto-prospecting] Error procesando prospecto en workspace ${ws.id}:`,
              prospectError,
            );
          }
        }

        // Log activity
        await db.from('actividad').insert({
          workspace_id: ws.id,
          user_id: null,
          tipo_evento: 'prospeccion_automatica',
          descripcion: `Prospeccion automatica completada: ${leadsCreated} leads de ${nicho} en ${ciudad}`,
          metadata: {
            nicho,
            ciudad,
            leads_created: leadsCreated,
            origen: 'n8n_cron',
          },
        });

        totalLeadsCreated += leadsCreated;
        workspacesProcessed++;
        results.push({
          workspaceId: ws.id,
          nombre: ws.nombre,
          leadsCreated,
        });

        console.log(
          `[auto-prospecting] Workspace ${ws.id} (${ws.nombre}): ${leadsCreated} leads creados`,
        );
      } catch (wsProcessError) {
        const message = wsProcessError instanceof Error ? wsProcessError.message : 'Error desconocido';
        console.error(`[auto-prospecting] Error procesando workspace ${ws.id}:`, wsProcessError);
        results.push({
          workspaceId: ws.id,
          nombre: ws.nombre,
          leadsCreated: 0,
          error: message,
        });
      }
    }

    const duration = Date.now() - startTime;
    console.log(
      `[auto-prospecting] Completado: ${workspacesProcessed} workspaces, ${totalLeadsCreated} leads en ${duration}ms`,
    );

    return NextResponse.json({
      workspaces_processed: workspacesProcessed,
      total_leads_created: totalLeadsCreated,
      details: results,
      duration_ms: duration,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Error interno del servidor';
    console.error('[auto-prospecting] Error critico:', error);
    return NextResponse.json(
      { error: message },
      { status: 500 },
    );
  }
}
