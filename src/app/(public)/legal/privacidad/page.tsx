import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function PrivacidadPage() {
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
            Política de Privacidad
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Última actualización: marzo 2026
          </p>
        </div>

        <div className="space-y-6">
          {/* 1. Responsable del tratamiento */}
          <Card className="border-white/5 bg-card/50">
            <CardHeader>
              <CardTitle className="text-lg">1. Responsable del tratamiento</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm leading-relaxed text-muted-foreground">
              <p>El responsable del tratamiento de tus datos personales es:</p>
              <ul className="space-y-1">
                <li>
                  <strong className="text-foreground">Nombre:</strong> Simedalavida (Maria Tello)
                </li>
                <li>
                  <strong className="text-foreground">País:</strong> España
                </li>
                <li>
                  <strong className="text-foreground">Email de contacto:</strong>{' '}
                  <a
                    href="mailto:info@simedalavida.com"
                    className="text-purple-400 underline underline-offset-2 hover:text-purple-300"
                  >
                    info@simedalavida.com
                  </a>
                </li>
              </ul>
              <p>
                Puedes dirigirte a nosotros en cualquier momento para consultas relacionadas con la
                protección de tus datos personales.
              </p>
            </CardContent>
          </Card>

          {/* 2. Datos que recogemos */}
          <Card className="border-white/5 bg-card/50">
            <CardHeader>
              <CardTitle className="text-lg">2. Datos que recogemos</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm leading-relaxed text-muted-foreground">
              <p>Recogemos las siguientes categorías de datos personales:</p>

              <div className="space-y-4">
                <div>
                  <p className="font-medium text-foreground">Datos de registro</p>
                  <p>
                    Nombre, dirección de correo electrónico y contraseña (almacenada de forma
                    cifrada). Estos datos son necesarios para crear y gestionar tu cuenta.
                  </p>
                </div>

                <div>
                  <p className="font-medium text-foreground">Datos de uso</p>
                  <p>
                    Información sobre cómo utilizas la plataforma: funcionalidades que usas,
                    frecuencia de acceso, créditos consumidos, contenido generado (propuestas,
                    análisis, scripts) y configuraciones de tu workspace.
                  </p>
                </div>

                <div>
                  <p className="font-medium text-foreground">Datos de pago</p>
                  <p>
                    Los datos de pago (número de tarjeta, fecha de caducidad) son procesados
                    directamente por Stripe y nunca pasan por nuestros servidores. Nosotros solo
                    almacenamos el identificador de cliente de Stripe, el plan contratado y el
                    historial de transacciones (importes y fechas).
                  </p>
                </div>

                <div>
                  <p className="font-medium text-foreground">Datos técnicos</p>
                  <p>
                    Dirección IP, tipo de navegador, sistema operativo y datos de sesión recopilados
                    automáticamente para garantizar la seguridad y el funcionamiento del servicio.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 3. Finalidad del tratamiento */}
          <Card className="border-white/5 bg-card/50">
            <CardHeader>
              <CardTitle className="text-lg">3. Finalidad del tratamiento</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm leading-relaxed text-muted-foreground">
              <p>Tratamos tus datos personales para las siguientes finalidades:</p>
              <ul className="list-disc space-y-2 pl-5">
                <li>
                  <strong className="text-foreground">Prestación del servicio:</strong> gestionar tu
                  cuenta, procesar tus solicitudes, generar contenido con IA y proporcionarte acceso
                  a las funcionalidades de la plataforma.
                </li>
                <li>
                  <strong className="text-foreground">Gestión de pagos:</strong> procesar
                  suscripciones, cobros y facturación a través de Stripe.
                </li>
                <li>
                  <strong className="text-foreground">Comunicaciones del servicio:</strong> enviarte
                  notificaciones relacionadas con tu cuenta, cambios en el servicio, actualizaciones
                  de seguridad y avisos legales a través de Resend.
                </li>
                <li>
                  <strong className="text-foreground">Mejora del servicio:</strong> analizar el uso
                  de la plataforma de forma agregada para mejorar funcionalidades y experiencia de
                  usuario.
                </li>
                <li>
                  <strong className="text-foreground">Seguridad:</strong> detectar y prevenir
                  actividades fraudulentas, abusos o accesos no autorizados.
                </li>
                <li>
                  <strong className="text-foreground">Cumplimiento legal:</strong> atender
                  obligaciones legales, fiscales y regulatorias aplicables.
                </li>
              </ul>
            </CardContent>
          </Card>

          {/* 4. Base legal */}
          <Card className="border-white/5 bg-card/50">
            <CardHeader>
              <CardTitle className="text-lg">4. Base legal del tratamiento</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm leading-relaxed text-muted-foreground">
              <p>
                El tratamiento de tus datos se fundamenta en las siguientes bases legales conforme al
                artículo 6 del RGPD:
              </p>
              <ul className="list-disc space-y-2 pl-5">
                <li>
                  <strong className="text-foreground">Ejecución de un contrato (art. 6.1.b):</strong>{' '}
                  el tratamiento es necesario para la prestación del servicio que has contratado al
                  registrarte y suscribirte a un plan.
                </li>
                <li>
                  <strong className="text-foreground">Consentimiento (art. 6.1.a):</strong> para el
                  envío de comunicaciones comerciales o el uso de cookies no esenciales, cuando
                  corresponda.
                </li>
                <li>
                  <strong className="text-foreground">Interés legítimo (art. 6.1.f):</strong> para la
                  mejora del servicio, la prevención de fraude y la seguridad de la plataforma,
                  siempre que no prevalezcan tus derechos y libertades fundamentales.
                </li>
                <li>
                  <strong className="text-foreground">Obligación legal (art. 6.1.c):</strong> para el
                  cumplimiento de obligaciones fiscales, contables y de otra índole legal.
                </li>
              </ul>
            </CardContent>
          </Card>

          {/* 5. Destinatarios */}
          <Card className="border-white/5 bg-card/50">
            <CardHeader>
              <CardTitle className="text-lg">5. Destinatarios y encargados del tratamiento</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm leading-relaxed text-muted-foreground">
              <p>
                Para prestarte el servicio, compartimos tus datos con los siguientes proveedores que
                actúan como encargados del tratamiento:
              </p>

              <div className="space-y-4">
                <div>
                  <p className="font-medium text-foreground">Supabase (base de datos y autenticación)</p>
                  <p>
                    Almacena tus datos de cuenta, contenido generado y configuraciones. Servidores en
                    la Unión Europea. Cumple con el RGPD.
                  </p>
                </div>

                <div>
                  <p className="font-medium text-foreground">Stripe (procesamiento de pagos)</p>
                  <p>
                    Procesa tus datos de pago de forma segura. Certificado PCI DSS Level 1. Con sede
                    en EE.UU. con garantías adecuadas (Data Privacy Framework y cláusulas
                    contractuales tipo).
                  </p>
                </div>

                <div>
                  <p className="font-medium text-foreground">Anthropic - Claude API (inteligencia artificial)</p>
                  <p>
                    Procesa los datos que envías para generar contenido con IA (propuestas, análisis,
                    scripts). Con sede en EE.UU. con garantías adecuadas conforme al RGPD. Los datos
                    enviados a la API no se utilizan para entrenar modelos.
                  </p>
                </div>

                <div>
                  <p className="font-medium text-foreground">Apify (scraping y análisis web)</p>
                  <p>
                    Recopila información pública de sitios web para el análisis de negocios.
                    Servidores en la UE. Solo procesa URLs e información pública de los sitios web
                    que analices.
                  </p>
                </div>

                <div>
                  <p className="font-medium text-foreground">Resend (envío de emails)</p>
                  <p>
                    Gestiona el envío de correos electrónicos transaccionales (confirmaciones,
                    notificaciones). Procesa tu dirección de email y nombre. Con garantías adecuadas
                    conforme al RGPD.
                  </p>
                </div>
              </div>

              <p>
                No vendemos ni cedemos tus datos personales a terceros con fines comerciales o
                publicitarios. Solo compartimos datos con los proveedores indicados y en la medida
                estrictamente necesaria para prestarte el servicio.
              </p>
            </CardContent>
          </Card>

          {/* 6. Transferencias internacionales */}
          <Card className="border-white/5 bg-card/50">
            <CardHeader>
              <CardTitle className="text-lg">6. Transferencias internacionales de datos</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm leading-relaxed text-muted-foreground">
              <p>
                Algunos de nuestros proveedores tienen sede fuera del Espacio Económico Europeo
                (EEE). En estos casos, nos aseguramos de que existan garantías adecuadas para la
                protección de tus datos:
              </p>
              <ul className="list-disc space-y-2 pl-5">
                <li>
                  Decisión de adecuación de la Comisión Europea, cuando exista.
                </li>
                <li>
                  Adhesión al EU-U.S. Data Privacy Framework.
                </li>
                <li>
                  Cláusulas contractuales tipo aprobadas por la Comisión Europea.
                </li>
              </ul>
              <p>
                Puedes solicitar información adicional sobre las garantías aplicadas contactándonos
                en info@simedalavida.com.
              </p>
            </CardContent>
          </Card>

          {/* 7. Conservación de datos */}
          <Card className="border-white/5 bg-card/50">
            <CardHeader>
              <CardTitle className="text-lg">7. Conservación de datos</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm leading-relaxed text-muted-foreground">
              <p>Conservamos tus datos personales durante los siguientes plazos:</p>
              <ul className="list-disc space-y-2 pl-5">
                <li>
                  <strong className="text-foreground">Datos de cuenta:</strong> mientras mantengas tu
                  cuenta activa y hasta 30 días después de solicitar su eliminación, para permitir la
                  recuperación en caso de eliminación accidental.
                </li>
                <li>
                  <strong className="text-foreground">Datos de facturación:</strong> durante el
                  periodo exigido por la legislación fiscal española (mínimo 4 años conforme al
                  artículo 66 de la Ley General Tributaria).
                </li>
                <li>
                  <strong className="text-foreground">Contenido generado:</strong> mientras mantengas
                  tu cuenta activa. Se elimina junto con tu cuenta.
                </li>
                <li>
                  <strong className="text-foreground">Datos técnicos y de uso:</strong> máximo 12
                  meses para fines de seguridad y mejora del servicio.
                </li>
              </ul>
              <p>
                Una vez transcurridos estos plazos, los datos se eliminan de forma segura o se
                anonimizan de manera irreversible.
              </p>
            </CardContent>
          </Card>

          {/* 8. Derechos del usuario */}
          <Card className="border-white/5 bg-card/50">
            <CardHeader>
              <CardTitle className="text-lg">8. Tus derechos</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm leading-relaxed text-muted-foreground">
              <p>
                Conforme al RGPD y la LOPDGDD, tienes los siguientes derechos sobre tus datos
                personales:
              </p>
              <ul className="list-disc space-y-2 pl-5">
                <li>
                  <strong className="text-foreground">Derecho de acceso:</strong> puedes solicitar una
                  copia de los datos personales que tenemos sobre ti.
                </li>
                <li>
                  <strong className="text-foreground">Derecho de rectificación:</strong> puedes
                  solicitar la corrección de datos inexactos o incompletos.
                </li>
                <li>
                  <strong className="text-foreground">Derecho de supresión:</strong> puedes solicitar
                  la eliminación de tus datos cuando ya no sean necesarios para la finalidad para la
                  que fueron recogidos.
                </li>
                <li>
                  <strong className="text-foreground">Derecho de portabilidad:</strong> puedes
                  solicitar recibir tus datos en un formato estructurado, de uso común y lectura
                  mecánica.
                </li>
                <li>
                  <strong className="text-foreground">Derecho de oposición:</strong> puedes oponerte
                  al tratamiento de tus datos en determinadas circunstancias, especialmente cuando el
                  tratamiento se base en interés legítimo.
                </li>
                <li>
                  <strong className="text-foreground">Derecho de limitación:</strong> puedes solicitar
                  la limitación del tratamiento en los casos previstos por el RGPD.
                </li>
                <li>
                  <strong className="text-foreground">Derecho a retirar el consentimiento:</strong>{' '}
                  cuando el tratamiento se base en tu consentimiento, puedes retirarlo en cualquier
                  momento sin que afecte a la licitud del tratamiento previo.
                </li>
              </ul>
              <p>
                Para ejercer cualquiera de estos derechos, envía un correo a{' '}
                <a
                  href="mailto:info@simedalavida.com"
                  className="text-purple-400 underline underline-offset-2 hover:text-purple-300"
                >
                  info@simedalavida.com
                </a>{' '}
                indicando tu solicitud y adjuntando una copia de tu documento de identidad. Responderemos
                en un plazo máximo de 30 días.
              </p>
              <p>
                Si consideras que el tratamiento de tus datos no se ajusta a la normativa, tienes
                derecho a presentar una reclamación ante la Agencia Española de Protección de Datos (
                <a
                  href="https://www.aepd.es"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-purple-400 underline underline-offset-2 hover:text-purple-300"
                >
                  www.aepd.es
                </a>
                ).
              </p>
            </CardContent>
          </Card>

          {/* 9. Cookies */}
          <Card className="border-white/5 bg-card/50">
            <CardHeader>
              <CardTitle className="text-lg">9. Cookies</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm leading-relaxed text-muted-foreground">
              <p>
                AI Agency OS utiliza únicamente cookies técnicas y funcionales estrictamente
                necesarias para el funcionamiento de la plataforma:
              </p>
              <ul className="list-disc space-y-2 pl-5">
                <li>
                  <strong className="text-foreground">Cookies de sesión:</strong> para mantener tu
                  sesión iniciada y garantizar la seguridad de tu cuenta.
                </li>
                <li>
                  <strong className="text-foreground">Cookies de preferencias:</strong> para recordar
                  tus ajustes de idioma y configuración de la interfaz.
                </li>
              </ul>
              <p>
                No utilizamos cookies de análisis, publicitarias ni de seguimiento de terceros. Al ser
                cookies estrictamente necesarias, no requieren tu consentimiento previo conforme al
                artículo 22.2 de la Ley de Servicios de la Sociedad de la Información (LSSI).
              </p>
            </CardContent>
          </Card>

          {/* 10. Contacto y DPD */}
          <Card className="border-white/5 bg-card/50">
            <CardHeader>
              <CardTitle className="text-lg">10. Contacto y protección de datos</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm leading-relaxed text-muted-foreground">
              <p>
                Para cualquier consulta relacionada con la protección de tus datos personales o para
                ejercer tus derechos, puedes contactarnos en:
              </p>
              <ul className="space-y-1">
                <li>
                  <strong className="text-foreground">Email:</strong>{' '}
                  <a
                    href="mailto:info@simedalavida.com"
                    className="text-purple-400 underline underline-offset-2 hover:text-purple-300"
                  >
                    info@simedalavida.com
                  </a>
                </li>
              </ul>
              <p>
                Aunque como PYME no estamos obligados a designar un Delegado de Protección de Datos
                (DPD), nos tomamos muy en serio la privacidad de tus datos. Puedes dirigir cualquier
                consulta o reclamación sobre protección de datos a la dirección de email indicada y
                te responderemos a la mayor brevedad posible.
              </p>
            </CardContent>
          </Card>

          {/* 11. Actualizaciones */}
          <Card className="border-white/5 bg-card/50">
            <CardHeader>
              <CardTitle className="text-lg">11. Actualizaciones de esta política</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm leading-relaxed text-muted-foreground">
              <p>
                Podemos actualizar esta Política de Privacidad periódicamente. Te notificaremos de
                cualquier cambio significativo por correo electrónico o mediante un aviso en la
                plataforma. Te recomendamos revisar esta página regularmente.
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="mt-12 text-center">
          <Link
            href="/legal/terminos"
            className="text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            Ver Términos y Condiciones →
          </Link>
        </div>
      </div>
    </div>
  );
}
