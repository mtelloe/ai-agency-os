'use client';

import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import type { OutreachLogRow, OutreachContactRow } from '@/lib/types/database';

interface FeedItem {
  id: string;
  color: string;
  description: string;
  ts: string;
}

const STATUS_CONFIG: Record<string, { color: string; label: string }> = {
  sent: { color: '#7ab5c4', label: 'Email enviado a' },
  replied: { color: '#f4a7b9', label: 'Respuesta de' },
  failed: { color: '#c47a7a', label: 'Fallo enviando a' },
  bounced: { color: '#c4a77a', label: 'Rebote de' },
  pending: { color: '#d4cbbf', label: 'Pendiente para' },
};

function relativeTime(isoDate: string): string {
  const diff = Date.now() - new Date(isoDate).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return 'ahora';
  if (mins < 60) return `hace ${mins}m`;
  const h = Math.floor(mins / 60);
  if (h < 24) return `hace ${h}h`;
  return `hace ${Math.floor(h / 24)}d`;
}

export function VentasActivityFeed({ workspaceId }: { workspaceId: string }) {
  const supabase = createClient();

  const { data: items, isLoading } = useQuery<FeedItem[]>({
    queryKey: ['ventas-activity', workspaceId],
    refetchInterval: 30_000,
    queryFn: async () => {
      const { data: logs, error } = await supabase
        .from('outreach_log')
        .select('id, status, contact_id, sent_at, created_at')
        .eq('workspace_id', workspaceId)
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;
      if (!logs?.length) return [];

      const contactIds = [...new Set(logs.map((l) => l.contact_id))];
      const { data: contacts } = await supabase
        .from('outreach_contacts')
        .select('id, first_name, last_name, company_name')
        .in('id', contactIds);

      const contactMap = Object.fromEntries(
        (contacts ?? []).map(
          (c: { id: string; first_name: string; last_name: string; company_name: string | null }) => [
            c.id,
            `${c.first_name} ${c.last_name}${c.company_name ? ` (${c.company_name})` : ''}`,
          ],
        ),
      );

      return (logs as OutreachLogRow[]).map((l) => {
        const cfg = STATUS_CONFIG[l.status] ?? { color: '#d4cbbf', label: l.status };
        const contact = contactMap[l.contact_id] ?? 'contacto';
        return {
          id: l.id,
          color: cfg.color,
          description: `${cfg.label} ${contact}`,
          ts: l.sent_at ?? l.created_at,
        };
      });
    },
  });

  return (
    <Card className="border-0 shadow-sm flex flex-col" style={{ background: '#fff9f0' }}>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold">Actividad reciente</CardTitle>
      </CardHeader>
      <CardContent className="flex-1 overflow-y-auto max-h-80 space-y-2 pr-2">
        {isLoading ? (
          Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-8 rounded-md" />
          ))
        ) : !items?.length ? (
          <p className="text-xs text-muted-foreground py-4 text-center">
            Sin actividad aún
          </p>
        ) : (
          items.map((item) => (
            <div key={item.id} className="flex items-start gap-2 text-xs">
              <span
                className="mt-1.5 h-2 w-2 rounded-full shrink-0"
                style={{ background: item.color }}
              />
              <span className="flex-1 leading-snug">{item.description}</span>
              <span className="shrink-0 text-muted-foreground whitespace-nowrap">
                {relativeTime(item.ts)}
              </span>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}
