import { NextRequest, NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/supabase/admin';
import { callClaude } from '@/lib/ai/claude';
import { GENERATE_SCRIPTS_SYSTEM, buildScriptsPrompt } from '@/lib/ai/prompts/generate-scripts';
import { parseJsonResponse } from '@/lib/ai/parsers';
import { spendCredit, logActivity } from '@/lib/credits';

export async function POST(request: NextRequest) {
  try {
    const { auditoriaId, workspaceId, userId } = await request.json();

    if (!auditoriaId || !workspaceId || !userId) {
      return NextResponse.json({ error: 'Faltan campos requeridos' }, { status: 400 });
    }

    const { data: auditoria } = await getAdminClient()
      .from('auditorias')
      .select('*, empresas(*)')
      .eq('id', auditoriaId)
      .single();

    if (!auditoria || auditoria.estado !== 'completada') {
      return NextResponse.json({ error: 'Auditoría no encontrada o no completada' }, { status: 404 });
    }

    const spent = await spendCredit(workspaceId, userId, 'scripts', `Scripts para ${auditoria.url}`);
    if (!spent) {
      return NextResponse.json({ error: 'No tienes créditos suficientes' }, { status: 402 });
    }

    const prompt = buildScriptsPrompt({
      empresa: auditoria.empresas?.nombre || new URL(auditoria.url).hostname,
      url: auditoria.url,
      resumen: auditoria.resumen_negocio || '',
      problemas: auditoria.problemas || [],
      servicios: auditoria.servicios || '',
      nicho: auditoria.empresas?.nicho,
    });

    const rawResponse = await callClaude(GENERATE_SCRIPTS_SYSTEM, prompt);
    const scripts = parseJsonResponse<{
      cold_email: string;
      script_llamada: string;
      mensaje_whatsapp: string;
      follow_up: string;
      pitch_demo: string;
      objeciones: Array<{ objecion: string; respuesta: string }>;
    }>(rawResponse);

    const { data: script, error } = await getAdminClient()
      .from('scripts')
      .insert({
        workspace_id: workspaceId,
        empresa_id: auditoria.empresa_id,
        auditoria_id: auditoriaId,
        cold_email: scripts.cold_email,
        script_llamada: scripts.script_llamada,
        mensaje_whatsapp: scripts.mensaje_whatsapp,
        follow_up: scripts.follow_up,
        pitch_demo: scripts.pitch_demo,
        objeciones: scripts.objeciones,
      })
      .select()
      .single();

    if (error) throw error;

    await logActivity(workspaceId, userId, 'scripts_generados', `Scripts generados para ${auditoria.url}`, 'scripts', script.id);

    return NextResponse.json(script);
  } catch (error) {
    console.error('Generate scripts error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Error al generar scripts' },
      { status: 500 }
    );
  }
}
