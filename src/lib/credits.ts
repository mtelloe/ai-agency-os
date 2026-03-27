import { getAdminClient } from '@/lib/supabase/admin';

export async function checkCredits(workspaceId: string): Promise<{ available: number; canSpend: boolean }> {
  const { data } = await getAdminClient()
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
  referenciaId?: string,
  referenciaTipo?: string,
): Promise<boolean> {
  const { available, canSpend } = await checkCredits(workspaceId);
  if (!canSpend) return false;

  // Increment usados
  await getAdminClient().rpc('increment_creditos_usados', { ws_id: workspaceId });

  // Log in ledger
  await getAdminClient().from('creditos_ledger').insert({
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
  entidadTipo?: string,
  entidadId?: string,
) {
  await getAdminClient().from('actividad').insert({
    workspace_id: workspaceId,
    user_id: userId,
    tipo_evento: tipoEvento,
    descripcion,
    entidad_tipo: entidadTipo,
    entidad_id: entidadId,
  });
}
