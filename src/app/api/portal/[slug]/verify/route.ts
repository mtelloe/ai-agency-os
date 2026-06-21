import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const { pin } = await request.json();

  const supabase = await createClient();
  const { data: empresa } = await supabase
    .from('empresas')
    .select('portal_pin')
    .eq('portal_slug', slug)
    .single();

  if (!empresa || empresa.portal_pin !== pin) {
    return NextResponse.json({ error: 'PIN incorrecto' }, { status: 401 });
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set(`portal_${slug}`, '1', {
    httpOnly: true,
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 7,
    path: '/',
  });

  return response;
}
