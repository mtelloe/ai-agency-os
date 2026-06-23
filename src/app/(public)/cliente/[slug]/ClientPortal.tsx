'use client';

import { useState } from 'react';
import { CheckCircle2, FileText, Download, Lock, ChevronRight, TrendingUp } from 'lucide-react';

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

type Inversion = {
  setup_fee?: number;
  mrr?: number;
  inicio?: string;
  descripcion_setup?: string;
  descripcion_mrr?: string;
};

type Props = {
  empresa: {
    nombre: string;
    portal_fases?: Fase[];
    portal_facturas?: Factura[];
    portal_notas?: string | null;
    portal_inversion?: Inversion | null;
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
      <div className="min-h-screen flex items-center justify-center px-4" style={{ background: '#f2f2f5' }}>
        <div className="w-full max-w-sm">
          <div className="text-center mb-10">
            <div className="inline-flex items-center justify-center h-14 w-14 rounded-2xl mb-6"
              style={{ background: '#eef2ff', border: '1px solid #c7d2fe' }}>
              <Lock className="h-6 w-6" style={{ color: '#4f46e5' }} />
            </div>
            <h1 className="text-2xl font-bold mb-1" style={{ color: '#111118' }}>{empresa.nombre}</h1>
            <p className="text-sm" style={{ color: '#9ca3af' }}>Portal de cliente · Simedalavida</p>
          </div>

          <div className="space-y-3">
            <input
              type="password"
              placeholder="Introduce tu PIN de acceso"
              value={pin}
              onChange={e => setPin(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleUnlock()}
              autoFocus
              className="w-full rounded-xl px-4 py-3.5 text-center text-lg tracking-[0.5em] placeholder:tracking-normal focus:outline-none focus:ring-2 transition-all"
              style={{
                background: '#ffffff',
                border: '1px solid #e4e4e8',
                color: '#111118',
              }}
            />
            {error && <p className="text-center text-sm text-red-500">{error}</p>}
            <button
              onClick={handleUnlock}
              disabled={loading || !pin.trim()}
              className="w-full rounded-xl py-3.5 font-semibold text-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              style={{ background: '#4f46e5' }}
            >
              {loading ? 'Verificando…' : 'Acceder'}
            </button>
          </div>

          <p className="text-center text-xs mt-8" style={{ color: '#9ca3af' }}>
            ¿No tienes PIN?{' '}
            <a href="mailto:info@simedalavida.com" className="hover:underline" style={{ color: '#6b7280' }}>
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
    <div className="min-h-screen" style={{ background: '#f2f2f5' }}>
      {/* Header */}
      <div className="sticky top-0 z-10 backdrop-blur-sm" style={{ background: 'rgba(242,242,245,0.85)', borderBottom: '1px solid #e4e4e8' }}>
        <div className="max-w-2xl mx-auto px-6 py-4 flex items-center justify-between">
          <span className="text-xs font-semibold tracking-wide" style={{ color: '#6b7280' }}>Simedalavida</span>
          <span className="text-xs" style={{ color: '#9ca3af' }}>{empresa.nombre}</span>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-6 py-12 space-y-8">

        {/* Hero */}
        <div className="space-y-5">
          <div>
            <p className="text-xs uppercase tracking-widest font-semibold mb-2" style={{ color: '#6366f1' }}>
              Tu proyecto
            </p>
            <h1 className="text-3xl font-bold" style={{ color: '#111118' }}>{empresa.nombre}</h1>
            {faseActiva && (
              <p className="text-sm mt-2 flex items-center gap-2" style={{ color: '#6b7280' }}>
                <span className="inline-block h-1.5 w-1.5 rounded-full animate-pulse" style={{ background: '#6366f1' }} />
                Ahora: {faseActiva.nombre}
              </p>
            )}
          </div>

          {fases.length > 0 && (
            <div className="rounded-2xl p-5 space-y-3" style={{ background: '#ffffff', border: '1px solid #e4e4e8', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
              <div className="flex items-center justify-between text-sm">
                <span style={{ color: '#6b7280' }}>
                  <span className="font-bold text-base" style={{ color: '#111118' }}>{completadas}</span>
                  <span> / {fases.length} entregas completadas</span>
                </span>
                <span className="font-bold text-lg" style={{ color: '#111118' }}>{progreso}%</span>
              </div>
              <div className="h-2 rounded-full overflow-hidden" style={{ background: '#e9e9ed' }}>
                <div
                  className="h-full rounded-full transition-all duration-700"
                  style={{ width: `${progreso}%`, background: 'linear-gradient(90deg, #6366f1, #818cf8)' }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Timeline */}
        {fases.length > 0 && (
          <section className="space-y-4">
            <h2 className="text-xs font-semibold uppercase tracking-widest" style={{ color: '#9ca3af' }}>
              Estado del proyecto
            </h2>

            <div className="relative">
              <div className="absolute left-[15px] top-4 bottom-4 w-px" style={{ background: 'linear-gradient(to bottom, #d1d5db, #e9e9ed, transparent)' }} />

              <div className="space-y-2">
                {fases.map((fase, i) => {
                  const isEnCurso = fase.estado === 'en_curso';
                  const isCompletado = fase.estado === 'completado';

                  return (
                    <div key={i} className="relative flex gap-5">
                      {/* Dot */}
                      <div className="relative z-10 shrink-0 mt-0.5">
                        {isCompletado && (
                          <div className="h-8 w-8 rounded-full flex items-center justify-center" style={{ background: '#ecfdf5', border: '1px solid #a7f3d0' }}>
                            <CheckCircle2 className="h-4 w-4" style={{ color: '#10b981' }} />
                          </div>
                        )}
                        {isEnCurso && (
                          <div className="h-8 w-8 rounded-full flex items-center justify-center" style={{ background: '#eef2ff', border: '2px solid #a5b4fc' }}>
                            <span className="h-2.5 w-2.5 rounded-full animate-pulse block" style={{ background: '#6366f1' }} />
                          </div>
                        )}
                        {fase.estado === 'pendiente' && (
                          <div className="h-8 w-8 rounded-full flex items-center justify-center" style={{ background: '#f3f4f6', border: '1px solid #e5e7eb' }}>
                            <span className="h-2 w-2 rounded-full block" style={{ background: '#d1d5db' }} />
                          </div>
                        )}
                      </div>

                      {/* Card */}
                      <div className={`flex-1 min-w-0 rounded-xl px-4 py-3 mb-2`} style={
                        isEnCurso
                          ? { background: '#eef2ff', border: '1px solid #c7d2fe', boxShadow: '0 1px 4px rgba(99,102,241,0.1)' }
                          : isCompletado
                          ? { background: '#ffffff', border: '1px solid #e4e4e8', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }
                          : { background: 'transparent' }
                      }>
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex items-center gap-2 min-w-0">
                            <p className="font-medium leading-snug" style={{
                              color: isCompletado ? '#111118' : isEnCurso ? '#3730a3' : '#9ca3af'
                            }}>
                              {fase.nombre}
                            </p>
                            {isEnCurso && (
                              <span className="text-xs font-medium px-2 py-0.5 rounded-full shrink-0"
                                style={{ background: '#e0e7ff', color: '#4338ca' }}>
                                En curso
                              </span>
                            )}
                          </div>
                          {fase.fecha && (
                            <span className="text-xs shrink-0" style={{ color: '#9ca3af' }}>{fase.fecha}</span>
                          )}
                        </div>
                        {fase.descripcion && (
                          <p className="text-sm mt-1" style={{ color: '#6b7280' }}>{fase.descripcion}</p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </section>
        )}

        {/* Inversión */}
        {empresa.portal_inversion && (empresa.portal_inversion.setup_fee || empresa.portal_inversion.mrr) && (
          <section className="space-y-4">
            <h2 className="text-xs font-semibold uppercase tracking-widest" style={{ color: '#9ca3af' }}>
              Tu inversión
            </h2>
            <div className="rounded-2xl p-5 space-y-4" style={{ background: '#ffffff', border: '1px solid #e4e4e8', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
              <div className="flex items-center gap-3 mb-1">
                <div className="h-8 w-8 rounded-xl flex items-center justify-center shrink-0" style={{ background: '#f0fdf4', border: '1px solid #bbf7d0' }}>
                  <TrendingUp className="h-4 w-4" style={{ color: '#16a34a' }} />
                </div>
                <div>
                  <p className="text-sm font-semibold" style={{ color: '#111118' }}>Resumen económico</p>
                  {empresa.portal_inversion.inicio && (
                    <p className="text-xs" style={{ color: '#9ca3af' }}>Desde {empresa.portal_inversion.inicio}</p>
                  )}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {empresa.portal_inversion.setup_fee != null && (
                  <div className="rounded-xl p-4" style={{ background: '#f9fafb', border: '1px solid #f3f4f6' }}>
                    <p className="text-xs font-medium uppercase tracking-wide mb-1" style={{ color: '#9ca3af' }}>Setup inicial</p>
                    <p className="text-2xl font-bold" style={{ color: '#111118' }}>
                      {empresa.portal_inversion.setup_fee.toLocaleString('es-ES')} €
                    </p>
                    {empresa.portal_inversion.descripcion_setup && (
                      <p className="text-xs mt-1.5 leading-snug" style={{ color: '#6b7280' }}>
                        {empresa.portal_inversion.descripcion_setup}
                      </p>
                    )}
                  </div>
                )}
                {empresa.portal_inversion.mrr != null && (
                  <div className="rounded-xl p-4" style={{ background: '#f9fafb', border: '1px solid #f3f4f6' }}>
                    <p className="text-xs font-medium uppercase tracking-wide mb-1" style={{ color: '#9ca3af' }}>Cuota mensual</p>
                    <p className="text-2xl font-bold" style={{ color: '#111118' }}>
                      {empresa.portal_inversion.mrr.toLocaleString('es-ES')} €
                      <span className="text-sm font-normal ml-1" style={{ color: '#9ca3af' }}>/mes</span>
                    </p>
                    {empresa.portal_inversion.descripcion_mrr && (
                      <p className="text-xs mt-1.5 leading-snug" style={{ color: '#6b7280' }}>
                        {empresa.portal_inversion.descripcion_mrr}
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>
          </section>
        )}

        {/* Facturas */}
        {facturas.length > 0 && (
          <section className="space-y-4">
            <h2 className="text-xs font-semibold uppercase tracking-widest" style={{ color: '#9ca3af' }}>
              Facturas
            </h2>
            <div className="rounded-2xl overflow-hidden" style={{ background: '#ffffff', border: '1px solid #e4e4e8', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
              {facturas.map((fra, i) => (
                <div key={i} className="flex items-center gap-4 px-5 py-4 transition-colors hover:bg-gray-50"
                  style={{ borderBottom: i < facturas.length - 1 ? '1px solid #f3f4f6' : 'none' }}>
                  <FileText className="h-4 w-4 shrink-0" style={{ color: '#d1d5db' }} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate" style={{ color: '#111118' }}>{fra.concepto}</p>
                    <p className="text-xs mt-0.5" style={{ color: '#9ca3af' }}>{fra.numero} · {fra.fecha}</p>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className="text-sm font-semibold" style={{ color: '#111118' }}>{fra.importe}</span>
                    <span className="text-xs px-2.5 py-0.5 rounded-full font-medium" style={
                      fra.estado === 'pagada'
                        ? { background: '#ecfdf5', color: '#059669', border: '1px solid #a7f3d0' }
                        : { background: '#fffbeb', color: '#d97706', border: '1px solid #fcd34d' }
                    }>
                      {fra.estado === 'pagada' ? 'Pagada' : 'Pendiente'}
                    </span>
                    {fra.url && (
                      <a href={fra.url} target="_blank" rel="noopener noreferrer"
                        className="transition-colors hover:opacity-70" style={{ color: '#9ca3af' }} title="Descargar">
                        <Download className="h-4 w-4" />
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Nota pública */}
        {empresa.portal_notas && (
          <section className="space-y-3">
            <h2 className="text-xs font-semibold uppercase tracking-widest" style={{ color: '#9ca3af' }}>
              Notas del proyecto
            </h2>
            <div className="rounded-2xl p-5" style={{ background: '#ffffff', border: '1px solid #e4e4e8', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
              <p className="text-sm leading-relaxed whitespace-pre-line" style={{ color: '#374151' }}>
                {empresa.portal_notas}
              </p>
            </div>
          </section>
        )}

        {/* Contact CTA */}
        <div className="rounded-2xl p-6 flex items-center justify-between"
          style={{ background: '#eef2ff', border: '1px solid #c7d2fe' }}>
          <div>
            <p className="font-semibold" style={{ color: '#3730a3' }}>¿Tienes alguna pregunta?</p>
            <p className="text-sm mt-0.5" style={{ color: '#6366f1' }}>Estamos disponibles para ti</p>
          </div>
          <a href="https://wa.me/34682355001"
            target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-sm font-medium transition-opacity hover:opacity-70"
            style={{ color: '#4f46e5' }}>
            Escríbenos <ChevronRight className="h-4 w-4" />
          </a>
        </div>

      </div>
    </div>
  );
}
