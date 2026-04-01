'use client';

import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { useWorkspace } from '@/hooks/use-workspace';
import type { Actividad } from '@/lib/types/database';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/shared/empty-state';
import {
  Radar,
  RotateCcw,
  Send,
  Zap,
  Clock,
  Calendar,
  Activity,
  CreditCard,
  type LucideIcon,
} from 'lucide-react';
import { toast } from 'sonner';

// ─── Types ───────────────────────────────────────────────────────────

type AutoKey = 'auto_prospecting' | 'auto_followup' | 'auto_outreach';

interface AutomationConfig {
  key: AutoKey;
  icon: LucideIcon;
  title: string;
  description: string;
  cost: string;
  schedule: string;
  nextRun: string;
}

const AUTOMATIONS: AutomationConfig[] = [
  {
    key: 'auto_prospecting',
    icon: Radar,
    title: 'Prospeccion automatica',
    description:
      'Cada lunes a las 8:00, la IA busca negocios de tu nicho y los anade al pipeline.',
    cost: '2 creditos por ejecucion',
    schedule: 'Lunes a las 8:00',
    nextRun: 'Proximo lunes a las 8:00',
  },
  {
    key: 'auto_followup',
    icon: RotateCcw,
    title: 'Seguimiento de leads',
    description:
      'Cada dia a las 9:00, revisa leads sin actividad en 3+ dias y los mueve a Follow-up.',
    cost: 'Gratis',
    schedule: 'Cada dia a las 9:00',
    nextRun: 'Manana a las 9:00',
  },
  {
    key: 'auto_outreach',
    icon: Send,
    title: 'Outreach automatico',
    description:
      'Envia cold emails automaticamente a los leads recien auditados.',
    cost: '1 credito por email',
    schedule: 'Cuando se genere un nuevo script',
    nextRun: 'Cuando se genere un nuevo script',
  },
];

const AUTOMATION_EVENTS = [
  'seguimiento_auto',
  'prospeccion_auto',
  'outreach_auto',
  'auditoria_completada',
];

const EVENT_LABELS: Record<string, string> = {
  seguimiento_auto: 'Seguimiento',
  prospeccion_auto: 'Prospeccion',
  outreach_auto: 'Outreach',
  auditoria_completada: 'Auditoria',
};

const EVENT_COLORS: Record<string, string> = {
  seguimiento_auto: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  prospeccion_auto: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  outreach_auto: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  auditoria_completada: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
};

// ─── Page ────────────────────────────────────────────────────────────

