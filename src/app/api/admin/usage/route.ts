import { NextRequest, NextResponse } from 'next/server';
import { createApiClient, getTokenFromRequest } from '@/lib/supabase/api-client';

export async function GET(request: NextRequest) {
  try {
    const token = getTokenFromRequest(request);
    if (!token) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });

    const db = createApiClient(token);
    const isAdmin = request.nextUrl.searchParams.get('admin') === 'true';

    if (isAdmin) {
      // Admin view: all workspaces usage (uses service role or admin check)
      const { data: ledger } = await db
        .from('creditos_ledger')
        .select('accion, creditos, coste_eur, created_at, workspace_id')
        .order('created_at', { ascending: false })
        .limit(500);

      const entries = ledger || [];
      const totalCreditos = entries.reduce((s, e) => s + (e.creditos || 0), 0);
      const totalEur = entries.reduce((s, e) => s + (Number(e.coste_eur) || 0), 0);

      // Group by action
      const byAction: Record<string, { count: number; creditos: number; coste: number }> = {};
      for (const e of entries) {
        if (!byAction[e.accion]) byAction[e.accion] = { count: 0, creditos: 0, coste: 0 };
        byAction[e.accion].count++;
        byAction[e.accion].creditos += e.creditos || 0;
        byAction[e.accion].coste += Number(e.coste_eur) || 0;
      }

      // Group by day (last 30 days)
      const byDay: Record<string, { creditos: number; coste: number }> = {};
      for (const e of entries) {
        const day = e.created_at?.slice(0, 10) || 'unknown';
        if (!byDay[day]) byDay[day] = { creditos: 0, coste: 0 };
        byDay[day].creditos += e.creditos || 0;
        byDay[day].coste += Number(e.coste_eur) || 0;
      }

      return NextResponse.json({
        totalCreditos,
        totalEur: Math.round(totalEur * 1000) / 1000,
        byAction,
        byDay,
        entries: entries.slice(0, 50),
      });
    } else {
      // User view: own workspace usage
      const { data: ledger } = await db
        .from('creditos_ledger')
        .select('accion, creditos, coste_eur, descripcion, created_at')
        .order('created_at', { ascending: false })
        .limit(100);

      const entries = ledger || [];
      const totalCreditos = entries.reduce((s, e) => s + (e.creditos || 0), 0);
      const totalEur = entries.reduce((s, e) => s + (Number(e.coste_eur) || 0), 0);

      return NextResponse.json({
        totalCreditos,
        totalEur: Math.round(totalEur * 1000) / 1000,
        entries,
      });
    }
  } catch {
    return NextResponse.json({ error: 'Error al obtener el uso' }, { status: 500 });
  }
}
