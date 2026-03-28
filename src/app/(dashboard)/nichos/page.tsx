'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import type { Nicho } from '@/lib/types/database';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { EmptyState } from '@/components/shared/empty-state';
import { ListSkeleton } from '@/components/shared/loading-skeleton';
import { BookOpen, Search, AlertTriangle, Lightbulb, Zap } from 'lucide-react';

export default function NichosPage() {
  const supabase = createClient();
  const [search, setSearch] = useState('');

  const { data: nichos, isLoading } = useQuery<Nicho[]>({
    queryKey: ['nichos'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('nichos')
        .select('*')
        .eq('activo', true)
        .order('nombre', { ascending: true });
      if (error) throw error;
      return data as Nicho[];
    },
  });

  const filtered = nichos?.filter((n) =>
    n.nombre.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Biblioteca de nichos</h1>
        <p className="text-muted-foreground">
          Templates por industria con problemas, ofertas y automatizaciones típicas
        </p>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Buscar nicho..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-8"
        />
      </div>

      {isLoading ? (
        <ListSkeleton />
      ) : !filtered || filtered.length === 0 ? (
        <EmptyState
          icon={BookOpen}
          title={search ? 'Sin resultados' : 'No hay nichos'}
          description={
            search
              ? `No se encontraron nichos para "${search}"`
              : 'Aún no hay nichos configurados'
          }
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((nicho) => (
            <Card key={nicho.id}>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>{nicho.nombre}</span>
                </CardTitle>
                <CardDescription className="flex items-center gap-3 pt-1">
                  {nicho.precio_base_setup != null && (
                    <span className="font-medium text-foreground">
                      Setup: {nicho.precio_base_setup}€
                    </span>
                  )}
                  {nicho.precio_base_mensual != null && (
                    <span className="font-medium text-foreground">
                      Mensual: {nicho.precio_base_mensual}€/mes
                    </span>
                  )}
                </CardDescription>
              </CardHeader>

              <CardContent className="space-y-4">
                {/* Problemas comunes */}
                {nicho.problemas_comunes.length > 0 && (
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      <AlertTriangle className="h-3.5 w-3.5" />
                      Problemas comunes
                    </div>
                    <ul className="space-y-1">
                      {nicho.problemas_comunes.map((p, i) => (
                        <li key={i} className="text-xs text-muted-foreground leading-relaxed">
                          • {p}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Ofertas recomendadas */}
                {nicho.ofertas_recomendadas.length > 0 && (
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      <Lightbulb className="h-3.5 w-3.5" />
                      Ofertas recomendadas
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {nicho.ofertas_recomendadas.map((o, i) => (
                        <Badge key={i} variant="secondary" className="text-[11px]">
                          {o}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Automatizaciones típicas */}
                {nicho.automatizaciones_tipicas.length > 0 && (
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      <Zap className="h-3.5 w-3.5" />
                      Automatizaciones típicas
                    </div>
                    <ul className="space-y-1">
                      {nicho.automatizaciones_tipicas.map((a, i) => (
                        <li key={i} className="text-xs text-muted-foreground leading-relaxed">
                          • {a}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
