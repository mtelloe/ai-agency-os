'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { Phone, Mail, MapPin, TrendingUp, ChevronDown, CalendarDays } from 'lucide-react';

const CAL_ALEXANDRA = process.env.NEXT_PUBLIC_CAL_URL_ALEXANDRA ?? '';
const CAL_MARIA = process.env.NEXT_PUBLIC_CAL_URL_MARIA ?? '';

// ── Tipos ────────────────────────────────────────────────────────────────────

type SqtLead = {
  id: string;
  created_at: string;
  nombre: string;
  email: string;
  telefono: string;
  nombre_centro: string | null;
  zona_centro: string | null;
  antiguedad_centro: string | null;
  clientas_mes: string | null;
  espiculas_previas: string | null;
  etapa: string;
  tags: string[];
  canal: string | null;
  angulo: string | null;
  gclid: string | null;
  ttclid: string | null;
  valor_estimado: number | null;
  valor_real: number | null;
  motivo_perdida: string | null;
  notas: string | null;
  desc_motivo: string | null;
};

// ── Configuración del pipeline ────────────────────────────────────────────────

const ETAPAS = [
  { key: 'Lead Nuevo',       label: 'Lead Nuevo',       color: 'bg-blue-500',    dot: 'bg-blue-500' },
  { key: 'Setter Asignada',  label: 'Setter Asignada',  color: 'bg-yellow-500',  dot: 'bg-yellow-500' },
  { key: 'Sin Respuesta',    label: 'Sin Respuesta',    color: 'bg-orange-400',  dot: 'bg-orange-400' },
  { key: 'Setter Realizada', label: 'Setter Realizada', color: 'bg-purple-500',  dot: 'bg-purple-500' },
  { key: 'Closer Agendada',  label: 'Closer Agendada',  color: 'bg-indigo-500',  dot: 'bg-indigo-500' },
  { key: 'No Show Closer',   label: 'No Show',          color: 'bg-orange-500',  dot: 'bg-orange-500' },
  { key: 'Closer Realizada', label: 'Closer Realizada', color: 'bg-cyan-500',    dot: 'bg-cyan-500' },
  { key: 'En Espera',        label: 'En Espera',        color: 'bg-amber-500',   dot: 'bg-amber-500' },
  { key: 'Ganado',           label: 'Ganado',           color: 'bg-green-500',   dot: 'bg-green-500' },
  { key: 'Perdido',          label: 'Perdido',          color: 'bg-red-500',     dot: 'bg-red-500' },
  { key: 'Descualificado',   label: 'Descualificado',   color: 'bg-gray-400',    dot: 'bg-gray-400' },
] as const;

const CANAL_BADGE: Record<string, string> = {
  'tiktok-ads':  'bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-300',
  'youtube-ads': 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
  'org-ytb':     'bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400',
  'referido':    'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
};

const ANGULO_LABEL: Record<string, string> = {
  n2: 'N2 — Pregunta',
  n3: 'N3 — Break-even',
  n4: 'N4 — Lo estoy mirando',
};

// ── Componentes ───────────────────────────────────────────────────────────────

