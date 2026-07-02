'use client';

import { useEffect, useState, useCallback } from 'react';
import { createClient } from '@supabase/supabase-js';
import { cn } from '@/lib/utils';
import { RefreshCw, TrendingUp, MessageSquare, Users, Star, AlertCircle, Lightbulb, HelpCircle, ThumbsUp } from 'lucide-react';

function getSqtClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SQT_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SQT_SUPABASE_ANON_KEY!
  );
}

type DailyKpi = {
  kpi_date: string;
  total_messages: number;
  audio_count: number;
  image_count: number;
  link_count: number;
  text_count: number;
  unique_senders: number;
  tips_count: number;
  experiencias_count: number;
  ideas_count: number;
  quejas_count: number;
  preguntas_count: number;
  positive_sentiment: number;
  neutral_sentiment: number;
  negative_sentiment: number;
};

type Insight = {
  id: string;
  period_date: string;
  summary_text: string;
  top_topics: string[];
  highlights: {
    tips?: string[];
    experiencias?: string[];
    ideas?: string[];
    quejas?: string[];
  };
};

function BarChart({ kpis }: { kpis: DailyKpi[] }) {
  const max = Math.max(...kpis.map(k => k.total_messages), 1);
  const recent = [...kpis].sort((a, b) => a.kpi_date.localeCompare(b.kpi_date)).slice(-14);

  return (
    <div className="flex items-end gap-1 h-24 w-full">
      {recent.map(k => {
        const pct = (k.total_messages / max) * 100;
        const label = k.kpi_date.slice(5); // MM-DD
        return (
          <div key={k.kpi_date} className="flex flex-col items-center gap-1 flex-1 min-w-0 group relative">
            <div className="absolute -top-7 left-1/2 -translate-x-1/2 hidden group-hover:flex bg-popover border text-[10px] px-1.5 py-0.5 rounded shadow z-10 whitespace-nowrap">
              {k.kpi_date}: {k.total_messages} msgs
            </div>
            <div
              className="w-full bg-violet-500 hover:bg-violet-400 rounded-sm transition-all"
              style={{ height: `${Math.max(pct, 4)}%` }}
            />
            <span className="text-[9px] text-muted-foreground truncate w-full text-center">{label}</span>
          </div>
        );
      })}
    </div>
  );
}

function SentimentBar({ positive, neutral, negative }: { positive: number; neutral: number; negative: number }) {
  const total = positive + neutral + negative || 1;
  return (
    <div className="flex h-3 rounded-full overflow-hidden w-full gap-0.5">
      <div className="bg-green-500 transition-all" style={{ width: `${(positive / total) * 100}%` }} title={`Positivo: ${positive}`} />
      <div className="bg-gray-300 dark:bg-gray-600 transition-all" style={{ width: `${(neutral / total) * 100}%` }} title={`Neutral: ${neutral}`} />
      <div className="bg-red-400 transition-all" style={{ width: `${(negative / total) * 100}%` }} title={`Negativo: ${negative}`} />
    </div>
  );
}

