import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

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
    console.error('[follow-up] N8N_API_KEY no configurada, rechazando peticion');
    return false;
  }
  const headerKey = request.headers.get('X-N8N-API-KEY');
  return headerKey === apiKey;
}

/**
 * POST /api/leads/follow-up
 *
 * Called by n8n daily at 9:00 AM. Finds leads that have been inactive for
 * more than 3 days in actionable pipeline stages and schedules automatic
 * follow-up for each one.
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    if (!verifyN8nAuth(request)) {
      console.error('[follow-up] Autenticacion fallida: X-N8N-API-KEY invalida');
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 },
      );
    }

    const db = getServerClient();

    // Calculate the threshold: 3 days ago
    const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString();

    // Query all leads across all workspaces that need follow-up
    const { data: leads, error: queryError } = await db
      .from('leads')
      .select('id, workspace_id, nombre_contacto, estado_pipeline, ultima_actividad_at')
      .in('estado_pipeline', ['Contactado', 'Propuesta enviada', 'Follow-up'])
      .lt('ultima_actividad_at', threeDaysAgo);

    if (queryError) {
      console.error('[follow-up] Error al consultar leads:', queryError);
      return NextResponse.json(
        { error: 'Error al consultar leads' },
        { status: 500 },
      );
    }

    if (!leads || leads.length === 0) {
      console.log('[follow-up] No se encontraron leads pendientes de seguimiento');
      return NextResponse.json({ processed: 0, leads: [] });
    }

    console.log(`[follow-up] Encontrados ${leads.length} leads para seguimiento automatico`);

    const processedIds: string[] = [];
    const errors: Array<{ leadId: string; error: string }> = [];

    for (const lead of leads) {
      try {
        const now = new Date().toISOString();

        // Update lead: move to Follow-up stage (if not already) and refresh activity timestamp
        const { error: updateError } = await db
          .from('leads')
          .update({
            estado_pipeline: 'Follow-up',
            ultima_actividad_at: now,
            updated_at: now,
          })
          .eq('id', lead.id);

        if (updateError) {
          console.error(`[follow-up] Error al actualizar lead ${lead.id}:`, updateError);
          errors.push({ leadId: lead.id, error: updateError.message });
          continue;
        }

        // Insert activity log
        const { error: activityError } = await db
          .from('actividad')
          .insert({
            workspace_id: lead.workspace_id,
            user_id: null,
            tipo_evento: 'seguimiento_automatico',
            descripcion: `Seguimiento automatico programado para ${lead.nombre_contacto}`,
            entidad_tipo: 'lead',
            entidad_id: lead.id,
            metadata: {
              estado_anterior: lead.estado_pipeline,
              estado_nuevo: 'Follow-up',
              origen: 'n8n_cron',
            },
          });

        if (activityError) {
          console.error(`[follow-up] Error al registrar actividad para lead ${lead.id}:`, activityError);
          // Non-critical: continue processing even if activity log fails
        }

        processedIds.push(lead.id);
        console.log(`[follow-up] Lead procesado: ${lead.id} (${lead.nombre_contacto})`);
      } catch (leadError) {
        const message = leadError instanceof Error ? leadError.message : 'Error desconocido';
        console.error(`[follow-up] Error procesando lead ${lead.id}:`, leadError);
        errors.push({ leadId: lead.id, error: message });
      }
    }

    const duration = Date.now() - startTime;
    console.log(
      `[follow-up] Completado: ${processedIds.length}/${leads.length} leads procesados en ${duration}ms`,
    );

    return NextResponse.json({
      processed: processedIds.length,
      leads: processedIds,
      errors: errors.length > 0 ? errors : undefined,
      duration_ms: duration,
    });
  } catch (error) {
    console.error('[follow-up] Error critico:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 },
    );
  }
}
