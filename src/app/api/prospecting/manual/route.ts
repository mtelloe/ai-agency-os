import { NextRequest, NextResponse } from 'next/server';
import { getTokenFromRequest } from '@/lib/supabase/api-client';
import { spendCredit, logActivity } from '@/lib/credits';
import { triggerN8nWebhook, isN8nConfigured } from '@/lib/n8n/client';

export async function POST(request: NextRequest) {
  try {
    const token = getTokenFromRequest(request);
    if (!token) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });

    const body = await request.json();
    const { nicho, ciudad, workspaceId, userId } = body;
    const cantidad = Math.min(Math.max(1, Number(body.cantidad) || 5), 20);

    if (!nicho || !ciudad || !workspaceId || !userId) {
      return NextResponse.json({ error: 'Faltan campos requeridos' }, { status: 400 });
    }

    if (typeof nicho !== 'string' || nicho.length > 200 || typeof ciudad !== 'string' || ciudad.length > 200) {
      return NextResponse.json({ error: 'Datos de entrada invalidos' }, { status: 400 });
    }

    if (!isN8nConfigured()) {
      return NextResponse.json({ error: 'n8n no configurado' }, { status: 503 });
    }

    const spent1 = await spendCredit(workspaceId, userId, 'prospeccion', `Prospeccion: ${nicho} en ${ciudad}`, token);
    if (!spent1) return NextResponse.json({ error: 'No tienes creditos suficientes' }, { status: 402 });
    const spent2 = await spendCredit(workspaceId, userId, 'prospeccion', `Prospeccion (2/2): ${nicho} en ${ciudad}`, token);
    if (!spent2) return NextResponse.json({ error: 'No tienes creditos suficientes' }, { status: 402 });

    await triggerN8nWebhook('prospect-enrich', {
      workspace_id: workspaceId,
      nicho,
      ciudad,
      cantidad,
      callback_url: `${process.env.BASE_URL || process.env.NEXT_PUBLIC_APP_URL}/api/webhooks/n8n`,
    });

    await logActivity(
      workspaceId, userId, 'prospeccion_iniciada',
      `Prospeccion iniciada: ${nicho} en ${ciudad} (${cantidad} leads)`,
      token,
    );

    return NextResponse.json({
      message: 'Prospeccion iniciada. Los leads apareceran en el pipeline cuando esten listos.',
      status: 'processing',
    });
  } catch (error) {
    console.error('[prospecting/manual] Error:', error);
    return NextResponse.json({ error: 'Error al iniciar prospeccion' }, { status: 500 });
  }
}
