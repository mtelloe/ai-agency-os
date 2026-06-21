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
  pro: { highlighted: true, badge: 'Más popular' },
  agency: {},
};

// Shared glass card style
const glassCard: React.CSSProperties = {
  background: 'rgba(255,255,255,0.05)',
  border: '1px solid rgba(255,255,255,0.08)',
  backdropFilter: 'blur(20px)',
  WebkitBackdropFilter: 'blur(20px)',
  borderRadius: '16px',
  padding: '24px',
};

const glassCardHighlighted: React.CSSProperties = {
  background: 'rgba(199,125,255,0.10)',
  border: '1px solid rgba(199,125,255,0.3)',
  backdropFilter: 'blur(20px)',
  WebkitBackdropFilter: 'blur(20px)',
  borderRadius: '16px',
  padding: '24px',
  boxShadow: '0 0 48px rgba(199,125,255,0.15)',
};

const iconCircle: React.CSSProperties = {
  background: 'rgba(199,125,255,0.15)',
  borderRadius: '12px',
  width: '44px',
  height: '44px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  flexShrink: 0,
};

const gradientTextStyle: React.CSSProperties = {
  background: 'linear-gradient(135deg, #C77DFF 0%, #FF6FA3 100%)',
  WebkitBackgroundClip: 'text',
  WebkitTextFillColor: 'transparent',
  backgroundClip: 'text',
};

