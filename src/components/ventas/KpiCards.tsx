'use client';

import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Send, MessageSquare, Bot, Users } from 'lucide-react';

interface KpiData {
  emailsSent: number;
  emailsHoy: number;
  respuestas: number;
  tasaRespuesta: number;
  agentesActivos: number;
  agentesPausados: number;
  leadsEstaSemana: number;
}

function KpiCard({
  icon: Icon,
  title,
  main,
  sub,
  color,
}: {
  icon: React.ElementType;
  title: string;
  main: string | number;
  sub: string;
  color: string;
}) {
  return (
    <Card className="border-0 shadow-sm" style={{ background: '#fff9f0' }}>
      <CardContent className="p-4 flex items-start gap-3">
        <div
          className="rounded-lg p-2 shrink-0"
          style={{ background: color + '33' }}
        >
          <Icon className="h-5 w-5" style={{ color }} />
        </div>
        <div className="min-w-0">
          <p className="text-xs text-muted-foreground truncate">{title}</p>
          <p className="text-2xl font-bold leading-tight">{main}</p>
          <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>
        </div>
      </CardContent>
    </Card>
  );
}

export function KpiCards({ workspaceId }: { workspaceId: string }) {
  const supabase = createClient();

  const { data, isLoading } = useQuery<KpiData>({
    queryKey: ['ventas-kpis', workspaceId],
    refetchInterval: 30_000,
    queryFn: async () => {
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);

      const [logAll, agents, contacts] = await Promise.all([
        supabase
          .from('outreach_log')
          .select('status, sent_at')
          .eq('workspace_id', workspaceId),
        supabase
          .from('agents')
          .select('status')
          .eq('workspace_id', workspaceId),
        supabase
          .from('outreach_contacts')
          .select('id')
          .eq('workspace_id', workspaceId)
          .gte('created_at', weekAgo.toISOString()),
      ]);

      const logs = logAll.data ?? [];
      const agentRows = agents.data ?? [];

      const emailsSent = logs.filter((l) => l.status === 'sent').length;
      const emailsHoy = logs.filter(
        (l) =>
          l.status === 'sent' &&
          l.sent_at !== null &&
          new Date(l.sent_at) >= todayStart,
      ).length;
      const respuestas = logs.filter((l) => l.status === 'replied').length;
      const tasaRespuesta =
        emailsSent > 0 ? Math.round((respuestas / emailsSent) * 100) : 0;
      const agentesActivos = agentRows.filter((a) => a.status === 'active').length;
      const agentesPausados = agentRows.filter((a) => a.status === 'paused').length;

      return {
        emailsSent,
        emailsHoy,
        respuestas,
        tasaRespuesta,
        agentesActivos,
        agentesPausados,
        leadsEstaSemana: contacts.data?.length ?? 0,
      };
    },
  });

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-24 rounded-xl" />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <KpiCard
        icon={Send}
        title="Emails enviados"
        main={data?.emailsSent ?? 0}
        sub={`${data?.emailsHoy ?? 0} hoy`}
        color="#8ac47a"
      />
      <KpiCard
        icon={MessageSquare}
        title="Respuestas"
        main={data?.respuestas ?? 0}
        sub={`${data?.tasaRespuesta ?? 0}% tasa`}
        color="#f4a7b9"
      />
      <KpiCard
        icon={Bot}
        title="Agentes activos"
        main={data?.agentesActivos ?? 0}
        sub={`${data?.agentesPausados ?? 0} pausados`}
        color="#d4e8c2"
      />
      <KpiCard
        icon={Users}
        title="Leads esta semana"
        main={data?.leadsEstaSemana ?? 0}
        sub="nuevos contactos"
        color="#f5f0e8"
      />
    </div>
  );
}
