'use client';

import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import type { Actividad } from '@/lib/types/database';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Activity } from 'lucide-react';
import { EmptyState } from '@/components/shared/empty-state';

export function ActivityFeed() {
  const supabase = createClient();

  const { data: activities } = useQuery<Actividad[]>({
    queryKey: ['actividad-reciente'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('actividad')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10);
      if (error) throw error;
      return data as Actividad[];
    },
  });

  function timeAgo(dateStr: string) {
    const diff = Date.now() - new Date(dateStr).getTime();
    const minutes = Math.floor(diff / 60000);
    if (minutes < 60) return `hace ${minutes}m`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `hace ${hours}h`;
    const days = Math.floor(hours / 24);
    return `hace ${days}d`;
  }

  return (
    <div
      className="rounded-xl"
      style={{
        background: 'rgba(255,255,255,0.05)',
        border: '1px solid rgba(255,255,255,0.08)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
      }}
    >
      <div className="p-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <div className="flex items-center gap-2">
          <Activity size={16} style={{ color: '#C77DFF' }} />
          <span style={{
            fontFamily: 'var(--font-display)',
            fontSize: '13px',
            fontWeight: 600,
            color: '#fff',
          }}>Actividad reciente</span>
        </div>
      </div>
      <div className="p-4">
        {!activities?.length ? (
          <EmptyState
            icon={Activity}
            title="Sin actividad"
            description="Tu actividad aparecerá aquí"
          />
        ) : (
          <ScrollArea className="h-[300px]">
            <div className="space-y-3">
              {activities.map((a) => (
                <div
                  key={a.id}
                  className="flex items-start gap-3"
                  style={{
                    fontSize: '13px',
                    paddingBottom: '12px',
                    borderBottom: '1px solid rgba(255,255,255,0.05)',
                  }}
                >
                  <div style={{
                    height: '8px',
                    width: '8px',
                    borderRadius: '50%',
                    background: '#C77DFF',
                    marginTop: '6px',
                    flexShrink: 0,
                  }} />
                  <div className="flex-1 min-w-0">
                    <p style={{ color: 'rgba(255,255,255,0.8)' }}>{a.descripcion}</p>
                    <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.35)', marginTop: '2px' }}>{timeAgo(a.created_at)}</p>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </div>
    </div>
  );
}
