import { createClient } from '@/lib/supabase/server';
import ClientPortal from './ClientPortal';

export default async function ClientePortalPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const supabase = await createClient();

  const { data: empresa } = await supabase
    .from('empresas')
    .select('id, nombre, portal_pin, portal_fases, portal_facturas, portal_notas, email, telefono')
    .eq('portal_slug', slug)
    .single();

  if (!empresa) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0a0a0a]">
        <div className="text-center space-y-3 px-4">
          <p className="text-2xl font-bold text-white">Portal no encontrado</p>
          <p className="text-zinc-400">Comprueba el enlace o contacta con nosotros.</p>
          <a href="mailto:info@simedalavida.com" className="text-sm text-indigo-400 hover:text-indigo-300">
            info@simedalavida.com
          </a>
        </div>
      </div>
    );
  }

  return <ClientPortal empresa={empresa} />;
}
