import { type LucideIcon } from 'lucide-react';

interface MetricCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  trend?: string;
  trendUp?: boolean;
}

export function MetricCard({ title, value, icon: Icon, trend, trendUp }: MetricCardProps) {
  return (
    <div
      className="rounded-xl p-5"
      style={{
        background: 'rgba(255,255,255,0.05)',
        border: '1px solid rgba(255,255,255,0.08)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
      }}
    >
      <div className="flex items-center justify-between">
        <div>
          <p style={{
            fontSize: '10px',
            fontWeight: 600,
            letterSpacing: '0.1em',
            textTransform: 'uppercase' as const,
            color: 'rgba(255,255,255,0.35)',
            marginBottom: '6px',
          }}>{title}</p>
          <p style={{
            fontFamily: 'var(--font-display)',
            fontSize: '28px',
            fontWeight: 700,
            letterSpacing: '-0.03em',
            color: '#fff',
            lineHeight: 1,
          }}>{value}</p>
          {trend && (
            <p style={{
              fontSize: '11px',
              marginTop: '4px',
              color: trendUp ? '#6EC5A8' : 'rgba(255,100,100,0.8)',
            }}>
              {trend}
            </p>
          )}
        </div>
        <div style={{
          height: '40px',
          width: '40px',
          borderRadius: '10px',
          background: 'rgba(199,125,255,0.12)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}>
          <Icon size={18} style={{ color: '#C77DFF' }} />
        </div>
      </div>
    </div>
  );
}