export default function LandingPage() {
  return (
    <div className="min-h-screen text-white" style={{ fontFamily: 'var(--font-body, Inter, sans-serif)' }}>

      {/* Sticky Nav */}
      <nav
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 50,
          background: 'rgba(8,6,15,0.8)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          borderBottom: '1px solid rgba(255,255,255,0.07)',
        }}
      >
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-2">
            <span
              style={{
                fontFamily: 'var(--font-display, Syne, sans-serif)',
                fontWeight: 700,
                fontSize: '1.25rem',
              }}
            >
              <span style={gradientTextStyle}>AI</span>
              <span style={{ color: 'white' }}> Agency OS</span>
            </span>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/login"
              style={{
                color: 'rgba(255,255,255,0.6)',
                fontSize: '0.875rem',
                fontWeight: 500,
                padding: '8px 16px',
                borderRadius: '8px',
                transition: 'color 0.2s',
              }}
              className="hover:text-white"
            >
              Iniciar sesión
            </Link>
            <Link
              href="/register"
              style={{
                background: 'linear-gradient(135deg, #C77DFF 0%, #FF6FA3 100%)',
                color: 'white',
                fontSize: '0.875rem',
                fontWeight: 600,
                padding: '8px 20px',
                borderRadius: '10px',
                boxShadow: '0 0 20px rgba(199,125,255,0.3)',
                transition: 'opacity 0.2s',
              }}
              className="hover:opacity-90"
            >
              Empezar gratis
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative overflow-hidden">
        {/* Background glow blobs */}
        <div className="pointer-events-none absolute inset-0">
          <div
            className="absolute left-1/2 top-0 -translate-x-1/2 -translate-y-1/2 rounded-full"
            style={{ width: '800px', height: '600px', background: 'rgba(199,125,255,0.18)', filter: 'blur(120px)' }}
          />
          <div
            className="absolute right-0 top-1/4 rounded-full"
            style={{ width: '400px', height: '400px', background: 'rgba(255,111,163,0.10)', filter: 'blur(100px)' }}
          />
        </div>

        <div className="relative mx-auto max-w-7xl px-4 pb-24 pt-20 sm:px-6 sm:pb-32 sm:pt-28 lg:px-8 lg:pt-36">
          <div className="mx-auto max-w-3xl text-center">

            {/* Eyebrow */}
            <span
              style={{
                display: 'inline-block',
                color: '#C77DFF',
                fontFamily: 'Inter, sans-serif',
                fontSize: '0.75rem',
                fontWeight: 600,
                letterSpacing: '0.12em',
                textTransform: 'uppercase',
                marginBottom: '24px',
              }}
            >
              Plataforma para agencias de IA
            </span>

            {/* Headline */}
            <h1
              style={{
                fontFamily: 'var(--font-display, Syne, sans-serif)',
                fontWeight: 800,
                fontSize: 'clamp(36px, 5.5vw, 72px)',
                color: 'white',
                letterSpacing: '-0.04em',
                lineHeight: 1.1,
                marginBottom: '24px',
              }}
            >
              Tu agencia de IA en{' '}
              <span style={gradientTextStyle}>piloto automático</span>
            </h1>

            {/* Subheadline */}
            <p
              style={{
                fontFamily: 'Inter, sans-serif',
                fontWeight: 400,
                fontSize: '1.125rem',
                color: 'rgba(255,255,255,0.6)',
                maxWidth: '560px',
                margin: '0 auto 40px',
                lineHeight: 1.7,
              }}
            >
              Prospecta, analiza, propone y cierra clientes mientras tú duermes.
              La plataforma que hace el trabajo de una agencia de IA completa.
            </p>

            {/* CTAs */}
            <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Link
                href="/register"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  background: 'linear-gradient(135deg, #C77DFF 0%, #FF6FA3 100%)',
                  color: 'white',
                  fontWeight: 600,
                  fontSize: '0.9375rem',
                  padding: '14px 28px',
                  borderRadius: '12px',
                  boxShadow: '0 0 40px rgba(199,125,255,0.35)',
                  transition: 'opacity 0.2s',
                }}
                className="hover:opacity-90"
              >
                Empezar gratis
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/login"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  background: 'rgba(255,255,255,0.06)',
                  border: '1px solid rgba(255,255,255,0.15)',
                  color: 'rgba(255,255,255,0.8)',
                  fontWeight: 500,
                  fontSize: '0.9375rem',
                  padding: '14px 28px',
                  borderRadius: '12px',
                  backdropFilter: 'blur(8px)',
                  transition: 'border-color 0.2s, color 0.2s',
                }}
                className="hover:border-white/30 hover:text-white"
              >
                Ver demo
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* How it works — Steps */}
      <section
        style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}
        className="relative"
      >
        <div className="mx-auto max-w-7xl px-4 py-24 sm:px-6 sm:py-32 lg:px-8">
          <div className="mx-auto max-w-2xl text-center" style={{ marginBottom: '64px' }}>
            <h2
              style={{
                fontFamily: 'var(--font-display, Syne, sans-serif)',
                fontWeight: 700,
                fontSize: 'clamp(28px, 3.5vw, 42px)',
                color: 'white',
                letterSpacing: '-0.02em',
                marginBottom: '16px',
              }}
            >
              Cómo funciona
            </h2>
            <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '1.0625rem' }}>
              Tres pasos para convertir tu idea en una agencia de IA rentable
            </p>
          </div>

          <div className="mx-auto grid max-w-5xl gap-6 md:grid-cols-3">
            {steps.map((step) => (
              <div key={step.number} style={glassCard}>
                {/* Icon + step number row */}
                <div className="flex items-start justify-between" style={{ marginBottom: '20px' }}>
                  <div style={iconCircle}>
                    <step.icon style={{ width: '20px', height: '20px', color: '#C77DFF' }} />
                  </div>
                  <span
                    style={{
                      fontFamily: 'var(--font-display, Syne, sans-serif)',
                      fontWeight: 700,
                      fontSize: '2rem',
                      color: 'rgba(199,125,255,0.5)',
                      lineHeight: 1,
                    }}
                  >
                    {step.number}
                  </span>
                </div>

                <h3
                  style={{
                    fontFamily: 'var(--font-display, Syne, sans-serif)',
                    fontWeight: 700,
                    fontSize: '1.125rem',
                    color: 'white',
                    marginBottom: '8px',
                  }}
                >
                  {step.title}
                </h3>
                <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.9375rem', lineHeight: 1.65 }}>
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
          <div
            className="absolute right-1/4 top-1/2 -translate-y-1/2 rounded-full"
            style={{ width: '500px', height: '500px', background: 'rgba(199,125,255,0.08)', filter: 'blur(120px)' }}
          />
        </div>

        <div className="relative mx-auto max-w-7xl px-4 py-24 sm:px-6 sm:py-32 lg:px-8">
          <div className="mx-auto max-w-2xl text-center" style={{ marginBottom: '64px' }}>
            <h2
              style={{
                fontFamily: 'var(--font-display, Syne, sans-serif)',
                fontWeight: 700,
                fontSize: 'clamp(28px, 3.5vw, 42px)',
                color: 'white',
                letterSpacing: '-0.02em',
                marginBottom: '16px',
              }}
            >
              Todo lo que necesitas para{' '}
              <span style={gradientTextStyle}>escalar</span>
            </h2>
            <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '1.0625rem' }}>
              Herramientas diseñadas para que una sola persona haga el trabajo de un equipo completo
            </p>
          </div>

          <div className="mx-auto grid max-w-6xl gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((feature) => (
              <div
                key={feature.title}
                style={glassCard}
                className="transition-all duration-200 hover:border-[rgba(199,125,255,0.2)]"
              >
                <div style={{ ...iconCircle, background: 'rgba(199,125,255,0.12)', marginBottom: '16px' }}>
                  <feature.icon style={{ width: '20px', height: '20px', color: '#C77DFF' }} />
                </div>
                <h3
                  style={{
                    fontFamily: 'var(--font-display, Syne, sans-serif)',
                    fontWeight: 600,
                    fontSize: '1rem',
                    color: 'white',
                    marginBottom: '8px',
                  }}
                >
                  {feature.title}
                </h3>
                <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.9rem', lineHeight: 1.65 }}>
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section
        style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}
        className="relative"
      >
        <div className="mx-auto max-w-7xl px-4 py-24 sm:px-6 sm:py-32 lg:px-8">
          <div className="mx-auto max-w-2xl text-center" style={{ marginBottom: '64px' }}>
            <h2
              style={{
                fontFamily: 'var(--font-display, Syne, sans-serif)',
                fontWeight: 700,
                fontSize: 'clamp(28px, 3.5vw, 42px)',
                color: 'white',
                letterSpacing: '-0.02em',
                marginBottom: '16px',
              }}
            >
              Precios simples y transparentes
            </h2>
            <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '1.0625rem' }}>
              Empieza gratis y escala cuando estés listo
            </p>
          </div>

          <div className="mx-auto grid max-w-6xl gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {planKeys.map((key) => {
              const plan = PLANS[key];
              const meta = planMeta[key];
              const isHighlighted = meta.highlighted;
              const cardStyle = isHighlighted ? glassCardHighlighted : glassCard;

              return (
                <div
                  key={key}
                  style={{ ...cardStyle, position: 'relative', display: 'flex', flexDirection: 'column' }}
                >
                  {/* Badge */}
                  {meta.badge && (
                    <div
                      style={{
                        position: 'absolute',
                        top: '-14px',
                        left: '50%',
                        transform: 'translateX(-50%)',
                        background: 'linear-gradient(135deg, #C77DFF 0%, #FF6FA3 100%)',
                        color: 'white',
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        padding: '4px 14px',
                        borderRadius: '999px',
                        whiteSpace: 'nowrap',
                        letterSpacing: '0.03em',
                      }}
                    >
                      {meta.badge}
                    </div>
                  )}

                  {/* Plan name */}
                  <div style={{ marginBottom: '8px' }}>
                    <span
                      style={{
                        fontFamily: 'var(--font-display, Syne, sans-serif)',
                        fontWeight: 700,
                        fontSize: '1.0625rem',
                        color: 'white',
                      }}
                    >
                      {plan.nombre}
                    </span>
                  </div>

                  {/* Price */}
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px', marginBottom: '20px' }}>
                    <span
                      style={{
                        fontFamily: 'var(--font-display, Syne, sans-serif)',
                        fontWeight: 800,
                        fontSize: '2.5rem',
                        color: 'white',
                        lineHeight: 1,
                      }}
                    >
                      {plan.precio_mensual === 0 ? 'Gratis' : `${plan.precio_mensual}€`}
                    </span>
                    {plan.precio_mensual > 0 && (
                      <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.875rem' }}>/mes</span>
                    )}
                  </div>

                  {/* Feature list */}
                  <ul style={{ flex: 1, marginBottom: '20px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {plan.features.map((feature) => (
                      <li
                        key={feature}
                        style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', fontSize: '0.875rem', color: 'rgba(255,255,255,0.7)' }}
                      >
                        <Check style={{ width: '14px', height: '14px', color: '#C77DFF', flexShrink: 0, marginTop: '3px' }} />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>

                  {/* CTA */}
                  <Link
                    href="/register"
                    style={
                      isHighlighted
                        ? {
                            display: 'block',
                            textAlign: 'center',
                            background: 'linear-gradient(135deg, #C77DFF 0%, #FF6FA3 100%)',
                            color: 'white',
                            fontWeight: 600,
                            fontSize: '0.9rem',
                            padding: '10px 16px',
                            borderRadius: '10px',
                            boxShadow: '0 0 24px rgba(199,125,255,0.3)',
                            transition: 'opacity 0.2s',
                          }
                        : {
                            display: 'block',
                            textAlign: 'center',
                            background: 'rgba(255,255,255,0.05)',
                            border: '1px solid rgba(255,255,255,0.12)',
                            color: 'rgba(255,255,255,0.7)',
                            fontWeight: 500,
                            fontSize: '0.9rem',
                            padding: '10px 16px',
                            borderRadius: '10px',
                            transition: 'border-color 0.2s, color 0.2s',
                          }
                    }
                    className="hover:opacity-90"
                  >
                    Empezar gratis
                  </Link>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Final CTA section */}
      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0">
          <div
            className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full"
            style={{ width: '600px', height: '600px', background: 'rgba(199,125,255,0.12)', filter: 'blur(120px)' }}
          />
        </div>

        <div className="relative mx-auto max-w-7xl px-4 py-24 sm:px-6 sm:py-32 lg:px-8">
          <div
            className="mx-auto max-w-2xl text-center"
            style={{
              background: 'rgba(199,125,255,0.04)',
              border: '1px solid rgba(199,125,255,0.18)',
              borderRadius: '24px',
              padding: 'clamp(40px, 6vw, 80px) clamp(24px, 4vw, 60px)',
            }}
          >
            <h2
              style={{
                fontFamily: 'var(--font-display, Syne, sans-serif)',
                fontWeight: 800,
                fontSize: 'clamp(28px, 3.5vw, 48px)',
                color: 'white',
                letterSpacing: '-0.03em',
                marginBottom: '16px',
              }}
            >
              ¿Listo para{' '}
              <span style={gradientTextStyle}>escalar tu agencia</span>?
            </h2>
            <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '1.0625rem', marginBottom: '36px' }}>
              Empieza gratis. Sin tarjeta. Sin compromiso.
            </p>
            <Link
              href="/register"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                background: 'linear-gradient(135deg, #C77DFF 0%, #FF6FA3 100%)',
                color: 'white',
                fontWeight: 700,
                fontSize: '1rem',
                padding: '16px 36px',
                borderRadius: '12px',
                boxShadow: '0 0 40px rgba(199,125,255,0.4)',
                transition: 'opacity 0.2s',
              }}
              className="hover:opacity-90"
            >
              Empezar gratis
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-4 py-8 sm:flex-row sm:px-6 lg:px-8">
          <p style={{ fontSize: '0.875rem', color: 'rgba(255,255,255,0.4)' }}>
            &copy; 2026 AI Agency OS by Simedalavida
          </p>
          <div className="flex gap-6">
            <Link
              href="/legal/terminos"
              style={{ fontSize: '0.875rem', color: 'rgba(255,255,255,0.4)', transition: 'color 0.2s' }}
              className="hover:text-white"
            >
              Términos
            </Link>
            <Link
              href="/legal/privacidad"
              style={{ fontSize: '0.875rem', color: 'rgba(255,255,255,0.4)', transition: 'color 0.2s' }}
              className="hover:text-white"
            >
              Privacidad
            </Link>
            <Link
              href="#"
              style={{ fontSize: '0.875rem', color: 'rgba(255,255,255,0.4)', transition: 'color 0.2s' }}
              className="hover:text-white"
            >
              Contacto
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
