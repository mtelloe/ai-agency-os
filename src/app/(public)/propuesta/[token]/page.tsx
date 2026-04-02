import { createClient } from '@/lib/supabase/server';
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from '@/components/ui/card';
import type { Propuesta } from '@/lib/types/database';
import {
  AlertTriangle,
  CheckCircle,
  Layers,
  Clock,
  TrendingUp,
  ArrowRight,
  Mail,
  FileText,
  Sparkles,
  CircleDot,
} from 'lucide-react';

export default async function PropuestaPublicPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const supabase = await createClient();

  const { data: propuesta } = await supabase
    .from('propuestas')
    .select(
      'titulo, resumen_ejecutivo, problemas, solucion, stack, cronograma, precio_setup, precio_mensual, roi, cta_cierre, version, created_at, empresa:empresas(nombre, website)'
    )
    .eq('share_token', token)
    .single<
      Pick<
        Propuesta,
        | 'titulo'
        | 'resumen_ejecutivo'
        | 'problemas'
        | 'solucion'
        | 'stack'
        | 'cronograma'
        | 'precio_setup'
        | 'precio_mensual'
        | 'roi'
        | 'cta_cierre'
        | 'version'
        | 'created_at'
      > & { empresa: { nombre: string; website: string | null } | null }
    >();

  if (!propuesta) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0a0a0a]">
        <div className="text-center space-y-4 px-4">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-white/5 ring-1 ring-white/10">
            <FileText className="h-8 w-8 text-zinc-500" />
          </div>
          <h1 className="text-2xl font-bold text-white">
            Propuesta no encontrada
          </h1>
          <p className="text-zinc-400 max-w-md">
            El enlace que has utilizado no es válido o la propuesta ya no está
            disponible. Si crees que se trata de un error, contacta con nosotros.
          </p>
          <a
            href="mailto:info@simedalavida.com"
            className="inline-flex items-center gap-2 text-sm text-indigo-400 hover:text-indigo-300 transition-colors"
          >
            <Mail className="h-4 w-4" />
            info@simedalavida.com
          </a>
        </div>
      </div>
    );
  }

  const fechaFormateada = new Date(propuesta.created_at).toLocaleDateString(
    'es-ES',
    {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }
  );

  const empresaNombre = propuesta.empresa?.nombre ?? 'tu empresa';

  // Split text fields into arrays for bullet rendering
  const problemasList = propuesta.problemas
    ? propuesta.problemas
        .split('\n')
        .map((l) => l.replace(/^[-•*]\s*/, '').trim())
        .filter(Boolean)
    : [];

  const cronogramaList = propuesta.cronograma
    ? propuesta.cronograma
        .split('\n')
        .map((l) => l.replace(/^[-•*]\s*/, '').trim())
        .filter(Boolean)
    : [];

  const stackList = propuesta.stack
    ? propuesta.stack
        .split('\n')
        .map((l) => l.replace(/^[-•*]\s*/, '').trim())
        .filter(Boolean)
    : [];

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      {/* ═══════════════════════════════════════════════════════════════════
          1. HERO HEADER
      ═══════════════════════════════════════════════════════════════════ */}
      <section className="relative overflow-hidden">
        {/* Gradient background */}
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-950 via-purple-950 to-[#0a0a0a]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-500/20 via-transparent to-transparent" />
        {/* Subtle grid pattern */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage:
              'linear-gradient(rgba(255,255,255,.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.1) 1px, transparent 1px)',
            backgroundSize: '64px 64px',
          }}
        />

        <div className="relative max-w-4xl mx-auto px-4 sm:px-6 py-20 sm:py-28 text-center">
          <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-1.5 text-xs font-medium text-indigo-200 ring-1 ring-white/10 mb-8 backdrop-blur-sm">
            <Sparkles className="h-3.5 w-3.5" />
            Propuesta comercial v{propuesta.version}
          </div>

          <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight leading-tight">
            Propuesta personalizada para{' '}
            <span className="bg-gradient-to-r from-indigo-300 via-purple-300 to-pink-300 bg-clip-text text-transparent">
              {empresaNombre}
            </span>
          </h1>

          <p className="mt-6 text-zinc-400 text-sm sm:text-base">
            Preparada por el Equipo de{' '}
            <span className="text-white font-medium">Simedalavida</span>
          </p>
          <p className="mt-2 text-zinc-500 text-sm">{fechaFormateada}</p>
        </div>
      </section>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 space-y-16 sm:space-y-24 py-16 sm:py-24">
        {/* ═══════════════════════════════════════════════════════════════════
            2. RESUMEN EJECUTIVO
        ═══════════════════════════════════════════════════════════════════ */}
        {propuesta.resumen_ejecutivo && (
          <section>
            <div className="rounded-2xl bg-white/[0.03] ring-1 ring-white/10 p-6 sm:p-10">
              <p className="text-xs font-semibold uppercase tracking-widest text-indigo-400 mb-4">
                Resumen ejecutivo
              </p>
              <p className="text-lg sm:text-xl leading-relaxed text-zinc-200 whitespace-pre-line">
                {propuesta.resumen_ejecutivo}
              </p>
            </div>
          </section>
        )}

        {/* ═══════════════════════════════════════════════════════════════════
            3. PROBLEMAS DETECTADOS
        ═══════════════════════════════════════════════════════════════════ */}
        {problemasList.length > 0 && (
          <section>
            <div className="flex items-center gap-3 mb-8">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-500/10 ring-1 ring-red-500/20">
                <AlertTriangle className="h-5 w-5 text-red-400" />
              </div>
              <h2 className="text-2xl sm:text-3xl font-bold">
                Problemas que hemos detectado
              </h2>
            </div>
            <div className="space-y-4">
              {problemasList.map((problema, i) => (
                <div
                  key={i}
                  className="flex gap-4 rounded-xl bg-white/[0.02] border-l-2 border-red-500/60 p-5 ring-1 ring-white/5"
                >
                  <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-red-500/10 text-xs font-bold text-red-400">
                    {i + 1}
                  </div>
                  <p className="text-zinc-300 leading-relaxed">{problema}</p>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ═══════════════════════════════════════════════════════════════════
            4. SOLUCION
        ═══════════════════════════════════════════════════════════════════ */}
        {propuesta.solucion && (
          <section>
            <div className="flex items-center gap-3 mb-8">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 ring-1 ring-emerald-500/20">
                <CheckCircle className="h-5 w-5 text-emerald-400" />
              </div>
              <h2 className="text-2xl sm:text-3xl font-bold">
                Nuestra solucion
              </h2>
            </div>
            <div className="rounded-xl bg-white/[0.02] border-l-2 border-emerald-500/60 p-6 sm:p-8 ring-1 ring-white/5">
              <p className="text-zinc-300 leading-relaxed whitespace-pre-line text-base sm:text-lg">
                {propuesta.solucion}
              </p>
            </div>
          </section>
        )}

        {/* ═══════════════════════════════════════════════════════════════════
            5. METODOLOGIA (stack)
        ═══════════════════════════════════════════════════════════════════ */}
        {stackList.length > 0 && (
          <section>
            <div className="flex items-center gap-3 mb-8">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-500/10 ring-1 ring-blue-500/20">
                <Layers className="h-5 w-5 text-blue-400" />
              </div>
              <h2 className="text-2xl sm:text-3xl font-bold">
                Como trabajamos
              </h2>
            </div>
            <div className="space-y-0">
              {stackList.map((step, i) => (
                <div key={i} className="flex gap-4 group">
                  {/* Timeline line */}
                  <div className="flex flex-col items-center">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-500/20 ring-2 ring-blue-500/40 text-xs font-bold text-blue-300">
                      {i + 1}
                    </div>
                    {i < stackList.length - 1 && (
                      <div className="w-px flex-1 bg-gradient-to-b from-blue-500/30 to-transparent min-h-[2rem]" />
                    )}
                  </div>
                  <div className="pb-8 pt-1">
                    <p className="text-zinc-300 leading-relaxed">{step}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ═══════════════════════════════════════════════════════════════════
            6. CRONOGRAMA
        ═══════════════════════════════════════════════════════════════════ */}
        {cronogramaList.length > 0 && (
          <section>
            <div className="flex items-center gap-3 mb-8">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-purple-500/10 ring-1 ring-purple-500/20">
                <Clock className="h-5 w-5 text-purple-400" />
              </div>
              <h2 className="text-2xl sm:text-3xl font-bold">
                Cronograma de implementacion
              </h2>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              {cronogramaList.map((fase, i) => (
                <div
                  key={i}
                  className="group relative rounded-xl bg-white/[0.03] p-5 ring-1 ring-white/10 transition-all hover:ring-purple-500/30 hover:bg-white/[0.05]"
                >
                  <div className="flex items-start gap-3">
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-purple-500/15 text-xs font-bold text-purple-300 ring-1 ring-purple-500/20">
                      {i + 1}
                    </div>
                    <p className="text-zinc-300 leading-relaxed text-sm">
                      {fase}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ═══════════════════════════════════════════════════════════════════
            7. INVERSION — THE MOST IMPORTANT SECTION
        ═══════════════════════════════════════════════════════════════════ */}
        {(propuesta.precio_setup !== null ||
          propuesta.precio_mensual !== null) && (
          <section>
            <div className="text-center mb-10">
              <h2 className="text-3xl sm:text-4xl font-bold">Inversion</h2>
              <p className="mt-2 text-zinc-500">
                Todo lo que necesitas para transformar tu negocio
              </p>
            </div>

            <div className="grid gap-6 sm:grid-cols-2">
              {propuesta.precio_setup !== null && (
                <div className="relative group">
                  {/* Gradient border effect */}
                  <div className="absolute -inset-px rounded-2xl bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 opacity-60 group-hover:opacity-100 transition-opacity blur-[1px]" />
                  <div className="relative rounded-2xl bg-[#0e0e10] p-8 sm:p-10 text-center">
                    <p className="text-xs font-semibold uppercase tracking-widest text-indigo-400 mb-4">
                      Setup inicial
                    </p>
                    <p className="text-4xl sm:text-5xl font-extrabold tracking-tight">
                      {propuesta.precio_setup.toLocaleString('es-ES')}{' '}
                      <span className="text-2xl font-medium text-zinc-400">
                        EUR
                      </span>
                    </p>
                    <p className="mt-3 text-sm text-zinc-500">
                      Pago unico de implantacion
                    </p>
                  </div>
                </div>
              )}

              {propuesta.precio_mensual !== null && (
                <div className="relative group">
                  {/* Gradient border effect */}
                  <div className="absolute -inset-px rounded-2xl bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 opacity-60 group-hover:opacity-100 transition-opacity blur-[1px]" />
                  <div className="relative rounded-2xl bg-[#0e0e10] p-8 sm:p-10 text-center">
                    <p className="text-xs font-semibold uppercase tracking-widest text-indigo-400 mb-4">
                      Cuota mensual
                    </p>
                    <p className="text-4xl sm:text-5xl font-extrabold tracking-tight">
                      {propuesta.precio_mensual.toLocaleString('es-ES')}{' '}
                      <span className="text-2xl font-medium text-zinc-400">
                        EUR/mes
                      </span>
                    </p>
                    <p className="mt-3 text-sm text-zinc-500">
                      Mantenimiento y soporte continuo
                    </p>
                  </div>
                </div>
              )}
            </div>
          </section>
        )}

        {/* ═══════════════════════════════════════════════════════════════════
            8. ROI
        ═══════════════════════════════════════════════════════════════════ */}
        {propuesta.roi && (
          <section>
            <div className="relative overflow-hidden rounded-2xl">
              {/* Green gradient background */}
              <div className="absolute inset-0 bg-gradient-to-br from-emerald-950 via-emerald-900/50 to-[#0a0a0a]" />
              <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-emerald-500/10 via-transparent to-transparent" />

              <div className="relative p-8 sm:p-12 text-center">
                <div className="inline-flex items-center gap-2 rounded-full bg-emerald-500/10 px-4 py-1.5 text-xs font-medium text-emerald-300 ring-1 ring-emerald-500/20 mb-6">
                  <TrendingUp className="h-3.5 w-3.5" />
                  Resultado esperado
                </div>
                <p className="text-xl sm:text-2xl leading-relaxed text-emerald-100 whitespace-pre-line max-w-2xl mx-auto font-medium">
                  {propuesta.roi}
                </p>
              </div>
            </div>
          </section>
        )}

        {/* ═══════════════════════════════════════════════════════════════════
            9. CTA — CALL TO ACTION
        ═══════════════════════════════════════════════════════════════════ */}
        <section>
          <div className="relative overflow-hidden rounded-2xl">
            {/* Gradient background */}
            <div className="absolute inset-0 bg-gradient-to-br from-indigo-950 via-purple-950 to-[#0a0a0a]" />
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,_var(--tw-gradient-stops))] from-purple-500/15 via-transparent to-transparent" />

            <div className="relative p-8 sm:p-14 text-center space-y-6">
              <h2 className="text-2xl sm:text-3xl font-bold leading-tight max-w-xl mx-auto">
                {propuesta.cta_cierre ||
                  'Estas listo para transformar tu negocio con inteligencia artificial?'}
              </h2>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-2">
                <a
                  href="mailto:info@simedalavida.com?subject=Propuesta%20-%20Agendar%20llamada"
                  className="inline-flex items-center gap-2 rounded-xl bg-white text-[#0a0a0a] font-semibold px-8 py-3.5 text-sm transition-all hover:bg-zinc-100 hover:scale-[1.02] active:scale-[0.98] shadow-lg shadow-white/10"
                >
                  Agendar una llamada
                  <ArrowRight className="h-4 w-4" />
                </a>
              </div>

              <p className="text-sm text-zinc-500">
                Tienes dudas? Escribenos a{' '}
                <a
                  href="mailto:info@simedalavida.com"
                  className="text-indigo-400 hover:text-indigo-300 transition-colors underline underline-offset-4"
                >
                  info@simedalavida.com
                </a>
              </p>
            </div>
          </div>
        </section>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════
          10. FOOTER
      ═══════════════════════════════════════════════════════════════════ */}
      <footer className="border-t border-white/5 py-10 px-4">
        <div className="max-w-4xl mx-auto text-center space-y-2">
          <p className="text-sm text-zinc-500">
            Propuesta confidencial preparada por el Equipo de{' '}
            <span className="text-zinc-400 font-medium">Simedalavida</span>
          </p>
          <p className="text-xs text-zinc-600">
            &copy; 2026 Simedalavida. Todos los derechos reservados.
          </p>
        </div>
      </footer>
    </div>
  );
}
