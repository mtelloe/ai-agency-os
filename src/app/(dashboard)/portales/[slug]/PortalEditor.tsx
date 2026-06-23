'use client';

import { useState } from 'react';
import { Plus, Trash2, ExternalLink, Save, ChevronLeft } from 'lucide-react';
import Link from 'next/link';

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
  setup_fee?: number | null;
  mrr?: number | null;
  inicio?: string;
  descripcion_setup?: string;
  descripcion_mrr?: string;
};

type Empresa = {
  id: string;
  nombre: string;
  portal_slug: string;
  portal_pin: string;
  portal_fases: Fase[];
  portal_facturas: Factura[];
  portal_notas: string | null;
  portal_notas_admin: string | null;
  portal_inversion: Inversion | null;
};

export default function PortalEditor({ empresa }: { empresa: Empresa }) {
  const [fases, setFases] = useState<Fase[]>(empresa.portal_fases || []);
  const [facturas, setFacturas] = useState<Factura[]>(empresa.portal_facturas || []);
  const [pin, setPin] = useState(empresa.portal_pin || '');
  const [notasPublicas, setNotasPublicas] = useState(empresa.portal_notas || '');
  const [notasAdmin, setNotasAdmin] = useState(empresa.portal_notas_admin || '');
  const [inversion, setInversion] = useState<Inversion>(empresa.portal_inversion || {});
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  async function handleSave() {
    setSaving(true);
    setSaved(false);
    try {
      const inversionPayload = (inversion.setup_fee != null || inversion.mrr != null)
        ? inversion
        : null;
      const res = await fetch(`/api/portal/${empresa.portal_slug}/admin`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          portal_pin: pin,
          portal_fases: fases,
          portal_facturas: facturas,
          portal_notas: notasPublicas,
          portal_notas_admin: notasAdmin,
          portal_inversion: inversionPayload,
        }),
      });
      if (res.ok) setSaved(true);
    } finally {
      setSaving(false);
    }
  }

  function addFase() {
    setFases(prev => [...prev, { nombre: '', estado: 'pendiente', fecha: '', descripcion: '' }]);
  }

  function updateFase(i: number, field: keyof Fase, value: string) {
    setFases(prev => prev.map((f, idx) => idx === i ? { ...f, [field]: value } : f));
  }

  function removeFase(i: number) {
    setFases(prev => prev.filter((_, idx) => idx !== i));
  }

  function addFactura() {
    setFacturas(prev => [...prev, { numero: '', concepto: '', importe: '', fecha: '', estado: 'pendiente', url: '' }]);
  }

  function updateFactura(i: number, field: keyof Factura, value: string) {
    setFacturas(prev => prev.map((f, idx) => idx === i ? { ...f, [field]: value } : f));
  }

  function removeFactura(i: number) {
    setFacturas(prev => prev.filter((_, idx) => idx !== i));
  }

  const estadoColor = {
    completado: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    en_curso: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20',
    pendiente: 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20',
  };

  return (
    <div className="space-y-8 max-w-3xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/portales" className="text-muted-foreground hover:text-foreground transition-colors">
            <ChevronLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-xl font-bold">{empresa.nombre}</h1>
            <p className="text-muted-foreground text-sm">/cliente/{empresa.portal_slug}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <a
            href={`https://hub.simedalavida.com/cliente/${empresa.portal_slug}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            Ver portal <ExternalLink className="h-3.5 w-3.5" />
          </a>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors"
          >
            <Save className="h-4 w-4" />
            {saving ? 'Guardando…' : saved ? '¡Guardado!' : 'Guardar cambios'}
          </button>
        </div>
      </div>

      {/* Configuración */}
      <section className="rounded-xl border p-5 space-y-4">
        <h2 className="font-semibold text-sm">Configuración de acceso</h2>
        <div className="flex items-center gap-4">
          <div className="flex-1 space-y-1.5">
            <label className="text-xs text-muted-foreground">PIN de acceso</label>
            <input
              value={pin}
              onChange={e => setPin(e.target.value)}
              placeholder="PIN del cliente"
              className="w-full rounded-lg border bg-muted/30 px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <div className="flex-1 space-y-1.5">
            <label className="text-xs text-muted-foreground">URL del portal</label>
            <p className="text-sm text-muted-foreground bg-muted/30 px-3 py-2 rounded-lg border">
              /cliente/{empresa.portal_slug}
            </p>
          </div>
        </div>
      </section>

      {/* Fases */}
      <section className="rounded-xl border p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-sm">Fases del proyecto</h2>
          <button
            onClick={addFase}
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors border rounded-lg px-3 py-1.5"
          >
            <Plus className="h-3.5 w-3.5" /> Añadir fase
          </button>
        </div>

        <div className="space-y-3">
          {fases.map((fase, i) => (
            <div key={i} className="rounded-lg border bg-muted/20 p-4 space-y-3">
              <div className="flex items-start gap-3">
                <div className="flex-1 space-y-1.5">
                  <label className="text-xs text-muted-foreground">Nombre</label>
                  <input
                    value={fase.nombre}
                    onChange={e => updateFase(i, 'nombre', e.target.value)}
                    placeholder="Nombre de la fase"
                    className="w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>
                <div className="w-36 space-y-1.5">
                  <label className="text-xs text-muted-foreground">Estado</label>
                  <select
                    value={fase.estado}
                    onChange={e => updateFase(i, 'estado', e.target.value)}
                    className={`w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring ${estadoColor[fase.estado]}`}
                  >
                    <option value="pendiente">Pendiente</option>
                    <option value="en_curso">En curso</option>
                    <option value="completado">Completado</option>
                  </select>
                </div>
                <div className="w-28 space-y-1.5">
                  <label className="text-xs text-muted-foreground">Fecha</label>
                  <input
                    value={fase.fecha || ''}
                    onChange={e => updateFase(i, 'fecha', e.target.value)}
                    placeholder="Ej: Jun 2026"
                    className="w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>
                <button
                  onClick={() => removeFase(i)}
                  className="mt-6 text-muted-foreground hover:text-destructive transition-colors"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs text-muted-foreground">Descripción (opcional, visible al cliente)</label>
                <input
                  value={fase.descripcion || ''}
                  onChange={e => updateFase(i, 'descripcion', e.target.value)}
                  placeholder="Detalle adicional que verá el cliente…"
                  className="w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
            </div>
          ))}
          {fases.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">
              Sin fases todavía. Pulsa "Añadir fase" para empezar.
            </p>
          )}
        </div>
      </section>

      {/* Facturas */}
      <section className="rounded-xl border p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-sm">Facturas</h2>
          <button
            onClick={addFactura}
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors border rounded-lg px-3 py-1.5"
          >
            <Plus className="h-3.5 w-3.5" /> Añadir factura
          </button>
        </div>

        <div className="space-y-3">
          {facturas.map((fra, i) => (
            <div key={i} className="rounded-lg border bg-muted/20 p-4 space-y-3">
              <div className="flex items-start gap-3">
                <div className="w-28 space-y-1.5">
                  <label className="text-xs text-muted-foreground">Número</label>
                  <input
                    value={fra.numero}
                    onChange={e => updateFactura(i, 'numero', e.target.value)}
                    placeholder="F2026001"
                    className="w-full rounded-lg border bg-background px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>
                <div className="flex-1 space-y-1.5">
                  <label className="text-xs text-muted-foreground">Concepto</label>
                  <input
                    value={fra.concepto}
                    onChange={e => updateFactura(i, 'concepto', e.target.value)}
                    placeholder="Descripción del servicio"
                    className="w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>
                <button
                  onClick={() => removeFactura(i)}
                  className="mt-6 text-muted-foreground hover:text-destructive transition-colors"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
              <div className="flex gap-3">
                <div className="w-28 space-y-1.5">
                  <label className="text-xs text-muted-foreground">Importe</label>
                  <input
                    value={fra.importe}
                    onChange={e => updateFactura(i, 'importe', e.target.value)}
                    placeholder="484,00 €"
                    className="w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>
                <div className="w-28 space-y-1.5">
                  <label className="text-xs text-muted-foreground">Fecha</label>
                  <input
                    value={fra.fecha}
                    onChange={e => updateFactura(i, 'fecha', e.target.value)}
                    placeholder="21/06/2026"
                    className="w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>
                <div className="w-28 space-y-1.5">
                  <label className="text-xs text-muted-foreground">Estado</label>
                  <select
                    value={fra.estado}
                    onChange={e => updateFactura(i, 'estado', e.target.value)}
                    className="w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  >
                    <option value="pendiente">Pendiente</option>
                    <option value="pagada">Pagada</option>
                  </select>
                </div>
                <div className="flex-1 space-y-1.5">
                  <label className="text-xs text-muted-foreground">URL descarga (opcional)</label>
                  <input
                    value={fra.url || ''}
                    onChange={e => updateFactura(i, 'url', e.target.value)}
                    placeholder="https://…"
                    className="w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>
              </div>
            </div>
          ))}
          {facturas.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">
              Sin facturas todavía.
            </p>
          )}
        </div>
      </section>

      {/* Inversión */}
      <section className="rounded-xl border p-5 space-y-4">
        <h2 className="font-semibold text-sm">Resumen de inversión</h2>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs text-muted-foreground">Setup fee (€, sin IVA)</label>
            <input
              type="number"
              value={inversion.setup_fee ?? ''}
              onChange={e => setInversion(prev => ({ ...prev, setup_fee: e.target.value ? Number(e.target.value) : null }))}
              placeholder="1600"
              className="w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs text-muted-foreground">Cuota mensual / MRR (€)</label>
            <input
              type="number"
              value={inversion.mrr ?? ''}
              onChange={e => setInversion(prev => ({ ...prev, mrr: e.target.value ? Number(e.target.value) : null }))}
              placeholder="150"
              className="w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs text-muted-foreground">Fecha de inicio (visible al cliente)</label>
            <input
              value={inversion.inicio || ''}
              onChange={e => setInversion(prev => ({ ...prev, inicio: e.target.value }))}
              placeholder="Jun 2026"
              className="w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs text-muted-foreground">Descripción setup (opcional)</label>
            <input
              value={inversion.descripcion_setup || ''}
              onChange={e => setInversion(prev => ({ ...prev, descripcion_setup: e.target.value }))}
              placeholder="Configuración inicial + agentes IA"
              className="w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <div className="col-span-2 space-y-1.5">
            <label className="text-xs text-muted-foreground">Descripción cuota mensual (opcional)</label>
            <input
              value={inversion.descripcion_mrr || ''}
              onChange={e => setInversion(prev => ({ ...prev, descripcion_mrr: e.target.value }))}
              placeholder="Mantenimiento, mejoras y soporte continuo"
              className="w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
        </div>
      </section>

      {/* Notas */}
      <div className="grid grid-cols-2 gap-4">
        <section className="rounded-xl border p-5 space-y-3">
          <div>
            <h2 className="font-semibold text-sm">Nota pública</h2>
            <p className="text-xs text-muted-foreground mt-0.5">Visible para el cliente en su portal</p>
          </div>
          <textarea
            value={notasPublicas}
            onChange={e => setNotasPublicas(e.target.value)}
            placeholder="Mensaje o nota que verá el cliente…"
            rows={5}
            className="w-full rounded-lg border bg-muted/30 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none"
          />
        </section>

        <section className="rounded-xl border border-amber-500/20 bg-amber-500/3 p-5 space-y-3">
          <div>
            <h2 className="font-semibold text-sm flex items-center gap-2">
              Notas privadas
              <span className="text-xs font-normal text-amber-500 bg-amber-500/10 px-1.5 py-0.5 rounded">Solo admin</span>
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">Solo visible en este panel. El cliente nunca la ve.</p>
          </div>
          <textarea
            value={notasAdmin}
            onChange={e => setNotasAdmin(e.target.value)}
            placeholder="Anotaciones internas, próximos pasos, contexto del cliente…"
            rows={5}
            className="w-full rounded-lg border border-amber-500/20 bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/40 resize-none"
          />
        </section>
      </div>

      {/* Save bottom */}
      <div className="flex justify-end pb-8">
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 bg-primary text-primary-foreground px-6 py-2.5 rounded-lg text-sm font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors"
        >
          <Save className="h-4 w-4" />
          {saving ? 'Guardando…' : saved ? '¡Guardado!' : 'Guardar cambios'}
        </button>
      </div>
    </div>
  );
}
