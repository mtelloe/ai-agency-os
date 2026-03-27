'use client';

import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { useWorkspace } from '@/hooks/use-workspace';
import { MetricCard } from '@/components/dashboard/metric-card';
import { ActivityFeed } from '@/components/dashboard/activity-feed';
import { QuickActions } from '@/components/dashboard/quick-actions';
import { MetricCardSkeleton } from '@/components/shared/loading-skeleton';
import { ClipboardList, Users, Sparkles, FileText, TrendingUp, CreditCard } from 'lucide-react';

export default function DashboardPage() {
  const supabase = createClient();
  const { data: workspace } = useWorkspace();

  const { data: metrics, isLoading } = useQuery({
    queryKey: ['dashboard-metrics'],
    queryFn: async () => {
      const [auditorias, leads, agentes, propuestas] = await Promise.all([
        supabase.from('auditorias').select('id', { count: 'exact', head: true }),
        supabase.from('leads').select('id, estado_pipeline, valor_estimado'),
        supabase.from('agentes').select('id', { count: 'exact', head: true }).eq('estado', 'activo'),
        supabase.from('propuestas').select('id, estado'),
      ]);

      const leadsData = leads.data || [];
      const propuestasData = propuestas.data || [];
      const leadsActivos = leadsData.filter((l) => !['Ganado', 'Perdido'].includes(l.estado_pipeline));
      const valorPipeline = leadsActivos.reduce((sum, l) => sum + (Number(l.valor_estimado) || 0), 0);
      const propuestasEnviadas = propuestasData.filter((p) => p.estado === 'enviada').length;
      const propuestasAceptadas = propuestasData.filter((p) => p.estado === 'aceptada').length;
      const conversion = propuestasEnviadas > 0 ? Math.round((propuestasAceptadas / propuestasEnviadas) * 100) : 0;

      return {
        totalAuditorias: auditorias.count || 0,
        leadsActivos: leadsActivos.length,
        agentesActivos: agentes.count || 0,
        propuestasEnviadas,
        conversion,
        valorPipeline,
      };
    },
  });

  const creditosDisponibles = workspace ? workspace.creditos_total - workspace.creditos_usados : 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground">Vista general de tu agencia</p>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => <MetricCardSkeleton key={i} />)}
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-4">
          <MetricCard title="Auditorías realizadas" value={metrics?.totalAuditorias ?? 0} icon={ClipboardList} />
          <MetricCard title="Leads activos" value={metrics?.leadsActivos ?? 0} icon={Users} />
          <MetricCard title="Agentes activos" value={metrics?.agentesActivos ?? 0} icon={Sparkles} />
          <MetricCard title="Propuestas enviadas" value={metrics?.propuestasEnviadas ?? 0} icon={FileText} />
          <MetricCard title="Conversión" value={`${metrics?.conversion ?? 0}%`} icon={TrendingUp} />
          <MetricCard title="Créditos disponibles" value={creditosDisponibles} icon={CreditCard} />
        </div>
      )}

      <div className="grid grid-cols-2 gap-6">
        <div className="space-y-6">
          <h2 className="text-lg font-semibold">Acciones rápidas</h2>
          <QuickActions />
        </div>
        <ActivityFeed />
      </div>
    </div>
  );
}
