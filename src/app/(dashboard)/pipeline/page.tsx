'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import type { Lead } from '@/lib/types/database';
import { PIPELINE_STAGES } from '@/lib/constants';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/shared/empty-state';
import { ListSkeleton } from '@/components/shared/loading-skeleton';
import { Users, Mail, Phone } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

type LeadWithEmpresa = Lead & { empresas?: { nombre: string } };

function LeadCard({ lead }: { lead: LeadWithEmpresa }) {
  const scoreColor = (lead.score || 0) >= 80 ? 'text-green-500' : (lead.score || 0) >= 60 ? 'text-yellow-500' : 'text-red-500';

  return (
    <Card className="hover:border-primary/30 transition-colors">
      <CardContent className="p-3 space-y-2">
        <div className="flex items-start justify-between">
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium truncate">{lead.nombre_contacto}</p>
            <p className="text-xs text-muted-foreground truncate">{lead.empresas?.nombre || '—'}</p>
          </div>
          {lead.score != null && (
            <span className={cn('text-sm font-bold', scoreColor)}>{lead.score}</span>
          )}
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          {lead.email && <Mail className="h-3 w-3" />}
          {lead.telefono && <Phone className="h-3 w-3" />}
          {lead.valor_estimado != null && (
            <span className="ml-auto font-medium text-foreground">{lead.valor_estimado}€</span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function KanbanColumn({
  stage,
  leads,
  onMove,
}: {
  stage: { key: string; label: string; color: string };
  leads: LeadWithEmpresa[];
  onMove: (id: string, newStage: string) => void;
}) {
  const total = leads.reduce((sum, l) => sum + (Number(l.valor_estimado) || 0), 0);

  return (
    <div className="flex flex-col w-72 shrink-0">
      <div className="flex items-center gap-2 mb-3 px-1">
        <div className={cn('h-2.5 w-2.5 rounded-full', stage.color)} />
        <h3 className="text-sm font-medium">{stage.label}</h3>
        <Badge variant="secondary" className="text-xs ml-auto">{leads.length}</Badge>
      </div>
      {total > 0 && (
        <p className="text-xs text-muted-foreground mb-2 px-1">{total.toLocaleString('es-ES')}€</p>
      )}
      <div className="flex-1 space-y-2 min-h-[200px] p-2 rounded-lg bg-muted/30">
        {leads.map((lead) => (
          <div key={lead.id}>
            <LeadCard lead={lead} />
            <div className="flex flex-wrap gap-1 mt-1">
              {PIPELINE_STAGES
                .filter((s) => s.key !== stage.key)
                .slice(0, 3)
                .map((s) => (
                  <button
                    key={s.key}
                    onClick={() => onMove(lead.id, s.key)}
                    className="text-[10px] text-muted-foreground hover:text-foreground px-1.5 py-0.5 rounded bg-muted hover:bg-muted/80 transition-colors"
                  >
                    → {s.label}
                  </button>
                ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function PipelinePage() {
  const supabase = createClient();
  const queryClient = useQueryClient();

  const { data: leads, isLoading } = useQuery<LeadWithEmpresa[]>({
    queryKey: ['leads-pipeline'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('leads')
        .select('*, empresas(nombre)')
        .order('ultima_actividad_at', { ascending: false });
      if (error) throw error;
      return data as LeadWithEmpresa[];
    },
  });

  const moveMutation = useMutation({
    mutationFn: async ({ id, newStage }: { id: string; newStage: string }) => {
      const { error } = await supabase
        .from('leads')
        .update({ estado_pipeline: newStage, ultima_actividad_at: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads-pipeline'] });
      toast.success('Lead movido');
    },
  });

  if (isLoading) return <ListSkeleton rows={5} />;

  const leadsByStage = PIPELINE_STAGES.reduce((acc, stage) => {
    acc[stage.key] = (leads || []).filter((l) => l.estado_pipeline === stage.key);
    return acc;
  }, {} as Record<string, LeadWithEmpresa[]>);

  const totalValor = (leads || []).reduce((s, l) => s + (Number(l.valor_estimado) || 0), 0);

  return (
    <div className="space-y-6 h-full">
      <div>
        <h1 className="text-2xl font-bold">Pipeline CRM</h1>
        <p className="text-muted-foreground">
          {(leads || []).length} leads · {totalValor.toLocaleString('es-ES')}€ en pipeline
        </p>
      </div>

      {!leads?.length ? (
        <EmptyState
          icon={Users}
          title="Pipeline vacío"
          description="Los leads aparecerán aquí cuando hagas auditorías o prospección"
        />
      ) : (
        <div className="flex gap-4 overflow-x-auto pb-4">
          {PIPELINE_STAGES.map((stage) => (
            <KanbanColumn
              key={stage.key}
              stage={stage}
              leads={leadsByStage[stage.key] || []}
              onMove={(id, newStage) => moveMutation.mutate({ id, newStage })}
            />
          ))}
        </div>
      )}
    </div>
  );
}
