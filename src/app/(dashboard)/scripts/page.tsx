'use client';

import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import type { Script } from '@/lib/types/database';
import { Card, CardContent } from '@/components/ui/card';
import { EmptyState } from '@/components/shared/empty-state';
import { ListSkeleton } from '@/components/shared/loading-skeleton';
import { PenTool } from 'lucide-react';
import Link from 'next/link';

export default function ScriptsPage() {
  const supabase = createClient();

  const { data: scripts, isLoading } = useQuery<Script[]>({
    queryKey: ['scripts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('scripts')
        .select('*, empresas(nombre)')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as Script[];
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Scripts de venta</h1>
        <p className="text-muted-foreground">Scripts personalizados generados desde auditorías</p>
      </div>

      {isLoading ? (
        <ListSkeleton rows={5} />
      ) : !scripts?.length ? (
        <EmptyState
          icon={PenTool}
          title="Sin scripts"
          description="Genera scripts desde una auditoría completada"
        />
      ) : (
        <div className="space-y-3">
          {scripts.map((s) => (
            <Link key={s.id} href={`/scripts/${s.id}`}>
              <Card className="hover:border-primary/30 transition-colors cursor-pointer">
                <CardContent className="p-4 flex items-center gap-4">
                  <PenTool className="h-5 w-5 text-muted-foreground shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium">
                      {(s as Script & { empresas?: { nombre: string } }).empresas?.nombre || 'Empresa'}
                    </p>
                    <p className="text-sm text-muted-foreground truncate">
                      {s.cold_email?.slice(0, 100)}...
                    </p>
                  </div>
                  <p className="text-xs text-muted-foreground whitespace-nowrap">
                    {new Date(s.created_at).toLocaleDateString('es-ES')}
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
