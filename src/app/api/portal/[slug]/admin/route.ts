import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const body = await request.json();

  const { error } = await supabase
    .from('empresas')
    .update({
      portal_pin: body.portal_pin,
      portal_fases: body.portal_fases,
      portal_facturas: body.portal_facturas,
      portal_notas: body.portal_notas,
      portal_notas_admin: body.portal_notas_admin,
      portal_inversion: body.portal_inversion ?? null,
    })
    .eq('portal_slug', slug);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
