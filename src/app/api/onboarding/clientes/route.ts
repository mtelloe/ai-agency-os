import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

const SIMEDALAVIDA_SUPABASE_URL = 'https://ttpduldgqbdbkdpnfuvj.supabase.co';
const N8N_WEBHOOK_URL =
  'https://automatizaciones-n8n.hjbrvj.easypanel.host/webhook/onboarding-nuevo-cliente';

async function getServiceRoleKey(): Promise<string | null> {
  return process.env.SIMEDALAVIDA_SUPABASE_SERVICE_ROLE_KEY ?? null;
}

async function requireAdmin(): Promise<{ ok: true } | NextResponse> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
  }
  const { data: profile } = await supabase
    .from('users_profile')
    .select('rol')
    .eq('id', user.id)
    .single();
  if (!profile || (profile.rol !== 'owner' && profile.rol !== 'admin')) {
    return NextResponse.json({ error: 'Acceso restringido' }, { status: 403 });
  }
  return { ok: true };
}

export async function GET() {
  const auth = await requireAdmin();
  if (auth instanceof NextResponse) return auth;

  const key = await getServiceRoleKey();
  if (!key) {
    return NextResponse.json(
      { error: 'SIMEDALAVIDA_SUPABASE_SERVICE_ROLE_KEY no configurada' },
      { status: 503 }
    );
  }

  const res = await fetch(
    `${SIMEDALAVIDA_SUPABASE_URL}/rest/v1/clientes_onboarding?select=*&order=created_at.desc`,
    {
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/json',
      },
    }
  );

  if (!res.ok) {
    const body = await res.text();
    return NextResponse.json({ error: body }, { status: res.status });
  }

  const data = await res.json();
  return NextResponse.json(data);
}

export async function POST(req: NextRequest) {
  const auth = await requireAdmin();
  if (auth instanceof NextResponse) return auth;

  const body = await req.json();
  const { nombre_cliente, email_cliente, fecha_inicio, agentes, notas, setup_fee, mrr } = body;

  if (!nombre_cliente || !email_cliente) {
    return NextResponse.json(
      { error: 'nombre_cliente y email_cliente son obligatorios' },
      { status: 400 }
    );
  }

  const webhookRes = await fetch(N8N_WEBHOOK_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      nombre_cliente,
      email_cliente,
      fecha_inicio: fecha_inicio || new Date().toISOString().split('T')[0],
      agentes: agentes || '',
      notas: notas || '',
      setup_fee: setup_fee ?? 1600,
      mrr: mrr ?? 150,
    }),
  });

  if (!webhookRes.ok) {
    const txt = await webhookRes.text();
    return NextResponse.json({ error: `Error en n8n: ${txt}` }, { status: 502 });
  }

  return NextResponse.json({ ok: true });
}

export async function PATCH(req: NextRequest) {
  const auth = await requireAdmin();
  if (auth instanceof NextResponse) return auth;

  const key = await getServiceRoleKey();
  if (!key) {
    return NextResponse.json(
      { error: 'SIMEDALAVIDA_SUPABASE_SERVICE_ROLE_KEY no configurada' },
      { status: 503 }
    );
  }

  const body = await req.json();
  const { id, ...updates } = body;
  if (!id) {
    return NextResponse.json({ error: 'id es obligatorio' }, { status: 400 });
  }

  const res = await fetch(
    `${SIMEDALAVIDA_SUPABASE_URL}/rest/v1/clientes_onboarding?id=eq.${id}`,
    {
      method: 'PATCH',
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/json',
        Prefer: 'return=representation',
      },
      body: JSON.stringify(updates),
    }
  );

  if (!res.ok) {
    const txt = await res.text();
    return NextResponse.json({ error: txt }, { status: res.status });
  }

  const data = await res.json();
  return NextResponse.json(data[0] ?? {});
}
