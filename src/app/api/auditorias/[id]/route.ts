import { NextRequest, NextResponse } from 'next/server';
import { createApiClient, getTokenFromRequest } from '@/lib/supabase/api-client';

/**
 * GET /api/auditorias/[id]
 *
 * Returns a single audit by ID. Used for polling during async processing.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const token = getTokenFromRequest(request);
  if (!token) {
    return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
  }

  const { id } = await params;

  if (!id || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
    return NextResponse.json({ error: 'ID inválido' }, { status: 400 });
  }

  const db = createApiClient(token);

  const { data, error } = await db
    .from('auditorias')
    .select('id, estado, score_oportunidad, error_message, url, updated_at')
    .eq('id', id)
    .single();

  if (error || !data) {
    return NextResponse.json({ error: 'Auditoría no encontrada' }, { status: 404 });
  }

  return NextResponse.json(data);
}
