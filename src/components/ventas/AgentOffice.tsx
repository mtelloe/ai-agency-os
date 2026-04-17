'use client';

import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import type { SalesAgentRow, AgentExecutionRow } from '@/lib/types/database';

// ─── Helpers ─────────────────────────────────────────────────────────────────

const AGENT_CLASSES = [
  { label: 'Cazador de Leads', emoji: '🗡️', hue: '270' },
  { label: 'Maestro de Emails', emoji: '📜', hue: '210' },
  { label: 'Oráculo de Datos', emoji: '🔮', hue: '310' },
  { label: 'Guardián del CRM', emoji: '🛡️', hue: '160' },
];

/** Derivar nivel a partir del número de ejecuciones (máx 99) */
function deriveLevel(execCount: number): number {
  return Math.min(99, Math.max(1, Math.floor(Math.log2(execCount + 2) * 8)));
}

/** HP basado en si hubo errores recientes */
function deriveHp(executions: AgentExecutionRow[], agentId: string): number {
  const recent = executions.filter((e) => e.agent_id === agentId).slice(0, 5);
  if (recent.length === 0) return 100;
  const errors = recent.filter((e) => e.status === 'failed').length;
  return Math.max(10, 100 - errors * 20);
}

/** XP pseudo-aleatorio estable por agente (seed basado en id) */
function deriveXp(agentId: string): number {
  let hash = 0;
  for (let i = 0; i < agentId.length; i++) {
    hash = (hash * 31 + agentId.charCodeAt(i)) >>> 0;
  }
  return (hash % 85) + 10; // 10–94 %
}

/** Extraer stats de los outputs de las ejecuciones */
function deriveStats(executions: AgentExecutionRow[], agentId: string) {
  const mine = executions.filter((e) => e.agent_id === agentId);
  let leads = 0;
  let emails = 0;
  let replies = 0;

  for (const ex of mine) {
    const out = ex.output as Record<string, unknown> | null;
    if (!out) continue;
    if (typeof out.leads_found === 'number') leads += out.leads_found;
    if (typeof out.emails_sent === 'number') emails += out.emails_sent;
    if (typeof out.replies === 'number') replies += out.replies;
  }

  const replyRate =
    emails > 0 ? `${Math.round((replies / emails) * 100)}%` : '—';

  return {
    leads: leads > 0 ? String(leads) : '—',
    emails: emails > 0 ? String(emails) : '—',
    replyRate,
  };
}

/** Obtener el mensaje de misión activa del último output */
function getMission(executions: AgentExecutionRow[], agentId: string): string {
  const latest = executions.find((e) => e.agent_id === agentId);
  if (!latest) return 'Sin misión activa';
  const out = latest.output as { summary?: string; step?: string; campaign?: string } | null;
  return out?.campaign ?? out?.summary ?? out?.step ?? 'Campaña activa';
}

// ─── Sub-componente: barra de progreso ───────────────────────────────────────

function ProgressBar({
  value,
  color,
  label,
}: {
  value: number;
  color: string;
  label: string;
}) {
  return (
    <div className="flex flex-col gap-0.5">
      <div className="flex justify-between items-center">
        <span style={{ fontSize: '10px', color: 'rgba(200,180,255,0.7)', fontFamily: 'monospace' }}>
          {label}
        </span>
        <span style={{ fontSize: '10px', color: 'rgba(200,180,255,0.9)', fontFamily: 'monospace' }}>
          {value}%
        </span>
      </div>
      <div
        style={{
          height: '6px',
          background: 'rgba(255,255,255,0.08)',
          borderRadius: '3px',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            width: `${value}%`,
            height: '100%',
            background: color,
            borderRadius: '3px',
            transition: 'width 0.6s ease',
            boxShadow: `0 0 6px ${color}`,
          }}
        />
      </div>
    </div>
  );
}

// ─── Sub-componente: tarjeta de agente ───────────────────────────────────────

