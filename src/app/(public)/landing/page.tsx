import Link from 'next/link';
import {
  Search,
  FileText,
  Bot,
  BarChart3,
  Kanban,
  Zap,
  Radar,
  Workflow,
  ArrowRight,
  Check,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { PLANS } from '@/lib/constants';

const steps = [
  {
    number: '01',
    title: 'Prospecta',
    description:
      'La IA encuentra negocios de tu nicho y analiza sus webs en busca de oportunidades',
    icon: Search,
  },
  {
    number: '02',
    title: 'Propone',
    description:
      'Genera propuestas comerciales y scripts de venta personalizados con un click',
    icon: FileText,
  },
  {
    number: '03',
    title: 'Despliega',
    description:
      'Crea chatbots IA y automatizaciones listas para entregar al cliente',
    icon: Bot,
  },
];

const features = [
  {
    title: 'Analizador de negocios con IA',
    description:
      'Audita cualquier web en segundos. Detecta oportunidades de mejora y genera informes profesionales.',
    icon: BarChart3,
  },
  {
    title: 'Pipeline CRM visual',
    description:
      'Gestiona tu flujo de ventas con un pipeline drag & drop diseñado para agencias de IA.',
    icon: Kanban,
  },
  {
    title: 'Propuestas y scripts automáticos',
    description:
      'Genera propuestas comerciales y guiones de llamada personalizados para cada lead.',
    icon: FileText,
  },
  {
    title: 'Agentes IA desplegables',
    description:
      'Crea chatbots y asistentes IA listos para entregar a tus clientes en minutos.',
    icon: Bot,
  },
  {
    title: 'Prospección automática',
    description:
      'Encuentra negocios de tu nicho automáticamente y analiza su presencia digital.',
    icon: Radar,
  },
  {
    title: 'Automatizaciones n8n',
    description:
      'Conecta flujos de trabajo con n8n para automatizar tareas repetitivas de tu agencia.',
    icon: Workflow,
  },
];

const planKeys = ['free', 'starter', 'pro', 'agency'] as const;

const planMeta: Record<string, { highlighted?: boolean; badge?: string }> = {
  free: {},
  starter: {},
  pro: { highlighted: true, badge: 'Popular' },
  agency: {},
};

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 border-b border-white/5 bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-2">
            <img src="/icon.svg" alt="AI Agency OS" className="h-8 w-8 rounded-lg" />
            <span className="text-lg font-semibold">AI Agency OS</span>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="rounded-lg px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              Iniciar sesión
            </Link>
            <Link
              href="/register"
              className="rounded-lg bg-gradient-to-r from-purple-600 to-indigo-600 px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90"
            >
              Empezar gratis
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative overflow-hidden">
        {/* Background gradient effects */}
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute left-1/2 top-0 h-[600px] w-[800px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-purple-600/20 blur-[120px]" />
          <div className="absolute right-0 top-1/4 h-[400px] w-[400px] rounded-full bg-indigo-600/15 blur-[100px]" />
          <div className="absolute bottom-0 left-0 h-[300px] w-[300px] rounded-full bg-blue-600/10 blur-[80px]" />
        </div>

        <div className="relative mx-auto max-w-7xl px-4 pb-24 pt-20 sm:px-6 sm:pb-32 sm:pt-28 lg:px-8 lg:pt-36">
          <div className="mx-auto max-w-3xl text-center">
            <Badge variant="secondary" className="mb-6 px-3 py-1">
              Plataforma para agencias de IA
            </Badge>

            <h1 className="text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
              Tu agencia de IA en{' '}
              <span className="bg-gradient-to-r from-purple-400 via-indigo-400 to-blue-400 bg-clip-text text-transparent">
                piloto automático
              </span>
            </h1>

            <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-muted-foreground sm:text-xl">
              Prospecta, analiza, propone y cierra clientes mientras tú duermes.
              La plataforma que hace el trabajo de una agencia de IA completa.
            </p>

            <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Link
                href="/register"
                className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-purple-600 to-indigo-600 px-6 py-3 text-sm font-medium text-white transition-all hover:opacity-90 hover:shadow-lg hover:shadow-purple-600/25"
              >
                Empezar gratis
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/login"
                className="inline-flex items-center gap-2 rounded-lg border border-white/10 px-6 py-3 text-sm font-medium text-muted-foreground transition-colors hover:border-white/20 hover:text-foreground"
              >
                Ver demo
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="relative border-t border-white/5 bg-muted/30">
        <div className="mx-auto max-w-7xl px-4 py-24 sm:px-6 sm:py-32 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              Cómo funciona
            </h2>
            <p className="mt-4 text-lg text-muted-foreground">
              Tres pasos para convertir tu idea en una agencia de IA rentable
            </p>
          </div>

          <div className="mx-auto mt-16 grid max-w-5xl gap-8 md:grid-cols-3">
            {steps.map((step) => (
              <div key={step.number} className="relative text-center">
                <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-purple-500/20 to-indigo-500/20 ring-1 ring-purple-500/20">
                  <step.icon className="h-7 w-7 text-purple-400" />
                </div>
                <span className="mb-2 block text-xs font-semibold uppercase tracking-widest text-purple-400">
                  Paso {step.number}
                </span>
                <h3 className="text-xl font-semibold">{step.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  {step.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features grid */}
      <section className="relative">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute right-1/4 top-1/2 h-[500px] w-[500px] -translate-y-1/2 rounded-full bg-indigo-600/10 blur-[120px]" />
        </div>

        <div className="relative mx-auto max-w-7xl px-4 py-24 sm:px-6 sm:py-32 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              Todo lo que necesitas para escalar
            </h2>
            <p className="mt-4 text-lg text-muted-foreground">
              Herramientas diseñadas para que una sola persona haga el trabajo de un equipo completo
            </p>
          </div>

          <div className="mx-auto mt-16 grid max-w-6xl gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((feature) => (
              <Card
                key={feature.title}
                className="border-white/5 bg-card/50 transition-colors hover:border-purple-500/20 hover:bg-card/80"
              >
                <CardHeader>
                  <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-purple-500/20 to-indigo-500/20 ring-1 ring-purple-500/20">
                    <feature.icon className="h-5 w-5 text-purple-400" />
                  </div>
                  <CardTitle>{feature.title}</CardTitle>
                  <CardDescription>{feature.description}</CardDescription>
                </CardHeader>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="relative border-t border-white/5 bg-muted/30">
        <div className="mx-auto max-w-7xl px-4 py-24 sm:px-6 sm:py-32 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              Precios simples y transparentes
            </h2>
            <p className="mt-4 text-lg text-muted-foreground">
              Empieza gratis y escala cuando estés listo
            </p>
          </div>

          <div className="mx-auto mt-16 grid max-w-6xl gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {planKeys.map((key) => {
              const plan = PLANS[key];
              const meta = planMeta[key];
              const isHighlighted = meta.highlighted;

              return (
                <Card
                  key={key}
                  className={`relative flex flex-col border-white/5 bg-card/50 ${
                    isHighlighted
                      ? 'ring-2 ring-purple-500/50 shadow-lg shadow-purple-500/10'
                      : ''
                  }`}
                >
                  {meta.badge && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                      <Badge className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white">
                        {meta.badge}
                      </Badge>
                    </div>
                  )}

                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg">{plan.nombre}</CardTitle>
                    <div className="mt-2 flex items-baseline gap-1">
                      <span className="text-4xl font-bold">
                        {plan.precio_mensual === 0 ? 'Gratis' : `${plan.precio_mensual}\u20AC`}
                      </span>
                      {plan.precio_mensual > 0 && (
                        <span className="text-sm text-muted-foreground">/mes</span>
                      )}
                    </div>
                  </CardHeader>

                  <CardContent className="flex flex-1 flex-col">
                    <ul className="mb-6 flex-1 space-y-2.5">
                      {plan.features.map((feature) => (
                        <li key={feature} className="flex items-start gap-2 text-sm text-muted-foreground">
                          <Check className="mt-0.5 h-4 w-4 shrink-0 text-purple-400" />
                          <span>{feature}</span>
                        </li>
                      ))}
                    </ul>

                    <Link
                      href="/register"
                      className={`inline-flex w-full items-center justify-center rounded-lg px-4 py-2.5 text-sm font-medium transition-all ${
                        isHighlighted
                          ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white hover:opacity-90 hover:shadow-lg hover:shadow-purple-600/25'
                          : 'border border-white/10 text-muted-foreground hover:border-white/20 hover:text-foreground'
                      }`}
                    >
                      Empezar gratis
                    </Link>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute left-1/2 top-1/2 h-[600px] w-[600px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-purple-600/15 blur-[120px]" />
        </div>

        <div className="relative mx-auto max-w-7xl px-4 py-24 sm:px-6 sm:py-32 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              ¿Listo para escalar tu agencia?
            </h2>
            <p className="mt-4 text-lg text-muted-foreground">
              Empieza gratis. Sin tarjeta. Sin compromiso.
            </p>
            <div className="mt-10">
              <Link
                href="/register"
                className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-purple-600 to-indigo-600 px-8 py-3.5 text-sm font-medium text-white transition-all hover:opacity-90 hover:shadow-lg hover:shadow-purple-600/25"
              >
                Empezar gratis
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/5">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-4 py-8 sm:flex-row sm:px-6 lg:px-8">
          <p className="text-sm text-muted-foreground">
            &copy; 2026 AI Agency OS by Simedalavida
          </p>
          <div className="flex gap-6">
            <Link href="/legal/terminos" className="text-sm text-muted-foreground transition-colors hover:text-foreground">
              Términos
            </Link>
            <Link href="/legal/privacidad" className="text-sm text-muted-foreground transition-colors hover:text-foreground">
              Privacidad
            </Link>
            <Link href="#" className="text-sm text-muted-foreground transition-colors hover:text-foreground">
              Contacto
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
