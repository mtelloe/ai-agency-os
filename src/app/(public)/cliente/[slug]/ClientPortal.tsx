'use client';

import { useState } from 'react';
import { CheckCircle2, Clock, Circle, FileText, Download, Lock, ChevronRight } from 'lucide-react';

type Fase = {
  nombre: string;
  descripcion?: string;
  estado: 'completado' | 'en_curso' | 'pendiente';
  fecha?: string;
};

type Factura = {
  numero: string;
  concepto: string;
  importe: string;
  fecha: string;
  estado: 'pagada' | 'pendiente';
  url?: string;
};

type Props = {
  empresa: {
    nombre: string;
    portal_fases?: Fase[];
    portal_facturas?: Factura[];
    portal_notas?: string | null;
    email?: string | null;
    telefono?: string | null;
  };
  slug: string;
  isUnlocked: boolean;
};

export default function ClientPortal({ empresa, slug, isUnlocked }: Props) {
  const [pin, setPin] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleUnlock() {
    if (!pin.trim() || loading) return;
    setLoading(true);
    setError('');

    try {
      const res = await fetch(`/api/portal/${slug}/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin }),
      });

      if (res.ok) {
        window.location.reload();
      } else {
        setError('PIN incorrecto. Inténtalo de nuevo.');
        setPin('');
      }
    } catch {
      setError('Error de conexión. Inténtalo de nuevo.');
    } finally {
      setLoading(false);
    }
  }

  if (!isUnlocked) {
    return (
      <div
        className="min-h-screen flex items-center justify-center bg-[#0a0a0a] px-4"
        style={{ backgroundImage: 'radial-gradient(ellipse at 50% 0%, rgba(99,102,241,0.1) 0%, transparent 65%)' }}
      >
        <div className="w-full max-w-sm">
          <div className="text-center mb-10">
            <div className="inline-flex items-center justify-center h-14 w-14 rounded-2xl bg-indigo-600/15 ring-1 ring-indigo-500/30 mb-6">
              <Lock className="h-6 w-6 text-indigo-400" />
            </div>
            <h1 className="text-2xl font-bold text-white mb-1">{empresa.nombre}</h1>
            <p className="text-zinc-500 text-sm">Portal de cliente · Simedalavida</p>
          </div>

          <div className="space-y-3">
            <input
              type="password"
              placeholder="Introduce tu PIN de acceso"
              value={pin}
              onChange={e => setPin(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleUnlock()}
              autoFocus
              className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3.5 text-center text-white text-lg tracking-[0.5em] placeholder:text-zinc-600 placeholder:tracking-normal focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/30 transition-all"
            />
            {error && (
              <p className="text-center text-sm text-red-400">{error}</p>
            )}
            <button
              onClick={handleUnlock}
              disabled={loading || !pin.trim()}
              className="w-full rounded-xl bg-indigo-600 py-3.5 font-semibold text-white hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? 'Verificando…' : 'Acceder'}
            </button>
          </div>

          <p className="text-center text-xs text-zinc-600 mt-8">
            ¿No tienes PIN?{' '}
            <a href="mailto:info@simedalavida.com" className="text-zinc-400 hover:text-white transition-colors">
              Escríbenos
            </a>
          </p>
        </div>
      </div>
    );
  }

  const fases: Fase[] = empresa.portal_fases || [];
  const facturas: Factura[] = empresa.portal_facturas || [];
  const completadas = fases.filter(f => f.estado === 'completado').length;
  const progreso = fases.length > 0 ? Math.round((completadas / fases.length) * 100) : 0;
  const faseActiva = fases.find(f => f.estado === 'en_curso');

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      {/* Header */}
      <div className="border-b border-white/8 sticky top-0 z-10 bg-[#0a0a0a]/80 backdrop-blur-sm">
        <div className="max-w-2xl mx-auto px-6 py-4 flex items-center justify-between">
          <span className="text-xs font-medium text-zinc-400">Simedalavida</span>
          <span className="text-xs text-zinc-600">{empresa.nombre}</span>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-6 py-12 space-y-12">

        {/* Hero */}
        <div className="space-y-6">
          <div>
            <p className="text-xs uppercase tracking-widest font-medium text-indigo-400 mb-3">
              Tu proyecto
            </p>
            <h1 className="text-3xl font-bold leading-tight">{empresa.nombre}</h1>
            {faseActiva && (
              <p className="text-zinc-400 text-sm mt-2 flex items-center gap-2">
                <span className="inline-block h-1.5 w-1.5 rounded-full bg-indigo-400 animate-pulse" />
                Ahora: {faseActiva.nombre}
              </p>
            )}
          </div>

          {fases.length > 0 && (
            <div className="rounded-2xl border border-white/8 bg-white/3 p-5 space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-zinc-400">
                  <span className="text-white font-semibold text-base">{completadas}</span>
                  <span className="text-zinc-500"> / {fases.length} entregas completadas</span>
                </span>
                <span className="text-zinc-300 font-bold text-lg">{progreso}%</span>
              </div>
              <div className="h-2 rounded-full bg-white/8 overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-indigo-600 to-indigo-400 transition-all duration-700"
                  style={{ width: `${progreso}%` }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Timeline */}
        {fases.length > 0 && (
          <section className="space-y-5">
            <h2 className="text-xs font-semibold uppercase tracking-widest text-zinc-500">
              Estado del proyecto
            </h2>

            <div className="relative">
              {/* Vertical connecting line */}
              <div className="absolute left-[15px] top-4 bottom-4 w-px bg-gradient-to-b from-white/15 via-white/8 to-transparent" />

              <div className="space-y-2">
                {fases.map((fase, i) => {
                  const isEnCurso = fase.estado === 'en_curso';
                  const isCompletado = fase.estado === 'completado';

                  return (
                    <div key={i} className="relative flex gap-5">
                      {/* Status dot */}
                      <div className="relative z-10 shrink-0 mt-0.5">
                        {isCompletado && (
                          <div className="h-8 w-8 rounded-full bg-emerald-500/15 ring-1 ring-emerald-500/40 flex items-center justify-center">
                            <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                          </div>
                        )}
                        {isEnCurso && (
                          <div className="h-8 w-8 rounded-full bg-indigo-500/20 ring-2 ring-indigo-500/60 flex items-center justify-center">
                            <span className="h-2.5 w-2.5 rounded-full bg-indigo-400 animate-pulse block" />
                          </div>
                        )}
                        {fase.estado === 'pendiente' && (
                          <div className="h-8 w-8 rounded-full bg-white/3 ring-1 ring-white/10 flex items-center justify-center">
                            <span className="h-2 w-2 rounded-full bg-zinc-700 block" />
                          </div>
                        )}
                      </div>

                      {/* Content card */}
                      <div className={`flex-1 min-w-0 rounded-xl px-4 py-3 mb-2 ${
                        isEnCurso
                          ? 'bg-indigo-500/8 ring-1 ring-indigo-500/25'
                          : isCompletado
                          ? 'bg-white/3 ring-1 ring-white/6'
                          : 'bg-transparent'
                      }`}>
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex items-center gap-2 min-w-0">
                            <p className={`font-medium leading-snug ${
                              isCompletado ? 'text-white' :
                              isEnCurso ? 'text-white' :
                              'text-zinc-600'
                            }`}>
                              {fase.nombre}
                            </p>
                            {isEnCurso && (
                              <span className="text-xs text-indigo-400 font-medium shrink-0 bg-indigo-500/15 px-2 py-0.5 rounded-full">
                                En curso
                              </span>
                            )}
                          </div>
                          {fase.fecha && (
                            <span className="text-xs text-zinc-600 shrink-0">{fase.fecha}</span>
                          )}
                        </div>
                        {fase.descripcion && (
                          <p className="text-sm text-zinc-500 mt-1">{fase.descripcion}</p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </section>
        )}

        {/* Invoices */}
        {facturas.length > 0 && (
          <section className="space-y-4">
            <h2 className="text-xs font-semibold uppercase tracking-widest text-zinc-500">
              Facturas
            </h2>
            <div className="rounded-2xl border border-white/8 overflow-hidden divide-y divide-white/6">
              {facturas.map((fra, i) => (
                <div key={i} className="flex items-center gap-4 px-5 py-4 bg-white/2 hover:bg-white/4 transition-colors">
                  <FileText className="h-4 w-4 text-zinc-600 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{fra.concepto}</p>
                    <p className="text-xs text-zinc-600 mt-0.5">{fra.numero} · {fra.fecha}</p>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className="text-sm font-semibold">{fra.importe}</span>
                    <span className={`text-xs px-2.5 py-0.5 rounded-full font-medium ${
                      fra.estado === 'pagada'
                        ? 'bg-emerald-500/12 text-emerald-400 ring-1 ring-emerald-500/20'
                        : 'bg-amber-500/12 text-amber-400 ring-1 ring-amber-500/20'
                    }`}>
                      {fra.estado === 'pagada' ? 'Pagada' : 'Pendiente'}
                    </span>
                    {fra.url && (
                      <a
                        href={fra.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-zinc-500 hover:text-white transition-colors"
                        title="Descargar factura"
                      >
                        <Download className="h-4 w-4" />
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Notes */}
        {empresa.portal_notas && (
          <section className="space-y-3">
            <h2 className="text-xs font-semibold uppercase tracking-widest text-zinc-500">
              Notas del proyecto
            </h2>
            <div className="rounded-2xl border border-white/8 bg-white/3 p-5">
              <p className="text-sm text-zinc-300 whitespace-pre-line leading-relaxed">
                {empresa.portal_notas}
              </p>
            </div>
          </section>
        )}

        {/* Contact CTA */}
        <div
          className="rounded-2xl p-6 flex items-center justify-between"
          style={{ background: 'linear-gradient(135deg, rgba(99,102,241,0.12) 0%, rgba(99,102,241,0.04) 100%)', border: '1px solid rgba(99,102,241,0.2)' }}
        >
          <div>
            <p className="font-semibold text-white">¿Tienes alguna pregunta?</p>
            <p className="text-sm text-zinc-400 mt-0.5">Estamos disponibles para ti</p>
          </div>
          <a
            href="mailto:info@simedalavida.com"
            className="flex items-center gap-1.5 text-sm font-medium text-indigo-400 hover:text-indigo-300 transition-colors"
          >
            Escríbenos <ChevronRight className="h-4 w-4" />
          </a>
        </div>

      </div>
    </div>
  );
}
