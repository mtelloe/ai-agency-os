import { NextRequest, NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/supabase/admin';
import { callClaude } from '@/lib/ai/claude';
import { GENERATE_PROPOSAL_SYSTEM, buildProposalPrompt } from '@/lib/ai/prompts/generate-proposal';
import { parseJsonResponse } from '@/lib/ai/parsers';
import { spendCredit, logActivity } from '@/lib/credits';

export async function POST(request: NextRequest) {
  try {
    const { auditoriaId, workspaceId, userId } = await request.json();

    if (!auditoriaId || !workspaceId || !userId) {
      return NextResponse.json({ error: 'Faltan campos requeridos' }, { status: 400 });
    }

    // Get audit data
    const { data: auditoria } = await getAdminClient()
      .from('auditorias')
      .select('*, empresas(*)')
      .eq('id', auditoriaId)
      .single();

    if (!auditoria || auditoria.estado !== 'completada') {
      return NextResponse.json({ error: 'Auditoría no encontrada o no completada' }, { status: 404 });
    }

    // Spend credit
    const spent = await spendCredit(workspaceId, userId, 'propuesta', `Propuesta para ${auditoria.url}`);
    if (!spent) {
      return NextResponse.json({ error: 'No tienes créditos suficientes' }, { status: 402 });
    }

    // Generate with Claude
    const prompt = buildProposalPrompt({
      empresa: auditoria.empresas?.nombre || new URL(auditoria.url).hostname,
      url: auditoria.url,
      resumen: auditoria.resumen_negocio || '',
      problemas: auditoria.problemas || [],
      oportunidades: auditoria.oportunidades || [],
      automatizaciones: auditoria.automatizaciones_recomendadas || [],
      agentes: auditoria.agentes_recomendados || [],
      pricing: auditoria.pricing_sugerido,
    });

    const rawResponse = await callClaude(GENERATE_PROPOSAL_SYSTEM, prompt);
    const proposal = parseJsonResponse<{
      titulo: string;
      resumen_ejecutivo: string;
      problemas: string;
      solucion: string;
      stack: string;
      cronograma: string;
      precio_setup: number;
      precio_mensual: number;
      roi: string;
      cta_cierre: string;
    }>(rawResponse);

    // Save proposal
    const { data: propuesta, error } = await getAdminClient()
      .from('propuestas')
      .insert({
        workspace_id: workspaceId,
        empresa_id: auditoria.empresa_id,
        auditoria_id: auditoriaId,
        titulo: proposal.titulo,
        resumen_ejecutivo: proposal.resumen_ejecutivo,
        problemas: proposal.problemas,
        solucion: proposal.solucion,
        stack: proposal.stack,
        cronograma: proposal.cronograma,
        precio_setup: proposal.precio_setup,
        precio_mensual: proposal.precio_mensual,
        roi: proposal.roi,
        cta_cierre: proposal.cta_cierre,
      })
      .select()
      .single();

    if (error) throw error;

    await logActivity(workspaceId, userId, 'propuesta_generada', `Propuesta generada: ${proposal.titulo}`, 'propuestas', propuesta.id);

    return NextResponse.json(propuesta);
  } catch (error) {
    console.error('Generate proposal error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Error al generar propuesta' },
      { status: 500 }
    );
  }
}
