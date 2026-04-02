export function buildFollowUpHTML(data: {
  empresaNombre: string;
  contactoNombre: string;
  diasSinRespuesta: number;
  resumenOriginal: string;
  ctaUrl: string;
  agenciaNombre: string;
  agenciaEmail: string;
}): string {
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
<body style="margin:0;padding:0;background-color:#f3f4f6;font-family:Arial,'Helvetica Neue',Helvetica,sans-serif;-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%;">

  <!-- Wrapper -->
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f3f4f6;">
    <tr>
      <td align="center" style="padding:24px 16px;">

        <!-- Container -->
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background-color:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1);">

          <!-- Header -->
          <tr>
            <td style="background-color:#6366f1;padding:16px 32px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="font-size:16px;font-weight:700;color:#ffffff;letter-spacing:0.5px;">
                    ${escapeHtml(data.agenciaNombre)}
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:32px 32px 16px 32px;">
              <p style="margin:0;font-size:16px;line-height:1.6;color:#111827;">
                Hola ${escapeHtml(data.contactoNombre)},
              </p>
              <p style="margin:16px 0 0 0;font-size:15px;line-height:1.7;color:#374151;">
                Te escribimos hace ${data.diasSinRespuesta} dias sobre las oportunidades que detectamos en <strong>${escapeHtml(data.empresaNombre)}</strong> y queriamos saber si tuviste oportunidad de revisarlo.
              </p>
              <p style="margin:16px 0 0 0;font-size:15px;line-height:1.7;color:#374151;">
                Para refrescarte la memoria, esto es lo que encontramos:
              </p>
            </td>
          </tr>

          <!-- Summary box -->
          <tr>
            <td style="padding:0 32px 24px 32px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f9fafb;border-left:4px solid #6366f1;border-radius:8px;">
                <tr>
                  <td style="padding:16px 20px;">
                    <p style="margin:0;font-size:14px;line-height:1.6;color:#4b5563;">
                      ${escapeHtml(data.resumenOriginal)}
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Casual close -->
          <tr>
            <td style="padding:0 32px 8px 32px;">
              <p style="margin:0;font-size:15px;line-height:1.7;color:#374151;">
                Entendemos que estais ocupados, pero creemos que esto puede marcar una diferencia real en vuestros resultados. Si te parece bien, podemos agendar una llamada rapida de 15 minutos para verlo juntos.
              </p>
            </td>
          </tr>

          <!-- CTA Button -->
          <tr>
            <td style="padding:24px 32px 32px 32px;" align="center">
              <table role="presentation" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="border-radius:8px;background-color:#6366f1;">
                    <a href="${escapeHtml(data.ctaUrl)}" target="_blank" style="display:inline-block;padding:14px 40px;font-size:16px;font-weight:700;color:#ffffff;text-decoration:none;border-radius:8px;background-color:#6366f1;">
                      Agendar una llamada
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Sign off -->
          <tr>
            <td style="padding:0 32px 24px 32px;">
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
            <td style="padding:0 32px;">
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
