'use client';

import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { useWorkspace } from '@/hooks/use-workspace';
import { MetricCard } from '@/components/dashboard/metric-card';
import { ActivityFeed } from '@/components/dashboard/activity-feed';
import { QuickActions } from '@/components/dashboard/quick-actions';
import { MetricCardSkeleton } from '@/components/shared/loading-skeleton';
import { UsageCard } from '@/components/dashboard/usage-card';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PIPELINE_STAGES } from '@/lib/constants';
import { ClipboardList, Users, Sparkles, FileText, TrendingUp, CreditCard } from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';

// Colores hex para las etapas del pipeline
const STAGE_COLORS: Record<string, string> = {
  Nuevo: '#6b7280',
  Auditado: '#3b82f6',
  Contactado: '#eab308',
  'Demo creada': '#a855f7',
  'Propuesta enviada': '#6366f1',
  'Follow-up': '#f97316',
  Ganado: '#22c55e',
  Perdido: '#ef4444',
};

function getWeekLabel(date: Date): string {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - d.getDay() + 1); // lunes
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  return `${day}/${month}`;
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="rounded-lg border border-white/10 bg-zinc-900 px-3 py-2 text-xs text-white shadow-lg">
        <p className="font-medium">{label}</p>
        <p className="text-muted-foreground">{payload[0].value} {payload[0].name || ''}</p>
      </div>
    );
  }
  return null;
};

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

  // Datos para el grafico de auditorias por semana (ultimas 8 semanas)
  const { data: auditoriasChartData } = useQuery({
    queryKey: ['dashboard-auditorias-chart'],
    queryFn: async () => {
      const eightWeeksAgo = new Date();
      eightWeeksAgo.setDate(eightWeeksAgo.getDate() - 56);

      const { data } = await supabase
        .from('auditorias')
        .select('created_at')
        .gte('created_at', eightWeeksAgo.toISOString());

      const weeks: Record<string, number> = {};

      // Inicializar las 8 semanas
      for (let i = 7; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i * 7);
        weeks[getWeekLabel(d)] = 0;
      }

      (data || []).forEach((a: { created_at: string }) => {
        const label = getWeekLabel(new Date(a.created_at));
        if (label in weeks) {
          weeks[label]++;
        }
      });

      return Object.entries(weeks).map(([semana, cantidad]) => ({
        semana,
        cantidad,
      }));
    },
  });

  // Datos para el grafico de pipeline (leads por etapa)
  const { data: pipelineChartData } = useQuery({
    queryKey: ['dashboard-pipeline-chart'],
    queryFn: async () => {
      const { data } = await supabase
        .from('leads')
        .select('estado_pipeline');

      const counts: Record<string, number> = {};
      PIPELINE_STAGES.forEach((s) => {
        counts[s.key] = 0;
      });

      (data || []).forEach((l: { estado_pipeline: string }) => {
        if (l.estado_pipeline in counts) {
          counts[l.estado_pipeline]++;
        }
      });

      return PIPELINE_STAGES.map((s) => ({
        etapa: s.label,
        cantidad: counts[s.key],
        color: STAGE_COLORS[s.key] || '#6366f1',
      }));
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
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => <MetricCardSkeleton key={i} />)}
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <MetricCard title="Auditorias realizadas" value={metrics?.totalAuditorias ?? 0} icon={ClipboardList} />
          <MetricCard title="Leads activos" value={metrics?.leadsActivos ?? 0} icon={Users} />
          <MetricCard title="Agentes activos" value={metrics?.agentesActivos ?? 0} icon={Sparkles} />
          <MetricCard title="Propuestas enviadas" value={metrics?.propuestasEnviadas ?? 0} icon={FileText} />
          <MetricCard title="Conversion" value={`${metrics?.conversion ?? 0}%`} icon={TrendingUp} />
          <MetricCard title="Creditos disponibles" value={creditosDisponibles} icon={CreditCard} />
        </div>
      )}

      {/* Seccion de graficos */}
      <div>
        <h2 className="text-lg font-semibold mb-4">Evolucion</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Grafico 1: Auditorias por semana */}
          <Card>
            <CardHeader>
              <CardTitle>Auditorias por semana</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={auditoriasChartData || []}>
                    <XAxis
                      dataKey="semana"
                      tick={{ fill: '#888', fontSize: 12 }}
                      axisLine={{ stroke: '#333' }}
                      tickLine={{ stroke: '#333' }}
                    />
                    <YAxis
                      tick={{ fill: '#888', fontSize: 12 }}
                      axisLine={{ stroke: '#333' }}
                      tickLine={{ stroke: '#333' }}
                      allowDecimals={false}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="cantidad" name="auditorias" radius={[4, 4, 0, 0]} fill="#6366f1" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Grafico 2: Pipeline (leads por etapa) */}
          <Card>
            <CardHeader>
              <CardTitle>Pipeline</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={pipelineChartData || []}
                    layout="vertical"
                    margin={{ left: 20 }}
                  >
                    <XAxis
                      type="number"
                      tick={{ fill: '#888', fontSize: 12 }}
                      axisLine={{ stroke: '#333' }}
                      tickLine={{ stroke: '#333' }}
                      allowDecimals={false}
                    />
                    <YAxis
                      type="category"
                      dataKey="etapa"
                      tick={{ fill: '#888', fontSize: 12 }}
                      axisLine={{ stroke: '#333' }}
                      tickLine={{ stroke: '#333' }}
                      width={120}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="cantidad" name="leads" radius={[0, 4, 4, 0]}>
                      {(pipelineChartData || []).map((entry, index) => (
                        <Cell key={index} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="space-y-6">
          <h2 className="text-lg font-semibold">Acciones rapidas</h2>
          <QuickActions />
        </div>
        <ActivityFeed />
        <UsageCard />
      </div>
    </div>
  );
}
