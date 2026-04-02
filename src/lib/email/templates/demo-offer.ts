export function buildDemoOfferHTML(data: {
  tipo: 'web' | 'agente' | 'automatizacion';
  empresaNombre: string;
  contactoNombre: string;
  problemas: string[];
  demoUrl: string;
  calUrl: string;
  agenciaNombre: string;
  agenciaEmail: string;
}): string {
  const hookMap: Record<string, string> = {
    web: 'Hemos creado una demo de tu nueva web',
    agente: 'Hemos creado un asistente IA para tu negocio',
    automatizacion: 'Hemos diseñado un plan de automatización para tu negocio',
  };
  const hook = hookMap[data.tipo] || hookMap.automatizacion;

  const problemasHTML = data.problemas
    .map(
      (p) =>
        `<tr><td style="padding:0 0 8px 0;font-size:15px;line-height:1.5;color:#374151;">
          <span style="color:#dc2626;font-weight:600;margin-right:6px;">&#10060;</span>${escapeHtml(p)}
        </td></tr>`
    )
    .join('');

  return `<!DOCTYPE html>
<html lang="es" xmlns="http://www.w3.org/1999/xhtml">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta http-equiv="X-UA-Compatible" content="IE=edge" />
  <title>${escapeHtml(data.agenciaNombre)}</title>
  <!--[if mso]>
  <noscript>
    <xml>
      <o:OfficeDocumentSettings>
        <o:PixelsPerInch>96</o:PixelsPerInch>
      </o:OfficeDocumentSettings>
    </xml>
  </noscript>
  <![endif]-->
</head>
<body style="margin:0;padding:0;background-color:#ffffff;font-family:Arial,'Helvetica Neue',Helvetica,sans-serif;-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%;">

  <!-- Wrapper -->
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#ffffff;">
    <tr>
      <td align="center" style="padding:24px 16px;">

        <!-- Container -->
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background-color:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1);border:1px solid #e5e7eb;">

          <!-- Header -->
          <tr>
            <td style="background-color:#6366f1;padding:20px 32px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="font-size:18px;font-weight:700;color:#ffffff;letter-spacing:0.5px;">
                    ${escapeHtml(data.agenciaNombre)}
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Hook -->
          <tr>
            <td style="padding:32px 32px 24px 32px;">
              <p style="margin:0;font-size:16px;line-height:1.6;color:#111827;">
                Hola ${escapeHtml(data.contactoNombre)},
              </p>
              <p style="margin:16px 0 0 0;font-size:18px;line-height:1.6;color:#6366f1;font-weight:700;">
                ${escapeHtml(hook)}
              </p>
              <p style="margin:12px 0 0 0;font-size:15px;line-height:1.6;color:#374151;">
                Tras analizar <strong>${escapeHtml(data.empresaNombre)}</strong>, hemos identificado varios puntos de mejora y hemos preparado algo para que lo veas por ti mismo.
              </p>
            </td>
          </tr>

          <!-- Problems Section -->
          <tr>
            <td style="padding:0 32px 24px 32px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#fef2f2;border-left:4px solid #dc2626;border-radius:8px;">
                <tr>
                  <td style="padding:20px 24px;">
                    <p style="margin:0 0 12px 0;font-size:14px;font-weight:700;color:#991b1b;text-transform:uppercase;letter-spacing:0.5px;">
                      Problemas detectados
                    </p>
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                      ${problemasHTML}
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Demo Section -->
          <tr>
            <td style="padding:0 32px 24px 32px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#eef2ff;border:2px solid #6366f1;border-radius:8px;">
                <tr>
                  <td style="padding:24px;text-align:center;">
                    <p style="margin:0 0 8px 0;font-size:13px;font-weight:700;color:#4338ca;text-transform:uppercase;letter-spacing:0.5px;">
                      Tu demo personalizada
                    </p>
                    <p style="margin:0 0 16px 0;font-size:16px;line-height:1.5;color:#312e81;">
                      Puedes verlo aquí
                    </p>
                    <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 auto;">
                      <tr>
                        <td style="border-radius:8px;background-color:#6366f1;">
                          <a href="${escapeHtml(data.demoUrl)}" target="_blank" style="display:inline-block;padding:14px 40px;font-size:16px;font-weight:700;color:#ffffff;text-decoration:none;border-radius:8px;background-color:#6366f1;">
                            Ver demo
                          </a>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- CTA Section -->
          <tr>
            <td style="padding:8px 32px 32px 32px;">
              <p style="margin:0 0 16px 0;font-size:15px;line-height:1.6;color:#374151;text-align:center;">
                ¿Quieres que te expliquemos cómo adaptarlo a tu negocio?
              </p>
              <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 auto;">
                <tr>
                  <td style="border-radius:8px;background-color:#4f46e5;">
                    <a href="${escapeHtml(data.calUrl)}" target="_blank" style="display:inline-block;padding:14px 40px;font-size:16px;font-weight:700;color:#ffffff;text-decoration:none;border-radius:8px;background-color:#4f46e5;">
                      Agendar una llamada de 15 min
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Sign off -->
          <tr>
            <td style="padding:0 32px 8px 32px;">
              <p style="margin:0;font-size:15px;line-height:1.7;color:#374151;">
                Un saludo,
              </p>
              <p style="margin:4px 0 0 0;font-size:15px;line-height:1.7;color:#374151;font-weight:600;">
                Equipo de ${escapeHtml(data.agenciaNombre)}
              </p>
            </td>
          </tr>

          <!-- Divider -->
          <tr>
            <td style="padding:16px 32px 0 32px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="border-top:1px solid #e5e7eb;"></td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:20px 32px 24px 32px;">
              <p style="margin:0;font-size:12px;line-height:1.5;color:#9ca3af;text-align:center;">
                ${escapeHtml(data.agenciaNombre)} &middot; ${escapeHtml(data.agenciaEmail)}
              </p>
              <p style="margin:8px 0 0 0;font-size:11px;line-height:1.5;color:#d1d5db;text-align:center;">
                Si no deseas recibir mas correos, responde a este email con "BAJA".
              </p>
            </td>
          </tr>

        </table>
        <!-- /Container -->

      </td>
    </tr>
  </table>
  <!-- /Wrapper -->

</body>
</html>`;
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
