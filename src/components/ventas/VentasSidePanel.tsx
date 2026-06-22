'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { Play, Pause, Pencil } from 'lucide-react';
import { toggleAgent } from '@/app/actions/ventas';
import type { SalesAgentRow, EmailTemplateRow } from '@/lib/types/database';

interface Props {
  workspaceId: string;
  onEditTemplate: (template: EmailTemplateRow) => void;
}

export function VentasSidePanel({ workspaceId, onEditTemplate }: Props) {
  const supabase = createClient();
  const queryClient = useQueryClient();

  const { data: agents, isLoading: loadingAgents } = useQuery<SalesAgentRow[]>({
    queryKey: ['ventas-agents', workspaceId],
    refetchInterval: 30_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('agents')
        .select('*')
        .eq('workspace_id', workspaceId)
        .neq('status', 'archived')
        .order('name');
      if (error) throw error;
      return (data ?? []) as SalesAgentRow[];
    },
  });

  const { data: templates, isLoading: loadingTemplates } = useQuery<EmailTemplateRow[]>({
    queryKey: ['ventas-templates', workspaceId],
    refetchInterval: 30_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('email_templates')
        .select('*')
        .eq('workspace_id', workspaceId)
        .eq('active', true)
        .order('name');
      if (error) throw error;
      return (data ?? []) as EmailTemplateRow[];
    },
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, active }: { id: string; active: boolean }) =>
      toggleAgent(id, active),
    onSuccess: (result) => {
      if (!result.success) {
        toast.error(result.error ?? 'Error al actualizar agente');
        return;
      }
      toast.success('Agente actualizado');
      queryClient.invalidateQueries({ queryKey: ['ventas-agents', workspaceId] });
      queryClient.invalidateQueries({ queryKey: ['ventas-agents-canvas', workspaceId] });
      queryClient.invalidateQueries({ queryKey: ['ventas-kpis', workspaceId] });
    },
    onError: () => toast.error('Error al actualizar agente'),
  });

  return (
    <div className="space-y-4">
      {/* Agents */}
      <Card className="glass border-0">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold">Agentes</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {loadingAgents ? (
            Array.from({ length: 2 }).map((_, i) => (
              <Skeleton key={i} className="h-10 rounded-md" />
            ))
          ) : !agents?.length ? (
            <p className="text-xs text-muted-foreground">Sin agentes</p>
          ) : (
            agents.map((a) => (
              <div
                key={a.id}
                className="flex items-center justify-between gap-2 py-1"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium truncate">{a.name}</p>
                </div>
                <Badge
                  variant="outline"
                  className="text-xs shrink-0"
                  style={
                    a.status === 'active'
                      ? { borderColor: 'var(--gl-success)', color: 'var(--gl-success)' }
                      : { borderColor: 'rgba(255,100,100,0.5)', color: 'rgba(255,100,100,0.85)' }
                  }
                >
                  {a.status === 'active' ? 'activo' : 'pausado'}
                </Badge>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 shrink-0"
                  disabled={toggleMutation.isPending}
                  onClick={() =>
                    toggleMutation.mutate({ id: a.id, active: a.status !== 'active' })
                  }
                  title={a.status === 'active' ? 'Pausar' : 'Reanudar'}
                >
                  {a.status === 'active' ? (
                    <Pause className="h-3 w-3" />
                  ) : (
                    <Play className="h-3 w-3" />
                  )}
                </Button>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {/* Templates */}
      <Card className="glass border-0">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold">Templates activos</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {loadingTemplates ? (
            Array.from({ length: 2 }).map((_, i) => (
              <Skeleton key={i} className="h-8 rounded-md" />
            ))
          ) : !templates?.length ? (
            <p className="text-xs text-muted-foreground">Sin templates</p>
          ) : (
            templates.map((t) => (
              <div key={t.id} className="flex items-center justify-between gap-2">
                <p className="text-xs truncate flex-1">{t.name}</p>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 shrink-0"
                  onClick={() => onEditTemplate(t)}
                  title="Editar template"
                >
                  <Pencil className="h-3 w-3" />
                </Button>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