export default function AutomatizacionesPage() {
  const supabase = createClient();
  const queryClient = useQueryClient();
  const { data: workspace, isLoading: wsLoading } = useWorkspace();

  // Local autonomia state for optimistic UI
  const [autonomia, setAutonomia] = useState<Record<AutoKey, boolean> | null>(null);
  const [initDone, setInitDone] = useState(false);

  if (workspace && !initDone) {
    setAutonomia(
      workspace.config_autonomia ?? {
        auto_outreach: false,
        auto_followup: false,
        auto_prospecting: false,
      }
    );
    setInitDone(true);
  }

  // Activity history
  const { data: actividades, isLoading: actLoading } = useQuery<Actividad[]>({
    queryKey: ['automatizaciones-historial', workspace?.id],
    enabled: !!workspace?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('actividad')
        .select('*')
        .eq('workspace_id', workspace!.id)
        .in('tipo_evento', AUTOMATION_EVENTS)
        .order('created_at', { ascending: false })
        .limit(10);
      if (error) throw error;
      return data as Actividad[];
    },
  });

  // Toggle handler
  async function handleToggle(key: AutoKey, value: boolean) {
    if (!workspace || !autonomia) return;
    const prev = { ...autonomia };
    const updated = { ...autonomia, [key]: value };
    setAutonomia(updated);

    const { error } = await supabase
      .from('workspaces')
      .update({ config_autonomia: updated })
      .eq('id', workspace.id);

    if (error) {
      setAutonomia(prev);
      toast.error('Error al guardar la configuracion');
    } else {
      queryClient.invalidateQueries({ queryKey: ['workspace'] });
      toast.success(
        value ? 'Automatizacion activada' : 'Automatizacion desactivada'
      );
    }
  }

  // ─── Loading state ─────────────────────────────────────────────────

  if (wsLoading) {
    return (
      <div className="space-y-8 p-6">
        <div>
          <Skeleton className="h-8 w-64 mb-2" />
          <Skeleton className="h-5 w-96" />
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-56 w-full rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-64 w-full rounded-xl" />
      </div>
    );
  }

  if (!workspace || !autonomia) return null;

  return (
    <div className="space-y-8 p-6">
      {/* ── Header ──────────────────────────────────────────────────── */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Automatizaciones</h1>
        <p className="text-muted-foreground mt-1">
          Configura que procesos se ejecutan automaticamente
        </p>
      </div>

      {/* ── Section 1: Automation cards ─────────────────────────────── */}
      <section>
        <h2 className="text-lg font-semibold mb-4">Tus automatizaciones</h2>
        <div className="grid gap-4 md:grid-cols-3">
          {AUTOMATIONS.map((auto) => {
            const enabled = autonomia[auto.key];
            const Icon = auto.icon;
            return (
              <Card key={auto.key} className="relative">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div
                        className={
                          'flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ' +
                          (enabled
                            ? 'bg-primary/10 text-primary'
                            : 'bg-muted text-muted-foreground')
                        }
                      >
                        <Icon className="h-5 w-5" />
                      </div>
                      <div>
                        <CardTitle>{auto.title}</CardTitle>
                        <Badge
                          variant={enabled ? 'default' : 'secondary'}
                          className="mt-1"
                        >
                          {enabled ? 'Activa' : 'Inactiva'}
                        </Badge>
                      </div>
                    </div>
                    <Switch
                      checked={enabled}
                      onCheckedChange={(v) => handleToggle(auto.key, v)}
                    />
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {auto.description}
                  </p>
                </CardContent>
                <CardFooter>
                  <div className="flex items-center gap-4 text-xs text-muted-foreground w-full">
                    <span className="inline-flex items-center gap-1">
                      <CreditCard className="h-3.5 w-3.5" />
                      {auto.cost}
                    </span>
                    <span className="inline-flex items-center gap-1 ml-auto">
                      <Clock className="h-3.5 w-3.5" />
                      {auto.schedule}
                    </span>
                  </div>
                </CardFooter>
              </Card>
            );
          })}
        </div>
      </section>

      {/* ── Section 2: Execution history ────────────────────────────── */}
      <section>
        <h2 className="text-lg font-semibold mb-4">Historial de ejecuciones</h2>
        <Card>
          <CardContent className="pt-4">
            {actLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-10 w-full" />
                ))}
              </div>
            ) : !actividades || actividades.length === 0 ? (
              <EmptyState
                icon={Activity}
                title="Sin ejecuciones recientes"
                description="Aqui aparecera el historial cuando tus automatizaciones se ejecuten."
              />
            ) : (
              <ul className="divide-y">
                {actividades.map((act) => (
                  <li
                    key={act.id}
                    className="flex items-center justify-between py-3 first:pt-0 last:pb-0"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span
                        className={
                          'inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ' +
                          (EVENT_COLORS[act.tipo_evento] ??
                            'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300')
                        }
                      >
                        {EVENT_LABELS[act.tipo_evento] ?? act.tipo_evento}
                      </span>
                      <span className="text-sm truncate">
                        {act.descripcion}
                      </span>
                    </div>
                    <time className="text-xs text-muted-foreground whitespace-nowrap ml-4">
                      {new Date(act.created_at).toLocaleDateString('es-ES', {
                        day: '2-digit',
                        month: 'short',
                      })}{' '}
                      {new Date(act.created_at).toLocaleTimeString('es-ES', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </time>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </section>

      {/* ── Section 3: Next executions ──────────────────────────────── */}
      <section>
        <h2 className="text-lg font-semibold mb-4">Proximas ejecuciones</h2>
        <div className="grid gap-4 md:grid-cols-3">
          {AUTOMATIONS.map((auto) => {
            const enabled = autonomia[auto.key];
            const Icon = auto.icon;
            return (
              <Card key={auto.key} size="sm">
                <CardContent className="flex items-center gap-3">
                  <div
                    className={
                      'flex h-8 w-8 shrink-0 items-center justify-center rounded-md ' +
                      (enabled
                        ? 'bg-primary/10 text-primary'
                        : 'bg-muted text-muted-foreground')
                    }
                  >
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{auto.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {enabled ? (
                        <span className="inline-flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {auto.nextRun}
                        </span>
                      ) : (
                        'Desactivada'
                      )}
                    </p>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </section>
    </div>
  );
}
