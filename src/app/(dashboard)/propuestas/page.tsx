'use client';

import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import type { Propuesta } from '@/lib/types/database';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/shared/empty-state';
import { ListSkeleton } from '@/components/shared/loading-skeleton';
import { FileText } from 'lucide-react';
import Link from 'next/link';

const ESTADO_COLORS: Record<string, string> = {
  borrador: 'bg-gray-500/10 text-gray-500',
  enviada: 'bg-blue-500/10 text-blue-500',
  aceptada: 'bg-green-500/10 text-green-500',
  rechazada: 'bg-red-500/10 text-red-500',
  negociando: 'bg-yellow-500/10 text-yellow-500',
};

export default function PropuestasPage() {
  const supabase = createClient();

  const { data: propuestas, isLoading } = useQuery<Propuesta[]>({
    queryKey: ['propuestas'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('propuestas')
        .select('*, empresas(nombre)')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as Propuesta[];
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Propuestas</h1>
        <p className="text-muted-foreground">Propuestas comerciales generadas</p>
      </div>

      {isLoading ? (
        <ListSkeleton rows={5} />
      ) : !propuestas?.length ? (
        <EmptyState
          icon={FileText}
          title="Sin propuestas"
          description="Genera tu primera propuesta desde una auditoría completada"
        />
      ) : (
        <div className="space-y-3">
          {propuestas.map((p) => (
            <Link key={p.id} href={`/propuestas/${p.id}`}>
              <Card className="hover:border-primary/30 transition-colors cursor-pointer">
                <CardContent className="p-4 flex items-center gap-4">
                  <FileText className="h-5 w-5 text-muted-foreground shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{p.titulo}</p>
                    <p className="text-sm text-muted-foreground truncate">
                      {(p as Propuesta & { empresas?: { nombre: string } }).empresa?.nombre || 'Empresa'}
                      {p.precio_setup && ` · Setup ${p.precio_setup}€`}
                      {p.precio_mensual && ` · ${p.precio_mensual}€/mes`}
                    </p>
                  </div>
                  <Badge className={ESTADO_COLORS[p.estado] || ''}>{p.estado}</Badge>
                  <p className="text-xs text-muted-foreground whitespace-nowrap">
                    {new Date(p.created_at).toLocaleDateString('es-ES')}
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