function AgentCard({
  agent,
  executions,
  cardIndex,
}: {
  agent: SalesAgentRow;
  executions: AgentExecutionRow[];
  cardIndex: number;
}) {
  const cls = AGENT_CLASSES[cardIndex % AGENT_CLASSES.length];
  const agentExecs = executions.filter((e) => e.agent_id === agent.id);
  const level = deriveLevel(agentExecs.length);
  const hp = deriveHp(executions, agent.id);
  const xp = deriveXp(agent.id);
  const stats = deriveStats(executions, agent.id);
  const mission = getMission(executions, agent.id);
  const isActive = agent.status === 'active';

  return (
    <div
      style={{
        background: 'linear-gradient(160deg, #1a0533, #2d1b69, #1a0533)',
        border: '1px solid rgba(168,85,247,0.4)',
        boxShadow: '0 0 20px rgba(168,85,247,0.15), inset 0 1px 0 rgba(255,255,255,0.05)',
        borderRadius: '12px',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        minHeight: '300px',
      }}
    >
      {/* Header banner */}
      <div
        style={{
          background: 'linear-gradient(90deg, #7c3aed, #a855f7)',
          padding: '8px 12px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <span style={{ fontSize: '11px', fontWeight: 700, color: '#fff', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
          {cls.label}
        </span>
        <span
          style={{
            fontSize: '11px',
            fontWeight: 700,
            color: '#fde68a',
            background: 'rgba(0,0,0,0.25)',
            padding: '2px 7px',
            borderRadius: '4px',
            letterSpacing: '0.05em',
          }}
        >
          Nv. {level}
        </span>
      </div>

      {/* Body */}
      <div style={{ padding: '14px 14px 12px', display: 'flex', flexDirection: 'column', gap: '10px', flex: 1 }}>
        {/* Avatar + nombre */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div
            style={{
              width: '56px',
              height: '56px',
              borderRadius: '50%',
              background: `radial-gradient(circle at 40% 40%, hsl(${cls.hue}, 80%, 35%), hsl(${cls.hue}, 60%, 15%))`,
              border: '2px solid rgba(168,85,247,0.6)',
              boxShadow: `0 0 12px rgba(168,85,247,0.4)`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '28px',
              flexShrink: 0,
            }}
          >
            {cls.emoji}
          </div>
          <div>
            <div style={{ fontWeight: 700, color: '#f0e6ff', fontSize: '14px', lineHeight: 1.2 }}>
              {agent.name}
            </div>
            <div style={{ fontSize: '11px', color: 'rgba(196,181,253,0.7)', marginTop: '2px' }}>
              {cls.label} · Élite
            </div>
          </div>
        </div>

        {/* Barras HP / XP */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <ProgressBar value={hp} color="#4ade80" label="HP" />
          <ProgressBar value={xp} color="#fbbf24" label="XP" />
        </div>

        {/* Stats grid */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr 1fr',
            gap: '6px',
          }}
        >
          {[
            { label: 'Leads', value: stats.leads },
            { label: 'Emails', value: stats.emails },
            { label: 'Reply', value: stats.replyRate },
          ].map(({ label, value }) => (
            <div
              key={label}
              style={{
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(168,85,247,0.2)',
                borderRadius: '6px',
                padding: '6px 4px',
                textAlign: 'center',
              }}
            >
              <div style={{ fontSize: '15px', fontWeight: 700, color: '#e9d5ff', fontFamily: 'monospace' }}>
                {value}
              </div>
              <div style={{ fontSize: '9px', color: 'rgba(196,181,253,0.6)', marginTop: '1px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                {label}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Footer misión */}
      <div
        style={{
          borderTop: '1px solid rgba(168,85,247,0.2)',
          padding: '8px 14px',
          display: 'flex',
          alignItems: 'center',
          gap: '7px',
          background: 'rgba(0,0,0,0.2)',
        }}
      >
        {isActive ? (
          <>
            <span
              style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                background: '#4ade80',
                boxShadow: '0 0 6px #4ade80',
                flexShrink: 0,
                animation: 'pulse 2s infinite',
              }}
            />
            <span style={{ fontSize: '11px', color: 'rgba(196,181,253,0.8)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              En misión: {mission}
            </span>
          </>
        ) : (
          <>
            <span
              style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                background: 'rgba(156,163,175,0.5)',
                flexShrink: 0,
              }}
            />
            <span style={{ fontSize: '11px', color: 'rgba(156,163,175,0.6)' }}>
              Pausado
            </span>
          </>
        )}
      </div>
    </div>
  );
}

// ─── Estado vacío ─────────────────────────────────────────────────────────────

function EmptyState() {
  return (
    <div
      style={{
        background: 'linear-gradient(160deg, #1a0533, #2d1b69, #1a0533)',
        border: '1px solid rgba(168,85,247,0.3)',
        borderRadius: '12px',
        padding: '48px 24px',
        textAlign: 'center',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '12px',
      }}
    >
      <div style={{ fontSize: '48px' }}>⚔️</div>
      <div style={{ fontSize: '16px', fontWeight: 700, color: '#e9d5ff' }}>
        Sin agentes activos
      </div>
      <div style={{ fontSize: '13px', color: 'rgba(196,181,253,0.6)', maxWidth: '260px' }}>
        Crea tu primer agente de ventas para comenzar la campaña
      </div>
    </div>
  );
}

// ─── Componente principal ─────────────────────────────────────────────────────

export function AgentOffice({ workspaceId }: { workspaceId: string }) {
  const supabase = createClient();

  const { data: agents } = useQuery<SalesAgentRow[]>({
    queryKey: ['ventas-agents-canvas', workspaceId],
    refetchInterval: 30_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('agents')
        .select('*')
        .eq('workspace_id', workspaceId)
        .neq('status', 'archived');
      if (error) throw error;
      return (data ?? []) as SalesAgentRow[];
    },
  });

  const { data: executions } = useQuery<AgentExecutionRow[]>({
    queryKey: ['ventas-executions-canvas', workspaceId],
    refetchInterval: 30_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('agent_executions')
        .select('id, agent_id, workspace_id, trigger, status, input, output, error, started_at, completed_at, created_at')
        .eq('workspace_id', workspaceId)
        .order('created_at', { ascending: false })
        .limit(20);
      if (error) throw error;
      return (data ?? []) as AgentExecutionRow[];
    },
  });

  const visibleAgents = (agents ?? []).slice(0, 4);

  return (
    <>
      {/* Keyframe pulse para el punto verde */}
      <style>{`@keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }`}</style>

      {visibleAgents.length === 0 ? (
        <EmptyState />
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
            gap: '16px',
          }}
        >
          {visibleAgents.map((agent, i) => (
            <AgentCard
              key={agent.id}
              agent={agent}
              executions={executions ?? []}
              cardIndex={i}
            />
          ))}
        </div>
      )}
    </>
  );
}
