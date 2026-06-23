import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import PortalEditor from './PortalEditor';

export default async function EditPortalPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const supabase = await createClient();

  const { data: empresa } = await supabase
    .from('empresas')
    .select('id, nombre, portal_slug, portal_pin, portal_fases, portal_facturas, portal_notas, portal_notas_admin, portal_inversion')
    .eq('portal_slug', slug)
    .single();

  if (!empresa) notFound();

  return <PortalEditor empresa={empresa} />;
}
