'use client';

import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import type { Auditoria } from '@/lib/types/database';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/shared/empty-state';
import { ListSkeleton } from '@/components/shared/loading-skeleton';
import { ClipboardList, Plus, ExternalLink } from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';

const ESTADO_COLORS: Record<string, string> = {
  completada: 'bg-green-500/10 text-green-500',
  procesando: 'bg-yellow-500/10 text-yellow-500',
  pendiente: 'bg-gray-500/10 text-gray-500',
  error: 'bg-red-500/10 text-red-500',
};

function scoreColor(score: number | null) {
  if (!score) return 'text-gray-400';
  if (score >= 71) return 'text-green-500';
  if (score >= 41) return 'text-yellow-500';
  return 'text-red-500';
}

export default function AuditoriasPage() {
  const supabase = createClient();

  const { data: auditorias, isLoading } = useQuery<Auditoria[]>({
    queryKey: ['auditorias'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('auditorias')
        .select('*, empresas(nombre)')
        .order('created_at', { ascending: false })
        .limit(50);
      if (error) throw error;
      return data as Auditoria[];
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Auditorías</h1>
          <p className="text-muted-foreground">Historial de análisis de negocios</p>
        </div>
        <Link
          href="/analizador"
          className="inline-flex items-center gap-1.5 h-8 px-3 rounded-md text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/80 transition-colors"
        >
          <Plus className="h-4 w-4" />
          Nueva auditoría
        </Link>
      </div>

      {isLoading ? (
        <ListSkeleton rows={5} />
      ) : !auditorias?.length ? (
        <EmptyState
          icon={ClipboardList}
          title="Sin auditorías"
          description="Analiza tu primer negocio para ver los resultados aquí"
          action={
            <Link
              href="/analizador"
              className="inline-flex items-center gap-1.5 h-8 px-3 rounded-md text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/80"
            >
              <Plus className="h-4 w-4" />
              Primera auditoría
            </Link>
          }
        />
      ) : (
        <div className="space-y-3">
          {auditorias.map((a) => (
            <Link key={a.id} href={`/auditorias/${a.id}`}>
              <Card className="hover:border-primary/30 transition-colors cursor-pointer">
                <CardContent className="p-4 flex items-center gap-4">
                  <div className={cn('text-2xl font-bold w-12 text-center', scoreColor(a.score_oportunidad))}>
                    {a.score_oportunidad ?? '—'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">
                      {(a as Auditoria & { empresas?: { nombre: string } }).empresas?.nombre || new URL(a.url).hostname}
                    </p>
                    <p className="text-sm text-muted-foreground truncate flex items-center gap-1">
                      <ExternalLink className="h-3 w-3" />
                      {a.url}
                    </p>
                  </div>
                  <Badge className={ESTADO_COLORS[a.estado] || ''}>
                    {a.estado}
                  </Badge>
                  <p className="text-xs text-muted-foreground whitespace-nowrap">
                    {new Date(a.created_at).toLocaleDateString('es-ES')}
                  </p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
