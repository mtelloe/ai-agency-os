import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function TerminosPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6 lg:px-8">
        <Link
          href="/"
          className="mb-8 inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Volver al inicio
        </Link>

        <div className="mb-10">
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Términos y Condiciones de Uso
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Última actualización: marzo 2026
          </p>
        </div>

        <div className="space-y-6">
          {/* 1. Descripción del servicio */}
          <Card className="border-white/5 bg-card/50">
            <CardHeader>
              <CardTitle className="text-lg">1. Descripción del servicio</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm leading-relaxed text-muted-foreground">
              <p>
                AI Agency OS es una plataforma SaaS (Software as a Service) desarrollada por
                Simedalavida (Maria Tello), con domicilio en España, diseñada para ayudar a
                profesionales y agencias a gestionar, automatizar y escalar servicios de
                inteligencia artificial.
              </p>
              <p>
                La plataforma ofrece herramientas de prospección, análisis de negocios, generación
                de propuestas comerciales, despliegue de agentes IA, gestión de pipeline CRM y
                automatizaciones, entre otras funcionalidades.
              </p>
              <p>
                Al registrarte y utilizar AI Agency OS, aceptas estos Términos y Condiciones en su
                totalidad. Si no estás de acuerdo con alguna parte, no debes utilizar el servicio.
              </p>
            </CardContent>
          </Card>

          {/* 2. Registro y cuentas */}
          <Card className="border-white/5 bg-card/50">
            <CardHeader>
              <CardTitle className="text-lg">2. Registro y cuentas</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm leading-relaxed text-muted-foreground">
              <p>
                Para acceder a AI Agency OS necesitas crear una cuenta proporcionando información
                veraz y actualizada. Eres responsable de mantener la confidencialidad de tus
                credenciales de acceso y de todas las actividades que se realicen bajo tu cuenta.
              </p>
              <p>
                Debes notificarnos de inmediato cualquier uso no autorizado de tu cuenta. Nos
                reservamos el derecho de suspender o eliminar cuentas que incumplan estos términos o
                que muestren actividad sospechosa.
              </p>
              <p>
                Cada usuario es responsable de la información que introduce en la plataforma,
                incluyendo los datos de sus clientes y leads. Debes tener base legal suficiente para
                tratar dichos datos.
              </p>
            </CardContent>
          </Card>

          {/* 3. Planes y pagos */}
          <Card className="border-white/5 bg-card/50">
            <CardHeader>
              <CardTitle className="text-lg">3. Planes y pagos</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm leading-relaxed text-muted-foreground">
              <p>
                AI Agency OS ofrece distintos planes de suscripción, incluyendo un plan gratuito con
                funcionalidades limitadas y planes de pago con características avanzadas. Los precios
                vigentes se muestran en la página de precios de la plataforma.
              </p>
              <p>
                Los pagos se procesan de forma segura a través de Stripe. Al suscribirte a un plan
                de pago, autorizas el cobro recurrente mediante el método de pago que hayas
                proporcionado. Las suscripciones se renuevan automáticamente al final de cada
                periodo de facturación (mensual o anual, según tu elección).
              </p>
              <p>
                Puedes cancelar tu suscripción en cualquier momento desde la configuración de tu
                cuenta. La cancelación será efectiva al final del periodo de facturación en curso.
                No se realizan reembolsos proporcionales por periodos parciales, salvo que la
                legislación aplicable lo exija.
              </p>
              <p>
                Nos reservamos el derecho de modificar los precios de los planes con un preaviso
                mínimo de 30 días. Los cambios de precio no afectarán al periodo de facturación en
                curso.
              </p>
            </CardContent>
          </Card>

          {/* 4. Uso aceptable */}
          <Card className="border-white/5 bg-card/50">
            <CardHeader>
              <CardTitle className="text-lg">4. Uso aceptable</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm leading-relaxed text-muted-foreground">
              <p>
                Te comprometes a utilizar AI Agency OS de forma responsable y legal. Queda
                expresamente prohibido:
              </p>
              <ul className="list-disc space-y-2 pl-5">
                <li>
                  Utilizar la plataforma para enviar spam, comunicaciones masivas no solicitadas o
                  cualquier forma de correo no deseado.
                </li>
                <li>
                  Realizar actividades ilegales, fraudulentas o que infrinjan derechos de terceros.
                </li>
                <li>
                  Intentar acceder a cuentas de otros usuarios o a sistemas internos de la
                  plataforma sin autorización.
                </li>
                <li>
                  Utilizar los agentes IA o las herramientas de automatización para generar contenido
                  engañoso, difamatorio, discriminatorio o que incite al odio.
                </li>
                <li>
                  Sobrecargar intencionadamente los servidores o realizar scraping no autorizado de
                  la plataforma.
                </li>
                <li>
                  Revender o redistribuir el acceso a la plataforma sin autorización previa por
                  escrito.
                </li>
              </ul>
              <p>
                El incumplimiento de estas normas puede resultar en la suspensión o cancelación
                inmediata de tu cuenta, sin derecho a reembolso.
              </p>
            </CardContent>
          </Card>

          {/* 5. Propiedad intelectual */}
          <Card className="border-white/5 bg-card/50">
            <CardHeader>
              <CardTitle className="text-lg">5. Propiedad intelectual</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm leading-relaxed text-muted-foreground">
              <p>
                AI Agency OS, incluyendo su código, diseño, logotipos, textos y documentación, es
                propiedad de Simedalavida y está protegido por las leyes de propiedad intelectual
                aplicables en España y la Unión Europea.
              </p>
              <p>
                El contenido que generes utilizando la plataforma (propuestas, scripts, análisis,
                configuraciones de agentes) te pertenece. Nos concedes una licencia limitada para
                procesar dicho contenido con el fin de prestarte el servicio.
              </p>
              <p>
                No adquieres ningún derecho de propiedad sobre la plataforma, sus algoritmos o su
                tecnología subyacente por el hecho de utilizar el servicio.
              </p>
            </CardContent>
          </Card>

          {/* 6. Limitación de responsabilidad */}
          <Card className="border-white/5 bg-card/50">
            <CardHeader>
              <CardTitle className="text-lg">6. Limitación de responsabilidad</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm leading-relaxed text-muted-foreground">
              <p>
                AI Agency OS se proporciona &quot;tal cual&quot; y &quot;según disponibilidad&quot;.
                Nos esforzamos por mantener el servicio operativo y fiable, pero no garantizamos que
                esté libre de errores o interrupciones.
              </p>
              <p>
                El contenido generado por la inteligencia artificial (propuestas, análisis, scripts)
                es orientativo y no constituye asesoramiento profesional. Eres responsable de
                revisar y validar cualquier contenido antes de utilizarlo con tus clientes.
              </p>
              <p>
                En la máxima medida permitida por la legislación española, Simedalavida no será
                responsable de daños indirectos, incidentales, especiales o consecuentes derivados
                del uso de la plataforma. Nuestra responsabilidad total se limita al importe que
                hayas pagado por el servicio en los 12 meses anteriores al evento que origine la
                reclamación.
              </p>
            </CardContent>
          </Card>

          {/* 7. Protección de datos */}
          <Card className="border-white/5 bg-card/50">
            <CardHeader>
              <CardTitle className="text-lg">7. Protección de datos</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm leading-relaxed text-muted-foreground">
              <p>
                El tratamiento de tus datos personales se rige por nuestra{' '}
                <Link
                  href="/legal/privacidad"
                  className="text-purple-400 underline underline-offset-2 hover:text-purple-300"
                >
                  Política de Privacidad
                </Link>
                , que forma parte integrante de estos Términos y Condiciones.
              </p>
              <p>
                Cumplimos con el Reglamento General de Protección de Datos (RGPD) y la Ley Orgánica
                de Protección de Datos y Garantía de los Derechos Digitales (LOPDGDD). Tus datos se
                almacenan en servidores ubicados en la Unión Europea o con las garantías adecuadas
                conforme al RGPD.
              </p>
              <p>
                Como usuario de AI Agency OS, eres responsable del tratamiento de los datos
                personales de tus propios clientes que introduzcas en la plataforma. Debes asegurarte
                de contar con la base legal adecuada para dicho tratamiento y de informar a tus
                clientes según exige la normativa vigente.
              </p>
            </CardContent>
          </Card>

          {/* 8. Modificaciones de los términos */}
          <Card className="border-white/5 bg-card/50">
            <CardHeader>
              <CardTitle className="text-lg">8. Modificaciones de los términos</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm leading-relaxed text-muted-foreground">
              <p>
                Podemos actualizar estos Términos y Condiciones ocasionalmente para reflejar cambios
                en el servicio, en la legislación aplicable o por motivos operativos. Te
                notificaremos de cualquier cambio significativo por correo electrónico o mediante un
                aviso visible en la plataforma con al menos 15 días de antelación.
              </p>
              <p>
                El uso continuado de AI Agency OS después de la entrada en vigor de los cambios
                constituye la aceptación de los nuevos términos. Si no estás de acuerdo con las
                modificaciones, puedes cancelar tu cuenta antes de que entren en vigor.
              </p>
            </CardContent>
          </Card>

          {/* 9. Ley aplicable y jurisdicción */}
          <Card className="border-white/5 bg-card/50">
            <CardHeader>
              <CardTitle className="text-lg">9. Ley aplicable y jurisdicción</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm leading-relaxed text-muted-foreground">
              <p>
                Estos Términos y Condiciones se rigen por la legislación española. Para la
                resolución de cualquier controversia derivada de estos términos o del uso de la
                plataforma, las partes se someten a los juzgados y tribunales competentes de España.
              </p>
              <p>
                Si alguna disposición de estos términos se considera nula o inaplicable, las demás
                disposiciones seguirán siendo plenamente válidas y aplicables.
              </p>
              <p>
                Conforme a la normativa europea, te informamos de la existencia de la plataforma de
                resolución de litigios en línea de la Comisión Europea, accesible en{' '}
                <a
                  href="https://ec.europa.eu/consumers/odr"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-purple-400 underline underline-offset-2 hover:text-purple-300"
                >
                  https://ec.europa.eu/consumers/odr
                </a>
                .
              </p>
            </CardContent>
          </Card>

          {/* 10. Contacto */}
          <Card className="border-white/5 bg-card/50">
            <CardHeader>
              <CardTitle className="text-lg">10. Contacto</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm leading-relaxed text-muted-foreground">
              <p>
                Si tienes alguna duda sobre estos Términos y Condiciones, puedes contactarnos en:
              </p>
              <ul className="space-y-1">
                <li>
                  <strong className="text-foreground">Empresa:</strong> Simedalavida (Maria Tello)
                </li>
                <li>
                  <strong className="text-foreground">Email:</strong>{' '}
                  <a
                    href="mailto:info@simedalavida.com"
                    className="text-purple-400 underline underline-offset-2 hover:text-purple-300"
                  >
                    info@simedalavida.com
                  </a>
                </li>
                <li>
                  <strong className="text-foreground">País:</strong> España
                </li>
              </ul>
            </CardContent>
          </Card>
        </div>

        <div className="mt-12 text-center">
          <Link
            href="/legal/privacidad"
            className="text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            Ver Política de Privacidad →
          </Link>
        </div>
      </div>
    </div>
  );
}
