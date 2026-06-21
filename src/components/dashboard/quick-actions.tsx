import Link from 'next/link';
import { Cpu, Sparkles, Radar, FileText } from 'lucide-react';

const ACTIONS = [
  { href: '/analizador', label: 'Analizar web', description: 'Audita un negocio en segundos', icon: Cpu },
  { href: '/agentes/nuevo', label: 'Crear agente', description: 'Despliega un chatbot IA', icon: Sparkles },
  { href: '/autopilot', label: 'Prospectar', description: 'Encuentra negocios por nicho', icon: Radar },
  { href: '/propuestas', label: 'Propuestas', description: 'Genera propuestas comerciales', icon: FileText },
];

export function QuickActions() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {ACTIONS.map((action) => (
        <Link key={action.href} href={action.href}>
          <div
            className="rounded-xl p-4 flex items-center gap-3 cursor-pointer transition-all"
            style={{
              background: 'rgba(199,125,255,0.08)',
              border: '1px solid rgba(199,125,255,0.15)',
              backdropFilter: 'blur(20px)',
              WebkitBackdropFilter: 'blur(20px)',
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLDivElement).style.background = 'rgba(199,125,255,0.14)';
              (e.currentTarget as HTMLDivElement).style.border = '1px solid rgba(199,125,255,0.28)';
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLDivElement).style.background = 'rgba(199,125,255,0.08)';
              (e.currentTarget as HTMLDivElement).style.border = '1px solid rgba(199,125,255,0.15)';
            }}
          >
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
              <action.icon size={18} style={{ color: '#C77DFF' }} />
            </div>
            <div>
              <p style={{ fontSize: '13px', fontWeight: 600, color: '#C77DFF' }}>{action.label}</p>
              <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', marginTop: '1px' }}>{action.description}</p>
            </div>
          </div>
        </Link>
      ))}
    </div>
  );
}
