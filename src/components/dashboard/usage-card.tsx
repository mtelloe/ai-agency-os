'use client';

import { useQuery } from '@tanstack/react-query';
import { useAuthFetch } from '@/hooks/use-auth-fetch';
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
            fontSize: '13px',
            fontWeight: 600,
            color: '#fff',
          }}>Consumo</span>
        </div>
      </div>
      <div className="p-4">
        <div className="flex gap-6">
          <div>
            <p style={{
              fontFamily: 'var(--font-display)',
              fontSize: '24px',
              fontWeight: 700,
              color: '#fff',
              letterSpacing: '-0.02em',
            }}>{data.totalCreditos}</p>
            <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.35)' }}>créditos usados</p>
          </div>
          <div>
            <p style={{
              fontFamily: 'var(--font-display)',
              fontSize: '24px',
              fontWeight: 700,
              letterSpacing: '-0.02em',
              background: 'linear-gradient(135deg, #C77DFF, #FF6FA3)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}>{data.totalEur}€</p>
            <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.35)' }}>coste real API</p>
          </div>
        </div>
        {data.entries?.length > 0 && (
          <div className="mt-3 space-y-1">
            <p style={{ fontSize: '10px', color: 'rgba(255,255,255,0.3)', letterSpacing: '0.05em' }}>Últimas operaciones:</p>
            {data.entries.slice(0, 5).map((e: { accion: string; coste_eur: number; created_at: string }, i: number) => (
              <div key={i} className="flex justify-between" style={{ fontSize: '11px' }}>
                <span style={{ color: 'rgba(255,255,255,0.45)' }}>{e.accion}</span>
                <span style={{ color: 'rgba(255,255,255,0.7)' }}>{Number(e.coste_eur || 0).toFixed(3)}€</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
