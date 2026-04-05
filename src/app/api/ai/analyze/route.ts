import { NextRequest, NextResponse } from 'next/server';
import { createApiClient, getTokenFromRequest } from '@/lib/supabase/api-client';
import { spendCredit } from '@/lib/credits';
import { triggerN8nWebhook, isN8nConfigured } from '@/lib/n8n/client';

/**
 * POST /api/ai/analyze
 *
 * Async audit: creates the record, fires n8n webhook, returns immediately.
 * The heavy lifting (scraping + 3 Claude agents) happens in n8n without timeout.
 * Frontend polls the audit record until estado = 'completada' or 'error'.
 */
export async function POST(request: NextRequest) {
  try {
    const token = getTokenFromRequest(request);
    if (!token) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    const db = createApiClient(token);
    const { url, workspaceId, userId, empresaId } = await request.json();

    if (!url || !workspaceId || !userId) {
      return NextResponse.json({ error: 'Faltan campos requeridos' }, { status: 400 });
    }
    if (typeof url !== 'string' || url.length > 2048) {
      return NextResponse.json({ error: 'URL demasiado larga' }, { status: 400 });
    }

    // SSRF protection
    try {
      const parsed = new URL(url);
      if (!['http:', 'https:'].includes(parsed.protocol)) {
        return NextResponse.json({ error: 'URL inválida: solo http/https' }, { status: 400 });
      }
      const h = parsed.hostname.toLowerCase();
      if (h === 'localhost' || h === '127.0.0.1' || h === '0.0.0.0' ||
          h.startsWith('10.') || h.startsWith('192.168.') || h.startsWith('172.') ||
          h.endsWith('.local') || h.endsWith('.internal') ||
          h === '169.254.169.254' || h === 'metadata.google.internal') {
        return NextResponse.json({ error: 'URL inválida: no se permiten direcciones internas' }, { status: 400 });
      }
    } catch {
      return NextResponse.json({ error: 'URL inválida' }, { status: 400 });
    }

    // Check n8n is configured
    if (!isN8nConfigured()) {
      return NextResponse.json({ error: 'n8n no está configurado. Configura N8N_BASE_URL y N8N_API_KEY.' }, { status: 503 });
    }

    // Check and spend credit
    const spent = await spendCredit(workspaceId, userId, 'auditoria', `Auditoría de ${url}`, token);
    if (!spent) {
      return NextResponse.json({ error: 'No tienes créditos suficientes' }, { status: 402 });
    }

    // Create audit record in 'procesando' state
    const { data: auditoria, error: insertError } = await db
      .from('auditorias')
      .insert({ workspace_id: workspaceId, empresa_id: empresaId || null, url, estado: 'procesando' })
      .select()
      .single();

    if (insertError) throw insertError;

    // Fire n8n webhook (fire-and-forget — don't await the full processing)
    try {
      await triggerN8nWebhook('audit-pipeline', {
        auditoriaId: auditoria.id,
        url,
        workspaceId,
        userId,
        empresaId: empresaId || null,
      });
    } catch (e) {
      console.error('Error triggering n8n webhook:', e);
      // Mark as error so user knows it failed
      await db.from('auditorias').update({
        estado: 'error',
        error_message: 'No se pudo conectar con el sistema de análisis. Inténtalo de nuevo.',
        updated_at: new Date().toISOString(),
      }).eq('id', auditoria.id);

      return NextResponse.json({ error: 'Error al iniciar el análisis' }, { status: 502 });
    }

    // Return immediately with the audit ID — frontend will poll
    return NextResponse.json({
      id: auditoria.id,
      estado: 'procesando',
      url,
    });
  } catch (error) {
    console.error('Analyze error:', error);
    return NextResponse.json(
      { error: 'Error al analizar. Inténtalo de nuevo más tarde.' },
      { status: 500 }
    );
  }
}
