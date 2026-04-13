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
 * Handle "analyze-complete" action: update an auditoria with full analysis results
 */
async function handleAnalyzeComplete(
  db: ReturnType<typeof getServerClient>,
  data: Record<string, unknown>,
): Promise<{ success: boolean; message: string }> {
  const { auditoriaId, status, result, empresaData } = data;

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

  // Merge all result fields
  if (result && typeof result === 'object') {
    const r = result as Record<string, unknown>;
    const fields = [
      'score_oportunidad', 'resumen_negocio', 'cliente_ideal', 'servicios',
      'problemas', 'oportunidades', 'automatizaciones_recomendadas',
      'agentes_recomendados', 'mejoras_web', 'roi_estimado', 'pricing_sugerido',
      'error_message', 'raw_ai_response', 'raw_scraping',
      'contacto_nombre', 'contacto_cargo', 'contacto_email', 'contacto_telefono',
    ];
    for (const field of fields) {
      if (r[field] !== undefined) updatePayload[field] = r[field];
    }
  }

  const { error } = await db
    .from('auditorias')
    .update(updatePayload)
    .eq('id', auditoriaId);

  if (error) {
    console.error(`[webhook-n8n] Error actualizando auditoria ${auditoriaId}:`, error);
    return { success: false, message: `Error al actualizar auditoria: ${error.message}` };
  }

  // Create/update empresa if data provided
  if (empresaData && typeof empresaData === 'object' && estado === 'completada') {
    const ed = empresaData as Record<string, unknown>;
    const { data: auditoria } = await db
      .from('auditorias')
      .select('empresa_id, workspace_id')
      .eq('id', auditoriaId)
      .single();

    if (auditoria && !auditoria.empresa_id && ed.nombre) {
      const { data: empresa } = await db
        .from('empresas')
        .insert({
          workspace_id: auditoria.workspace_id,
          nombre: ed.nombre,
          website: ed.website || null,
          email: ed.email || null,
          telefono: ed.telefono || null,
          origen: 'scraping',
        })
        .select('id')
        .single();

      if (empresa) {
        await db.from('auditorias').update({ empresa_id: empresa.id }).eq('id', auditoriaId);
      }
    }
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
    'Propuesta enviada', 'Follow-up', 'Ganado', 'Perdido', 'Descartado',
  ];

  if (!estado_pipeline || typeof estado_pipeline !== 'string' || !validStages.includes(estado_pipeline)) {
    return {
      success: false,
      message: `estado_pipeline invalido: ${String(estado_pipeline)}. Valores validos: ${validStages.join(', ')}`,
    };
  }

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
 * Handle "check-duplicate" action: check if a prospect already exists in the workspace
 */
async function handleCheckDuplicate(
  db: ReturnType<typeof getServerClient>,
  data: Record<string, unknown>,
): Promise<{ success: boolean; duplicate: boolean; message: string }> {
  const { workspaceId, domain, phone, name } = data;

  if (!workspaceId || typeof workspaceId !== 'string') {
    return { success: false, duplicate: false, message: 'Falta workspaceId' };
  }

  const { data: empresas } = await db
    .from('empresas')
    .select('id, nombre, website, telefono')
    .eq('workspace_id', workspaceId);

  if (!empresas || empresas.length === 0) {
    return { success: true, duplicate: false, message: 'No hay empresas en el workspace' };
  }

  const normalizedName = typeof name === 'string'
    ? name.toLowerCase().trim().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9\s]/g, '').replace(/\s+/g, ' ')
    : '';

  const normalizedDomain = typeof domain === 'string'
    ? domain.toLowerCase().replace('www.', '').replace(/\/+$/, '')
    : '';

  const normalizedPhone = typeof phone === 'string'
    ? phone.replace(/\s/g, '')
    : '';

  for (const emp of empresas) {
    if (normalizedDomain && emp.website) {
      try {
        const empDomain = new URL(emp.website).hostname.replace('www.', '').toLowerCase();
        if (empDomain === normalizedDomain) {
          return { success: true, duplicate: true, message: `Duplicado por dominio: ${emp.nombre}` };
        }
      } catch { /* skip */ }
    }

    if (normalizedPhone && emp.telefono) {
      if (emp.telefono.replace(/\s/g, '') === normalizedPhone) {
        return { success: true, duplicate: true, message: `Duplicado por telefono: ${emp.nombre}` };
      }
    }

    if (normalizedName && emp.nombre) {
      const empName = emp.nombre.toLowerCase().trim().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9\s]/g, '').replace(/\s+/g, ' ');
      if (empName === normalizedName) {
        return { success: true, duplicate: true, message: `Duplicado por nombre: ${emp.nombre}` };
      }
    }
  }

  return { success: true, duplicate: false, message: 'No es duplicado' };
}

/**
 * Handle "prospect-complete" action: create empresa + lead from n8n prospecting pipeline
 */
