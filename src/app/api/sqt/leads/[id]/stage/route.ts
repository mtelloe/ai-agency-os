import { NextRequest, NextResponse } from 'next/server';
import { createApiClient, getTokenFromRequest } from '@/lib/supabase/api-client';

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const token = getTokenFromRequest(req);
  if (!token) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });

  const { id } = await params;
  const { etapa } = await req.json();
  if (!etapa) return NextResponse.json({ error: 'etapa es obligatorio' }, { status: 400 });

  const db = createApiClient(token);
  const { error } = await db
    .from('sqt_leads')
    .update({ etapa })
    .eq('id', id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
