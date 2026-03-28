import { createClient } from '@supabase/supabase-js';

function getServerClient(accessToken?: string) {
  const client = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    accessToken ? { global: { headers: { Authorization: `Bearer ${accessToken}` } } } : undefined
  );
  return client;
}

export async function checkCredits(workspaceId: string, accessToken?: string): Promise<{ available: number; canSpend: boolean }> {
  const { data } = await getServerClient(accessToken)
    .from('workspaces')
    .select('creditos_total, creditos_usados')
    .eq('id', workspaceId)
    .single();

  if (!data) return { available: 0, canSpend: false };

  const available = data.creditos_total - data.creditos_usados;
  return { available, canSpend: available > 0 };
}

export async function spendCredit(
  workspaceId: string,
  userId: string,
  accion: string,
  descripcion: string,
  accessToken?: string,
  referenciaId?: string,
  referenciaTipo?: string,
): Promise<boolean> {
  const { available, canSpend } = await checkCredits(workspaceId, accessToken);
  if (!canSpend) return false;

  const client = getServerClient(accessToken);

  await client.rpc('increment_creditos_usados', { ws_id: workspaceId });

  await client.from('creditos_ledger').insert({
    workspace_id: workspaceId,
    user_id: userId,
    accion,
    creditos: 1,
    tipo_movimiento: 'cargo',
    descripcion,
    balance_despues: available - 1,
    referencia_tipo: referenciaTipo,
    referencia_id: referenciaId,
  });

  return true;
}

export async function logActivity(
  workspaceId: string,
  userId: string,
  tipoEvento: string,
  descripcion: string,
  accessToken?: string,
  entidadTipo?: string,
  entidadId?: string,
) {
  await getServerClient(accessToken).from('actividad').insert({
    workspace_id: workspaceId,
    user_id: userId,
    tipo_evento: tipoEvento,
    descripcion,
    entidad_tipo: entidadTipo,
    entidad_id: entidadId,
  });
}