async function handleProspectComplete(
  db: ReturnType<typeof getServerClient>,
  data: Record<string, unknown>,
): Promise<{ success: boolean; message: string }> {
  const { workspace_id, empresa, lead } = data;

  if (!workspace_id || typeof workspace_id !== 'string') {
    return { success: false, message: 'Falta workspace_id' };
  }
  if (!empresa || typeof empresa !== 'object') {
    return { success: false, message: 'Falta datos de empresa' };
  }

  const emp = empresa as Record<string, unknown>;
  const leadData = (lead || {}) as Record<string, unknown>;

  const { data: newEmpresa, error: empresaError } = await db
    .from('empresas')
    .insert({
      workspace_id,
      nombre: emp.name || emp.nombre || 'Sin nombre',
      website: emp.website || null,
      telefono: emp.phone || emp.telefono || null,
      ciudad: emp.city || emp.ciudad || null,
      nicho: emp.nicho || null,
      origen: 'prospecting',
    })
    .select('id')
    .single();

  if (empresaError) {
    console.error('[webhook-n8n] Error creando empresa:', empresaError);
    return { success: false, message: `Error al crear empresa: ${empresaError.message}` };
  }

  let score = 70;
  if (!emp.website) score += 15;
  const reviews = Number(emp.reviews) || 0;
  if (reviews < 20) score += 5;
  const rating = Number(emp.rating) || 5;
  if (rating < 4.5) score += 5;
  score = Math.min(95, Math.max(60, score));

  const valor = emp.website ? 1000 : 2000;
  const enrichmentStatus = leadData.enrichment_status || 'no_contact';
  const contactName = (leadData.decisor_nombre as string) || `Responsable de ${emp.name || emp.nombre}`;

  const { error: leadError } = await db
    .from('leads')
    .insert({
      workspace_id,
      empresa_id: newEmpresa.id,
      nombre_contacto: contactName,
      cargo: (leadData.decisor_cargo as string) || null,
      email: (leadData.decisor_email as string) || null,
      telefono: (leadData.decisor_movil as string) || (emp.phone as string) || null,
      estado_pipeline: 'Nuevo',
      score,
      valor_estimado: valor,
      fuente: 'Google Maps + Apollo',
      decisor_nombre: (leadData.decisor_nombre as string) || null,
      decisor_cargo: (leadData.decisor_cargo as string) || null,
      decisor_email: (leadData.decisor_email as string) || null,
      decisor_movil: (leadData.decisor_movil as string) || null,
      decisor_linkedin: (leadData.decisor_linkedin as string) || null,
      enrichment_status: enrichmentStatus,
      enrichment_source: (leadData.source as string) || 'apify+apollo',
    });

  if (leadError) {
    console.error('[webhook-n8n] Error creando lead:', leadError);
    return { success: false, message: `Error al crear lead: ${leadError.message}` };
  }

  await db.from('actividad').insert({
    workspace_id,
    user_id: null,
    tipo_evento: 'prospeccion_completada',
    descripcion: `Lead enriquecido: ${contactName} (${enrichmentStatus}) via n8n pipeline`,
    entidad_tipo: 'empresa',
    entidad_id: newEmpresa.id,
    metadata: { enrichment_status: enrichmentStatus, source: 'n8n_pipeline' },
  });

  return { success: true, message: `Empresa + lead creados (enrichment: ${enrichmentStatus})` };
}

/**
 * Handle "prospect-error" action: log a prospecting pipeline error to actividad
 */
async function handleProspectError(
  db: ReturnType<typeof getServerClient>,
  data: Record<string, unknown>,
): Promise<{ success: boolean; message: string }> {
  const { workspace_id, error_message } = data;

  if (workspace_id && typeof workspace_id === 'string') {
    await db.from('actividad').insert({
      workspace_id,
      user_id: null,
      tipo_evento: 'prospeccion_error',
      descripcion: `Error en pipeline de prospeccion: ${String(error_message || 'Error desconocido')}`,
      entidad_tipo: 'workspace',
      entidad_id: workspace_id,
      metadata: { error: String(error_message || 'unknown'), source: 'n8n_pipeline' },
    });
  }

  console.error(`[webhook-n8n] Prospect error for workspace ${workspace_id}:`, error_message);
  return { success: true, message: 'Error registrado' };
}

/**
 * POST /api/webhooks/n8n
 */
export async function POST(request: NextRequest) {
  try {
    if (!verifyN8nAuth(request)) {
      console.error('[webhook-n8n] Autenticacion fallida: X-N8N-API-KEY invalida');
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    let body: { action?: string; data?: Record<string, unknown> };
    try {
      body = await request.json();
    } catch {
      console.error('[webhook-n8n] Error al parsear body del request');
      return NextResponse.json({ error: 'Body JSON invalido' }, { status: 400 });
    }

    const { action, data } = body;

    if (!action || typeof action !== 'string') {
      console.error('[webhook-n8n] Falta el campo action en el body');
      return NextResponse.json({ error: 'Falta el campo action' }, { status: 400 });
    }

    console.log(`[webhook-n8n] Accion recibida: ${action}`, JSON.stringify(data || {}).slice(0, 200));

    const db = getServerClient();
    const actionData = data || {};

    switch (action) {
      case 'analyze-complete': {
        const result = await handleAnalyzeComplete(db, actionData);
        return NextResponse.json(result, { status: result.success ? 200 : 400 });
      }

      case 'lead-update': {
        const result = await handleLeadUpdate(db, actionData);
        return NextResponse.json(result, { status: result.success ? 200 : 400 });
      }

      case 'check-duplicate': {
        const result = await handleCheckDuplicate(db, actionData);
        return NextResponse.json(result, { status: result.success ? 200 : 400 });
      }

      case 'prospect-complete': {
        const result = await handleProspectComplete(db, actionData);
        return NextResponse.json(result, { status: result.success ? 200 : 400 });
      }

      case 'prospect-error': {
        const result = await handleProspectError(db, actionData);
        return NextResponse.json(result, { status: 200 });
      }

      default: {
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
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}