function LeadCard({
  lead,
  onMove,
  moving,
}: {
  lead: SqtLead;
  onMove: (id: string, etapa: string) => void;
  moving: boolean;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className={cn('rounded-lg border bg-card shadow-sm hover:border-primary/30 transition-colors', moving && 'opacity-60 pointer-events-none')}>
      <div className="p-3 space-y-2">
        {/* Nombre + canal */}
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-sm font-semibold truncate">{lead.nombre}</p>
            {lead.nombre_centro && (
              <p className="text-xs text-muted-foreground truncate">{lead.nombre_centro}</p>
            )}
          </div>
          {lead.canal && (
            <span className={cn('text-[10px] px-1.5 py-0.5 rounded-full font-medium shrink-0', CANAL_BADGE[lead.canal] || 'bg-muted text-muted-foreground')}>
              {lead.canal}
            </span>
          )}
        </div>

        {/* Zona */}
        {lead.zona_centro && (
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <MapPin className="h-3 w-3 shrink-0" />
            <span className="truncate">{lead.zona_centro}</span>
          </div>
        )}

        {/* Ángulo VSL */}
        {lead.angulo && (
          <p className="text-[10px] text-muted-foreground">{ANGULO_LABEL[lead.angulo] || lead.angulo}</p>
        )}

        {/* Contacto */}
        <div className="flex items-center gap-3 text-xs text-muted-foreground pt-1">
          <a href={`tel:${lead.telefono}`} className="hover:text-foreground" title={lead.telefono}>
            <Phone className="h-3 w-3" />
          </a>
          <a href={`mailto:${lead.email}`} className="hover:text-foreground" title={lead.email}>
            <Mail className="h-3 w-3" />
          </a>
          {lead.valor_estimado && (
            <span className="ml-auto font-medium text-foreground">
              {Number(lead.valor_estimado).toLocaleString('es-ES')}€
            </span>
          )}
        </div>

        {/* Botón agendar */}
        {lead.etapa === 'Setter Asignada' && CAL_ALEXANDRA && (
          <a href={CAL_ALEXANDRA} target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-[11px] text-blue-600 hover:text-blue-700 font-medium w-full justify-center bg-blue-50 rounded py-1 mt-1">
            <CalendarDays className="h-3 w-3" /> Agendar con Alexandra
          </a>
        )}
        {lead.etapa === 'Closer Agendada' && CAL_MARIA && (
          <a href={CAL_MARIA} target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-[11px] text-purple-600 hover:text-purple-700 font-medium w-full justify-center bg-purple-50 rounded py-1 mt-1">
            <CalendarDays className="h-3 w-3" /> Agendar con María
          </a>
        )}

        {/* Mover etapa */}
        <button
          onClick={() => setOpen(!open)}
          className="w-full flex items-center justify-between text-[11px] text-muted-foreground hover:text-foreground mt-1 border-t pt-2"
        >
          <span>{moving ? 'Moviendo...' : 'Mover a...'}</span>
          <ChevronDown className={cn('h-3 w-3 transition-transform', open && 'rotate-180')} />
        </button>

        {open && (
          <div className="flex flex-wrap gap-1 pt-1">
            {ETAPAS.filter((e) => e.key !== lead.etapa).map((e) => (
              <button
                key={e.key}
                onClick={() => { onMove(lead.id, e.key); setOpen(false); }}
                className="text-[10px] px-2 py-1 rounded bg-muted hover:bg-muted/70 text-muted-foreground hover:text-foreground transition-colors"
              >
                {e.label}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function KanbanColumn({
  etapa,
  leads,
  onMove,
  movingId,
}: {
  etapa: typeof ETAPAS[number];
  leads: SqtLead[];
  onMove: (id: string, newEtapa: string) => void;
  movingId: string | null;
}) {
  const total = leads.reduce((s, l) => s + (Number(l.valor_estimado) || 0), 0);

  return (
    <div className="flex flex-col w-64 shrink-0">
      <div className="flex items-center gap-2 mb-2 px-1">
        <div className={cn('h-2.5 w-2.5 rounded-full', etapa.dot)} />
        <h3 className="text-sm font-medium truncate">{etapa.label}</h3>
        <Badge variant="secondary" className="text-xs ml-auto shrink-0">{leads.length}</Badge>
      </div>
      {total > 0 && (
        <p className="text-xs text-muted-foreground mb-2 px-1">
          {total.toLocaleString('es-ES')}€
        </p>
      )}
      <div className="flex-1 space-y-2 min-h-[120px] p-2 rounded-lg bg-muted/30">
        {leads.map((lead) => (
          <LeadCard key={lead.id} lead={lead} onMove={onMove} moving={movingId === lead.id} />
        ))}
      </div>
    </div>
  );
}

// ── Página principal ──────────────────────────────────────────────────────────

export default function SqtPipelinePage() {
  const supabase = createClient();
  const queryClient = useQueryClient();
  const [movingId, setMovingId] = useState<string | null>(null);

  const { data: leads = [], isLoading } = useQuery<SqtLead[]>({
    queryKey: ['sqt-leads'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sqt_leads')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as SqtLead[];
    },
  });

  const moveMutation = useMutation({
    mutationFn: async ({ id, etapa }: { id: string; etapa: string }) => {
      const res = await fetch(`/api/sqt/leads/${id}/stage`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ etapa }),
      });
      if (!res.ok) throw new Error('Error al mover lead');
      return res.json();
    },
    onMutate: ({ id }) => setMovingId(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sqt-leads'] });
      toast.success('Lead movido');
    },
    onError: () => toast.error('Error al mover lead'),
    onSettled: () => setMovingId(null),
  });

  const totalLeads = leads.length;
  const totalGanado = leads.filter((l) => l.etapa === 'Ganado').length;
  const valorTotal = leads
    .filter((l) => l.etapa === 'Ganado')
    .reduce((s, l) => s + (Number(l.valor_real || l.valor_estimado) || 0), 0);

  const leadsByEtapa = ETAPAS.reduce((acc, e) => {
    acc[e.key] = leads.filter((l) => l.etapa === e.key);
    return acc;
  }, {} as Record<string, SqtLead[]>);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 bg-muted animate-pulse rounded" />
        <div className="flex gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="w-64 h-48 bg-muted animate-pulse rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 h-full">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold">SQT Pack Pionera — Pipeline</h1>
          <p className="text-muted-foreground text-sm">
            {totalLeads} leads totales · {totalGanado} cerrados · {valorTotal.toLocaleString('es-ES')}€ facturado
          </p>
        </div>
        {/* Métricas rápidas */}
        <div className="flex gap-3 flex-wrap">
          {(['tiktok-ads', 'youtube-ads', 'org-ytb', 'referido'] as const).map((canal) => {
            const n = leads.filter((l) => l.canal === canal).length;
            if (!n) return null;
            return (
              <div key={canal} className="text-center">
                <p className="text-lg font-bold">{n}</p>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wide">{canal}</p>
              </div>
            );
          })}
          <div className="text-center flex items-center gap-1">
            <TrendingUp className="h-4 w-4 text-green-500" />
            <div>
              <p className="text-lg font-bold text-green-500">{totalGanado}</p>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Ganados</p>
            </div>
          </div>
        </div>
      </div>

      {/* Kanban */}
      <div className="flex gap-4 overflow-x-auto pb-6">
        {ETAPAS.map((etapa) => (
          <KanbanColumn
            key={etapa.key}
            etapa={etapa}
            leads={leadsByEtapa[etapa.key] || []}
            onMove={(id, newEtapa) => moveMutation.mutate({ id, etapa: newEtapa })}
            movingId={movingId}
          />
        ))}
      </div>
    </div>
  );
}
