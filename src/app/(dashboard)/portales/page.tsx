import { createClient } from '@/lib/supabase/server';
import { ExternalLink, Pencil } from 'lucide-react';
import Link from 'next/link';

type Fase = { estado: 'completado' | 'en_curso' | 'pendiente' };

export default async function PortalesPage() {
  const supabase = await createClient();

  const { data: empresas } = await supabase
    .from('empresas')
    .select('id, nombre, portal_slug, portal_pin, portal_fases')
    .not('portal_slug', 'is', null)
    .order('nombre');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Portales de cliente</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Estado y acceso a cada portal activo
        </p>
      </div>

      <div className="rounded-xl border overflow-hidden">
        {empresas?.map(empresa => {
          const fases: Fase[] = empresa.portal_fases || [];
          const completadas = fases.filter(f => f.estado === 'completado').length;
          const enCurso = fases.filter(f => f.estado === 'en_curso').length;
          const progreso = fases.length > 0
            ? Math.round((completadas / fases.length) * 100)
            : 0;

          return (
            <div
              key={empresa.id}
              className="flex items-center gap-4 px-5 py-4 border-b last:border-b-0 hover:bg-muted/30 transition-colors"
            >
              <div className="flex-1 min-w-0">
                <p className="font-medium">{empresa.nombre}</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  hub.simedalavida.com/cliente/{empresa.portal_slug}
                </p>
              </div>

              <div className="flex items-center gap-4 shrink-0 text-sm">
                {fases.length > 0 && (
                  <div className="flex items-center gap-2">
                    <div className="h-1.5 w-20 rounded-full bg-muted overflow-hidden">
                      <div
                        className="h-full rounded-full bg-primary transition-all"
                        style={{ width: `${progreso}%` }}
                      />
                    </div>
                    <span className="text-muted-foreground text-xs whitespace-nowrap">
                      {completadas}/{fases.length}
                      {enCurso > 0 && (
                        <span className="text-indigo-400 ml-1">· {enCurso} en curso</span>
                      )}
                    </span>
                  </div>
                )}

                <code className="text-xs bg-muted px-2 py-1 rounded font-mono text-muted-foreground">
                  {empresa.portal_pin}
                </code>

                <Link
                  href={`/portales/${empresa.portal_slug}`}
                  className="text-muted-foreground hover:text-foreground transition-colors"
                  title="Editar portal"
                >
                  <Pencil className="h-4 w-4" />
                </Link>
                <a
                  href={`https://hub.simedalavida.com/cliente/${empresa.portal_slug}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-muted-foreground hover:text-foreground transition-colors"
                  title="Abrir portal"
                >
                  <ExternalLink className="h-4 w-4" />
                </a>
              </div>
            </div>
          );
        })}

        {(!empresas || empresas.length === 0) && (
          <div className="px-5 py-16 text-center text-muted-foreground text-sm">
            No hay portales activos todavía.
          </div>
        )}
      </div>
    </div>
  );
}
