export function buildColdEmailHTML(data: {
  empresaNombre: string;
  contactoNombre: string;
  problemas: string[];
  solucion: string;
  roi: string;
  ctaUrl: string;
  ctaText: string;
  agenciaNombre: string;
  agenciaEmail: string;
  psText?: string;
}): string {
  const problemasHTML = data.problemas
    .map(
      (p) =>
        `<tr><td style="padding:0 0 8px 0;font-size:15px;line-height:1.5;color:#374151;">
          <span style="color:#dc2626;font-weight:600;margin-right:6px;">&#10060;</span>${escapeHtml(p)}
        </td></tr>`
    )
    .join('');

  const psSection = data.psText
    ? `<tr><td style="padding:24px 0 0 0;">
        <p style="margin:0;font-size:14px;line-height:1.6;color:#6b7280;font-style:italic;">
          PD: ${escapeHtml(data.psText)}
        </p>
      </td></tr>`
    : '';

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
              <p style="margin:16px 0 0 0;font-size:15px;line-height:1.6;color:#374151;">
                Hemos analizado la web de <strong>${escapeHtml(data.empresaNombre)}</strong> y hemos encontrado oportunidades importantes que queremos compartir contigo.
              </p>
            </td>
          </tr>

          <!-- Problem Section -->
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

          <!-- Solution Section -->
          <tr>
            <td style="padding:0 32px 24px 32px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f0fdf4;border-left:4px solid #16a34a;border-radius:8px;">
                <tr>
                  <td style="padding:20px 24px;">
                    <p style="margin:0 0 12px 0;font-size:14px;font-weight:700;color:#166534;text-transform:uppercase;letter-spacing:0.5px;">
                      Nuestra solucion
                    </p>
                    <p style="margin:0;font-size:15px;line-height:1.6;color:#374151;">
                      ${escapeHtml(data.solucion)}
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- ROI Section -->
          <tr>
            <td style="padding:0 32px 24px 32px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#eef2ff;border:2px solid #6366f1;border-radius:8px;">
                <tr>
                  <td style="padding:20px 24px;text-align:center;">
                    <p style="margin:0 0 8px 0;font-size:13px;font-weight:700;color:#4338ca;text-transform:uppercase;letter-spacing:0.5px;">
                      Resultado esperado
                    </p>
                    <p style="margin:0;font-size:18px;font-weight:700;line-height:1.5;color:#312e81;">
                      ${escapeHtml(data.roi)}
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- CTA Button -->
          <tr>
            <td style="padding:8px 32px 32px 32px;" align="center">
              <table role="presentation" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="border-radius:8px;background-color:#6366f1;">
                    <a href="${escapeHtml(data.ctaUrl)}" target="_blank" style="display:inline-block;padding:14px 40px;font-size:16px;font-weight:700;color:#ffffff;text-decoration:none;border-radius:8px;background-color:#6366f1;">
                      ${escapeHtml(data.ctaText)}
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

          <!-- PS -->
          ${psSection ? `<tr><td style="padding:0 32px 24px 32px;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0">${psSection}</table></td></tr>` : ''}

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
