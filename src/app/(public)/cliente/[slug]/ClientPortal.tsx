'use client';

import { useState } from 'react';
import { CheckCircle, Clock, Circle, FileText, Download, Lock, ChevronRight } from 'lucide-react';

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
    portal_pin: string;
    portal_fases: Fase[];
    portal_facturas: Factura[];
    portal_notas: string | null;
    email: string | null;
    telefono: string | null;
  };
};

export default function ClientPortal({ empresa }: Props) {
  const [pin, setPin] = useState('');
  const [unlocked, setUnlocked] = useState(false);
  const [error, setError] = useState(false);

  function handleUnlock() {
    if (pin === empresa.portal_pin) {
      setUnlocked(true);
      setError(false);
    } else {
      setError(true);
    }
  }

  if (!unlocked) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0a0a0a] px-4">
        <div className="w-full max-w-sm space-y-6">
          <div className="text-center space-y-2">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-white/5 ring-1 ring-white/10">
              <Lock className="h-6 w-6 text-zinc-400" />
            </div>
            <h1 className="text-xl font-bold text-white">Portal de cliente</h1>
            <p className="text-zinc-400 text-sm">{empresa.nombre}</p>
          </div>
          <div className="space-y-3">
            <input
              type="password"
              placeholder="PIN de acceso"
              value={pin}
              onChange={e => setPin(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleUnlock()}
              className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-center text-white text-lg tracking-widest placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            {error && <p className="text-center text-sm text-red-400">PIN incorrecto</p>}
            <button
              onClick={handleUnlock}
              className="w-full rounded-lg bg-indigo-600 py-3 font-semibold text-white hover:bg-indigo-500 transition-colors"
            >
              Acceder
            </button>
          </div>
          <p className="text-center text-xs text-zinc-600">
            ¿No tienes PIN? Escríbenos a info@simedalavida.com
          </p>
        </div>
      </div>
    );
  }

  const fases: Fase[] = empresa.portal_fases || [];
  const facturas: Factura[] = empresa.portal_facturas || [];

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      {/* Header */}
      <div className="border-b border-white/10 px-6 py-5">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <div>
            <p className="text-xs text-zinc-500 uppercase tracking-widest">Portal de cliente</p>
            <h1 className="text-xl font-bold">{empresa.nombre}</h1>
          </div>
          <a href="https://simedalavida.com" className="text-xs text-zinc-500 hover:text-white transition-colors">
            simedalavida.com
          </a>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-6 py-10 space-y-10">

        {/* Timeline / Fases */}
        {fases.length > 0 && (
          <section className="space-y-4">
            <h2 className="text-sm font-semibold uppercase tracking-widest text-zinc-400">
              Estado del proyecto
            </h2>
            <div className="space-y-3">
              {fases.map((fase, i) => (
                <div
                  key={i}
                  className="flex gap-4 rounded-xl border border-white/8 bg-white/3 p-4"
                >
                  <div className="mt-0.5 shrink-0">
                    {fase.estado === 'completado' && (
                      <CheckCircle className="h-5 w-5 text-emerald-400" />
                    )}
                    {fase.estado === 'en_curso' && (
                      <Clock className="h-5 w-5 text-indigo-400 animate-pulse" />
                    )}
                    {fase.estado === 'pendiente' && (
                      <Circle className="h-5 w-5 text-zinc-600" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className={`font-medium ${fase.estado === 'pendiente' ? 'text-zinc-500' : 'text-white'}`}>
                        {fase.nombre}
                      </p>
                      {fase.fecha && (
                        <span className="text-xs text-zinc-600 shrink-0">{fase.fecha}</span>
                      )}
                    </div>
                    {fase.descripcion && (
                      <p className="text-sm text-zinc-500 mt-1">{fase.descripcion}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Facturas */}
        {facturas.length > 0 && (
          <section className="space-y-4">
            <h2 className="text-sm font-semibold uppercase tracking-widest text-zinc-400">
              Facturas y recibos
            </h2>
            <div className="space-y-2">
              {facturas.map((fra, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between gap-4 rounded-xl border border-white/8 bg-white/3 p-4"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <FileText className="h-4 w-4 text-zinc-500 shrink-0" />
                    <div className="min-w-0">
                      <p className="font-medium truncate">{fra.concepto}</p>
                      <p className="text-xs text-zinc-500">{fra.numero} · {fra.fecha}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className="text-sm font-semibold">{fra.importe}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                      fra.estado === 'pagada'
                        ? 'bg-emerald-500/10 text-emerald-400'
                        : 'bg-amber-500/10 text-amber-400'
                    }`}>
                      {fra.estado === 'pagada' ? 'Pagada' : 'Pendiente'}
                    </span>
                    {fra.url && (
                      <a
                        href={fra.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-zinc-500 hover:text-white transition-colors"
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

        {/* Notas */}
        {empresa.portal_notas && (
          <section className="space-y-3">
            <h2 className="text-sm font-semibold uppercase tracking-widest text-zinc-400">
              Notas del proyecto
            </h2>
            <div className="rounded-xl border border-white/8 bg-white/3 p-5">
              <p className="text-sm text-zinc-300 whitespace-pre-line leading-relaxed">
                {empresa.portal_notas}
              </p>
            </div>
          </section>
        )}

        {/* Contacto */}
        <section className="rounded-xl border border-white/8 bg-white/3 p-5 flex items-center justify-between">
          <div>
            <p className="font-medium">¿Tienes alguna duda?</p>
            <p className="text-sm text-zinc-500">Estamos disponibles para ti</p>
          </div>
          <a
            href={`mailto:info@simedalavida.com`}
            className="flex items-center gap-1 text-sm text-indigo-400 hover:text-indigo-300 transition-colors"
          >
            Escribir <ChevronRight className="h-4 w-4" />
          </a>
        </section>

      </div>
    </div>
  );
}
