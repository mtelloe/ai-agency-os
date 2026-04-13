import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function getServerClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}

function verifyN8nAuth(request: NextRequest): boolean {
  const apiKey = process.env.N8N_API_KEY;
  if (!apiKey) return false;
  return request.headers.get('X-N8N-API-KEY') === apiKey;
}

export async function GET(request: NextRequest) {
  if (!verifyN8nAuth(request)) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  const db = getServerClient();

  const { data: workspaces, error } = await db
    .from('workspaces')
    .select('id, nombre, nicho_principal, ciudad_principal, creditos_total, creditos_usados')
    .eq('auto_prospecting', true);

  if (error) {
    console.error('[workspaces-activos] Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const activos = (workspaces || []).filter(
    (w) => w.creditos_total - w.creditos_usados >= 2
  );

  return NextResponse.json({ workspaces: activos });
}