function InsightCard({ insight }: { insight: Insight }) {
  const fecha = new Date(insight.period_date + 'T12:00:00').toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' });
  const hasHighlights = insight.highlights && (
    (insight.highlights.tips?.length ?? 0) > 0 ||
    (insight.highlights.experiencias?.length ?? 0) > 0 ||
    (insight.highlights.ideas?.length ?? 0) > 0 ||
    (insight.highlights.quejas?.length ?? 0) > 0
  );

  return (
    <div className="rounded-lg border bg-card p-4 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-semibold capitalize">{fecha}</p>
        {insight.top_topics.length > 0 && (
          <div className="flex flex-wrap gap-1 justify-end">
            {insight.top_topics.slice(0, 3).map((t, i) => (
              <span key={i} className="text-[10px] bg-muted px-2 py-0.5 rounded-full text-muted-foreground">{t}</span>
            ))}
          </div>
        )}
      </div>

      {insight.summary_text && insight.summary_text.length > 30 && (
        <p className="text-sm text-foreground/80 leading-relaxed">{insight.summary_text}</p>
      )}

      {hasHighlights && (
        <div className="space-y-2 pt-1 border-t">
          {(insight.highlights.tips?.length ?? 0) > 0 && (
            <div>
              <p className="text-[11px] font-medium text-yellow-600 dark:text-yellow-400 flex items-center gap-1 mb-1">
                <Star className="h-3 w-3" /> Tips del día
              </p>
              <ul className="space-y-0.5">
                {insight.highlights.tips!.slice(0, 2).map((t, i) => (
                  <li key={i} className="text-xs text-muted-foreground">• {t}</li>
                ))}
              </ul>
            </div>
          )}
          {(insight.highlights.experiencias?.length ?? 0) > 0 && (
            <div>
              <p className="text-[11px] font-medium text-blue-600 dark:text-blue-400 flex items-center gap-1 mb-1">
                <ThumbsUp className="h-3 w-3" /> Experiencias
              </p>
              <ul className="space-y-0.5">
                {insight.highlights.experiencias!.slice(0, 2).map((t, i) => (
                  <li key={i} className="text-xs text-muted-foreground">• {t}</li>
                ))}
              </ul>
            </div>
          )}
          {(insight.highlights.ideas?.length ?? 0) > 0 && (
            <div>
              <p className="text-[11px] font-medium text-purple-600 dark:text-purple-400 flex items-center gap-1 mb-1">
                <Lightbulb className="h-3 w-3" /> Ideas
              </p>
              <ul className="space-y-0.5">
                {insight.highlights.ideas!.slice(0, 2).map((t, i) => (
                  <li key={i} className="text-xs text-muted-foreground">• {t}</li>
                ))}
              </ul>
            </div>
          )}
          {(insight.highlights.quejas?.length ?? 0) > 0 && (
            <div>
              <p className="text-[11px] font-medium text-red-600 dark:text-red-400 flex items-center gap-1 mb-1">
                <AlertCircle className="h-3 w-3" /> Quejas / Alertas
              </p>
              <ul className="space-y-0.5">
                {insight.highlights.quejas!.slice(0, 2).map((t, i) => (
                  <li key={i} className="text-xs text-muted-foreground">• {t}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function SqtInteligenciaPage() {
  const [kpis, setKpis] = useState<DailyKpi[]>([]);
  const [insights, setInsights] = useState<Insight[]>([]);
  const [loading, setLoading] = useState(true);

  const cargar = useCallback(async () => {
    setLoading(true);
    const sb = getSqtClient();
    const [kpisRes, insightsRes] = await Promise.all([
      sb.from('sqt_daily_kpis').select('*').order('kpi_date', { ascending: false }).limit(30),
      sb.from('sqt_insights').select('*').order('period_date', { ascending: false }).limit(10),
    ]);
    if (kpisRes.data) setKpis(kpisRes.data as DailyKpi[]);
    if (insightsRes.data) setInsights(insightsRes.data as Insight[]);
    setLoading(false);
  }, []);

  useEffect(() => { cargar(); }, [cargar]);

  const totales = kpis.reduce((acc, k) => ({
    mensajes: acc.mensajes + k.total_messages,
    tips: acc.tips + k.tips_count,
    experiencias: acc.experiencias + k.experiencias_count,
    quejas: acc.quejas + k.quejas_count,
    preguntas: acc.preguntas + k.preguntas_count,
    positivo: acc.positivo + k.positive_sentiment,
    neutral: acc.neutral + k.neutral_sentiment,
    negativo: acc.negativo + k.negative_sentiment,
  }), { mensajes: 0, tips: 0, experiencias: 0, quejas: 0, preguntas: 0, positivo: 0, neutral: 0, negativo: 0 });

  const diasActivos = kpis.filter(k => k.total_messages > 0).length;
  const mediadiaria = diasActivos ? Math.round(totales.mensajes / diasActivos) : 0;
  const insightsConResumen = insights.filter(i => i.summary_text && i.summary_text.length > 30);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold">Inteligencia de Comunidad</h1>
          <p className="text-muted-foreground text-sm">Análisis automático del grupo WhatsApp SQT Spain — últimos 30 días</p>
        </div>
        <button
          onClick={cargar}
          className="flex items-center gap-2 text-sm px-3 py-2 rounded-md bg-muted hover:bg-muted/70 transition-colors"
        >
          <RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} />
          Actualizar
        </button>
      </div>

      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[1,2,3,4].map(i => <div key={i} className="h-20 bg-muted animate-pulse rounded-lg" />)}
        </div>
      ) : (
        <>
          {/* KPIs */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: 'Mensajes (30d)', value: totales.mensajes, icon: MessageSquare, color: 'text-foreground' },
              { label: 'Media diaria', value: mediadiaria, icon: TrendingUp, color: 'text-blue-500', suffix: '/día' },
              { label: 'Tips compartidos', value: totales.tips, icon: Star, color: 'text-yellow-500' },
              { label: 'Quejas detectadas', value: totales.quejas, icon: AlertCircle, color: totales.quejas > 0 ? 'text-red-500' : 'text-muted-foreground' },
            ].map(s => (
              <div key={s.label} className="rounded-lg border bg-card p-4 flex items-center gap-3">
                <s.icon className={cn('h-5 w-5 shrink-0', s.color)} />
                <div>
                  <p className="text-2xl font-bold leading-none">{s.value}{s.suffix ?? ''}</p>
                  <p className="text-[11px] text-muted-foreground mt-1">{s.label}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Segunda fila KPIs */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: 'Experiencias', value: totales.experiencias, icon: ThumbsUp, color: 'text-blue-500' },
              { label: 'Ideas', value: totales.ideas, icon: Lightbulb, color: 'text-purple-500' },
              { label: 'Preguntas', value: totales.preguntas, icon: HelpCircle, color: 'text-orange-500' },
              { label: 'Días activos', value: diasActivos, icon: Users, color: 'text-green-500' },
            ].map(s => (
              <div key={s.label} className="rounded-lg border bg-card p-4 flex items-center gap-3">
                <s.icon className={cn('h-5 w-5 shrink-0', s.color)} />
                <div>
                  <p className="text-2xl font-bold leading-none">{s.value}</p>
                  <p className="text-[11px] text-muted-foreground mt-1">{s.label}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Gráfico volumen + Sentimiento */}
          <div className="grid sm:grid-cols-3 gap-4">
            <div className="sm:col-span-2 rounded-lg border bg-card p-4 space-y-3">
              <p className="text-sm font-semibold">Volumen diario — últimas 2 semanas</p>
              <BarChart kpis={kpis} />
            </div>
            <div className="rounded-lg border bg-card p-4 space-y-4">
              <p className="text-sm font-semibold">Sentimiento global</p>
              <SentimentBar positive={totales.positivo} neutral={totales.neutral} negative={totales.negativo} />
              <div className="space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full bg-green-500 inline-block" /> Positivo</span>
                  <span className="font-medium">{totales.positivo}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full bg-gray-300 dark:bg-gray-600 inline-block" /> Neutral</span>
                  <span className="font-medium">{totales.neutral}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full bg-red-400 inline-block" /> Negativo</span>
                  <span className="font-medium text-red-500">{totales.negativo}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Insights */}
          <div className="space-y-3">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Resúmenes diarios</h2>
            {insightsConResumen.length === 0 ? (
              <div className="rounded-lg border bg-card p-8 text-center text-muted-foreground text-sm">
                Los resúmenes se generan cada noche a las 23:00 (hora Madrid)
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2">
                {insightsConResumen.map(insight => (
                  <InsightCard key={insight.id} insight={insight} />
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
