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
    console.error('[webhook-n8n] N8N_API_KEY no configurada, rechazando peticion');
    return false;
  }
  const headerKey = request.headers.get('X-N8N-API-KEY');
  return headerKey === apiKey;
}

/**
 * Handle "analyze-complete" action: update an auditoria with analysis results
 */
async function handleAnalyzeComplete(
  db: ReturnType<typeof getServerClient>,
  data: Record<string, unknown>,
): Promise<{ success: boolean; message: string }> {
  const { auditoriaId, status, result } = data;

  if (!auditoriaId || typeof auditoriaId !== 'string') {
    return { success: false, message: 'Falta auditoriaId o formato invalido' };
  }

  const validStatuses = ['completada', 'error', 'procesando', 'pendiente'];
  const estado = typeof status === 'string' && validStatuses.includes(status)
    ? status
    : 'completada';

  const updatePayload: Record<string, unknown> = {
    estado,
    updated_at: new Date().toISOString(),
  };

  // If result data is provided, merge it into the update
  if (result && typeof result === 'object') {
    const r = result as Record<string, unknown>;
    if (r.score_oportunidad !== undefined) updatePayload.score_oportunidad = r.score_oportunidad;
    if (r.resumen_negocio !== undefined) updatePayload.resumen_negocio = r.resumen_negocio;
    if (r.problemas !== undefined) updatePayload.problemas = r.problemas;
    if (r.oportunidades !== undefined) updatePayload.oportunidades = r.oportunidades;
    if (r.automatizaciones_recomendadas !== undefined) updatePayload.automatizaciones_recomendadas = r.automatizaciones_recomendadas;
    if (r.agentes_recomendados !== undefined) updatePayload.agentes_recomendados = r.agentes_recomendados;
    if (r.mejoras_web !== undefined) updatePayload.mejoras_web = r.mejoras_web;
    if (r.roi_estimado !== undefined) updatePayload.roi_estimado = r.roi_estimado;
    if (r.pricing_sugerido !== undefined) updatePayload.pricing_sugerido = r.pricing_sugerido;
    if (r.error_message !== undefined) updatePayload.error_message = r.error_message;
    if (r.raw_ai_response !== undefined) updatePayload.raw_ai_response = r.raw_ai_response;
  }

  const { error } = await db
    .from('auditorias')
    .update(updatePayload)
    .eq('id', auditoriaId);

  if (error) {
    console.error(`[webhook-n8n] Error actualizando auditoria ${auditoriaId}:`, error);
    return { success: false, message: `Error al actualizar auditoria: ${error.message}` };
  }

  console.log(`[webhook-n8n] Auditoria ${auditoriaId} actualizada a estado: ${estado}`);
  return { success: true, message: `Auditoria ${auditoriaId} actualizada correctamente` };
}

/**
 * Handle "lead-update" action: move a lead in the pipeline
 */
async function handleLeadUpdate(
  db: ReturnType<typeof getServerClient>,
  data: Record<string, unknown>,
): Promise<{ success: boolean; message: string }> {
  const { leadId, estado_pipeline } = data;

  if (!leadId || typeof leadId !== 'string') {
    return { success: false, message: 'Falta leadId o formato invalido' };
  }

  const validStages = [
    'Nuevo', 'Auditado', 'Contactado', 'Demo creada',
    'Propuesta enviada', 'Follow-up', 'Ganado', 'Perdido',
  ];

  if (!estado_pipeline || typeof estado_pipeline !== 'string' || !validStages.includes(estado_pipeline)) {
    return {
      success: false,
      message: `estado_pipeline invalido: ${String(estado_pipeline)}. Valores validos: ${validStages.join(', ')}`,
    };
  }

  // Fetch current lead to log the transition
  const { data: currentLead } = await db
    .from('leads')
    .select('workspace_id, nombre_contacto, estado_pipeline')
    .eq('id', leadId)
    .single();

  const now = new Date().toISOString();

  const { error } = await db
    .from('leads')
    .update({
      estado_pipeline,
      ultima_actividad_at: now,
      updated_at: now,
    })
    .eq('id', leadId);

  if (error) {
    console.error(`[webhook-n8n] Error actualizando lead ${leadId}:`, error);
    return { success: false, message: `Error al actualizar lead: ${error.message}` };
  }

  // Log activity if we have the workspace context
  if (currentLead) {
    await db.from('actividad').insert({
      workspace_id: currentLead.workspace_id,
      user_id: null,
      tipo_evento: 'lead_pipeline_update',
      descripcion: `Lead ${currentLead.nombre_contacto} movido de ${currentLead.estado_pipeline} a ${estado_pipeline} (via n8n)`,
      entidad_tipo: 'lead',
      entidad_id: leadId,
      metadata: {
        estado_anterior: currentLead.estado_pipeline,
        estado_nuevo: estado_pipeline,
        origen: 'n8n_webhook',
      },
    });
  }

  console.log(`[webhook-n8n] Lead ${leadId} actualizado a: ${estado_pipeline}`);
  return { success: true, message: `Lead ${leadId} movido a ${estado_pipeline}` };
}

/**
 * POST /api/webhooks/n8n
 *
 * Generic webhook endpoint for n8n to call for various triggers.
 * Accepts { action: string, data: Record<string, unknown> } and routes
 * to the appropriate handler based on the action.
 */
export async function POST(request: NextRequest) {
  try {
    if (!verifyN8nAuth(request)) {
      console.error('[webhook-n8n] Autenticacion fallida: X-N8N-API-KEY invalida');
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 },
      );
    }

    let body: { action?: string; data?: Record<string, unknown> };
    try {
      body = await request.json();
    } catch {
      console.error('[webhook-n8n] Error al parsear body del request');
      return NextResponse.json(
        { error: 'Body JSON invalido' },
        { status: 400 },
      );
    }

    const { action, data } = body;

    if (!action || typeof action !== 'string') {
      console.error('[webhook-n8n] Falta el campo action en el body');
      return NextResponse.json(
        { error: 'Falta el campo action' },
        { status: 400 },
      );
    }

    console.log(`[webhook-n8n] Accion recibida: ${action}`, JSON.stringify(data || {}).slice(0, 200));

    const db = getServerClient();
    const actionData = data || {};

    switch (action) {
      case 'analyze-complete': {
        const result = await handleAnalyzeComplete(db, actionData);
        return NextResponse.json(result, {
          status: result.success ? 200 : 400,
        });
      }

      case 'lead-update': {
        const result = await handleLeadUpdate(db, actionData);
        return NextResponse.json(result, {
          status: result.success ? 200 : 400,
        });
      }

      default: {
        // Log unknown actions and return 200 to avoid n8n retries
        console.log(`[webhook-n8n] Accion desconocida: ${action}`, JSON.stringify(actionData).slice(0, 500));
        return NextResponse.json({
          success: true,
          message: `Accion '${action}' registrada pero no tiene handler especifico`,
          action,
        });
      }
    }
  } catch (error) {
    console.error('[webhook-n8n] Error critico:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 },
    );
  }
}
