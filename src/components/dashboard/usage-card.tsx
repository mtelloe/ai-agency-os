'use client';

import { useQuery } from '@tanstack/react-query';
import { useAuthFetch } from '@/hooks/use-auth-fetch';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Activity } from 'lucide-react';

export function UsageCard() {
  const { authFetch } = useAuthFetch();

  const { data } = useQuery({
    queryKey: ['usage'],
    queryFn: async () => {
      const res = await authFetch('/api/admin/usage');
      if (!res.ok) return null;
      return res.json();
    },
  });

  if (!data) return null;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <Activity className="h-4 w-4 text-primary" />
          Consumo
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex gap-6">
          <div>
            <p className="text-2xl font-bold">{data.totalCreditos}</p>
            <p className="text-xs text-muted-foreground">créditos usados</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-primary">{data.totalEur}€</p>
            <p className="text-xs text-muted-foreground">coste real API</p>
          </div>
        </div>
        {data.entries?.length > 0 && (
          <div className="mt-3 space-y-1">
            <p className="text-xs text-muted-foreground">Últimas operaciones:</p>
            {data.entries.slice(0, 5).map((e: { accion: string; coste_eur: number; created_at: string }, i: number) => (
              <div key={i} className="flex justify-between text-xs">
                <span className="text-muted-foreground">{e.accion}</span>
                <span>{Number(e.coste_eur || 0).toFixed(3)}€</span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
