import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import ClientPortal from './ClientPortal';

export default async function ClientePortalPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const cookieStore = await cookies();
  const isUnlocked = cookieStore.get(`portal_${slug}`)?.value === '1';

  const supabase = await createClient();

  if (!isUnlocked) {
    const { data: empresa } = await supabase
      .from('empresas')
      .select('nombre')
      .eq('portal_slug', slug)
      .single();

    if (!empresa) return <NotFound />;

    return (
      <ClientPortal
        empresa={{ nombre: empresa.nombre }}
        slug={slug}
        isUnlocked={false}
      />
    );
  }

  const { data: empresa } = await supabase
    .from('empresas')
    .select('nombre, portal_fases, portal_facturas, portal_notas, email, telefono')
    .eq('portal_slug', slug)
    .single();

  if (!empresa) return <NotFound />;

  return <ClientPortal empresa={empresa} slug={slug} isUnlocked={true} />;
}

function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0a0a0a]">
      <div className="text-center space-y-3 px-4">
        <p className="text-2xl font-bold text-white">Portal no encontrado</p>
        <p className="text-zinc-400 text-sm">Comprueba el enlace o contacta con nosotros.</p>
        <a
          href="mailto:info@simedalavida.com"
          className="text-sm text-indigo-400 hover:text-indigo-300 transition-colors"
        >
          info@simedalavida.com
        </a>
      </div>
    </div>
  );
}
