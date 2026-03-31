import { NextRequest, NextResponse } from 'next/server';
import { getTokenFromRequest, createApiClient } from '@/lib/supabase/api-client';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const token = getTokenFromRequest(request);
  if (!token) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  const supabase = createApiClient(token);

  const { data: propuesta, error } = await supabase
    .from('propuestas')
    .select('*, empresas(nombre)')
    .eq('id', id)
    .single();

  if (error || !propuesta) {
    return NextResponse.json(
      { error: 'Propuesta no encontrada' },
      { status: 404 }
    );
  }

  const empresaNombre =
    (propuesta.empresas as { nombre: string } | null)?.nombre ?? 'Cliente';

  const html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(propuesta.titulo)}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');

    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    body {
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
      color: #1a1a2e;
      line-height: 1.7;
      background: #fff;
    }

    @media print {
      body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      .no-print { display: none !important; }
      .page-break { page-break-before: always; }
    }

    .header {
      background: linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%);
      color: #fff;
      padding: 48px 56px;
    }

    .header-logo {
      font-size: 13px;
      font-weight: 600;
      letter-spacing: 2px;
      text-transform: uppercase;
      color: rgba(255,255,255,0.6);
      margin-bottom: 24px;
    }

    .header h1 {
      font-size: 28px;
      font-weight: 700;
      line-height: 1.3;
      margin-bottom: 8px;
    }

    .header-meta {
      font-size: 14px;
      color: rgba(255,255,255,0.7);
    }

    .content {
      max-width: 800px;
      margin: 0 auto;
      padding: 40px 56px;
    }

    .section {
      margin-bottom: 36px;
    }

    .section-title {
      font-size: 11px;
      font-weight: 600;
      letter-spacing: 1.5px;
      text-transform: uppercase;
      color: #7c3aed;
      margin-bottom: 12px;
      padding-bottom: 8px;
      border-bottom: 2px solid #ede9fe;
    }

    .section-content {
      font-size: 14px;
      color: #374151;
      white-space: pre-wrap;
    }

    .pricing-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 20px;
      margin-top: 8px;
    }

    .pricing-card {
      border: 1px solid #e5e7eb;
      border-radius: 12px;
      padding: 24px;
      text-align: center;
    }

    .pricing-card.setup {
      border-color: #c4b5fd;
      background: #faf5ff;
    }

    .pricing-card.mensual {
      border-color: #a5b4fc;
      background: #eef2ff;
    }

    .pricing-label {
      font-size: 12px;
      font-weight: 500;
      color: #6b7280;
      text-transform: uppercase;
      letter-spacing: 1px;
      margin-bottom: 4px;
    }

    .pricing-value {
      font-size: 32px;
      font-weight: 700;
      color: #1a1a2e;
    }

    .pricing-suffix {
      font-size: 14px;
      font-weight: 400;
      color: #6b7280;
    }

    .roi-box {
      background: linear-gradient(135deg, #f0fdf4, #ecfdf5);
      border: 1px solid #86efac;
      border-radius: 12px;
      padding: 24px;
      margin-top: 8px;
    }

    .roi-box p {
      font-size: 14px;
      color: #166534;
    }

    .cta-box {
      background: linear-gradient(135deg, #1a1a2e, #0f3460);
      border-radius: 12px;
      padding: 32px;
      text-align: center;
      margin-top: 12px;
    }

    .cta-box p {
      font-size: 18px;
      font-weight: 600;
      color: #fff;
      line-height: 1.5;
    }

    .footer {
      text-align: center;
      padding: 32px 56px;
      border-top: 1px solid #e5e7eb;
      margin-top: 24px;
    }

    .footer p {
      font-size: 12px;
      color: #9ca3af;
    }

    .print-hint {
      position: fixed;
      bottom: 20px;
      right: 20px;
      background: #7c3aed;
      color: #fff;
      padding: 12px 24px;
      border-radius: 8px;
      font-size: 13px;
      font-weight: 500;
      box-shadow: 0 4px 12px rgba(124, 58, 237, 0.3);
      cursor: pointer;
      z-index: 100;
    }

    .print-hint:hover {
      background: #6d28d9;
    }
  </style>
</head>
<body>
  <div class="print-hint no-print" onclick="window.print()">
    Ctrl+P para guardar como PDF
  </div>

  <div class="header">
    <div class="header-logo">AI Agency OS</div>
    <h1>${escapeHtml(propuesta.titulo)}</h1>
    <div class="header-meta">
      Propuesta para ${escapeHtml(empresaNombre)} &middot; ${formatDate(propuesta.created_at)}
    </div>
  </div>

  <div class="content">
    ${propuesta.resumen_ejecutivo ? `
    <div class="section">
      <div class="section-title">Resumen ejecutivo</div>
      <div class="section-content">${escapeHtml(propuesta.resumen_ejecutivo)}</div>
    </div>
    ` : ''}

    ${propuesta.problemas ? `
    <div class="section">
      <div class="section-title">Problemas detectados</div>
      <div class="section-content">${escapeHtml(propuesta.problemas)}</div>
    </div>
    ` : ''}

    ${propuesta.solucion ? `
    <div class="section">
      <div class="section-title">Solución propuesta</div>
      <div class="section-content">${escapeHtml(propuesta.solucion)}</div>
    </div>
    ` : ''}

    ${propuesta.stack ? `
    <div class="section">
      <div class="section-title">Metodología y tecnología</div>
      <div class="section-content">${escapeHtml(propuesta.stack)}</div>
    </div>
    ` : ''}

    ${propuesta.cronograma ? `
    <div class="section">
      <div class="section-title">Cronograma de implementación</div>
      <div class="section-content">${escapeHtml(propuesta.cronograma)}</div>
    </div>
    ` : ''}

    ${propuesta.precio_setup != null || propuesta.precio_mensual != null ? `
    <div class="section">
      <div class="section-title">Inversión</div>
      <div class="pricing-grid">
        ${propuesta.precio_setup != null ? `
        <div class="pricing-card setup">
          <div class="pricing-label">Setup inicial</div>
          <div class="pricing-value">${propuesta.precio_setup}<span class="pricing-suffix">&euro;</span></div>
          <div class="pricing-label" style="margin-top:4px;">pago único</div>
        </div>
        ` : ''}
        ${propuesta.precio_mensual != null ? `
        <div class="pricing-card mensual">
          <div class="pricing-label">Mensualidad</div>
          <div class="pricing-value">${propuesta.precio_mensual}<span class="pricing-suffix">&euro;/mes</span></div>
          <div class="pricing-label" style="margin-top:4px;">recurrente</div>
        </div>
        ` : ''}
      </div>
    </div>
    ` : ''}

    ${propuesta.roi ? `
    <div class="section">
      <div class="section-title">ROI estimado</div>
      <div class="roi-box">
        <p>${escapeHtml(propuesta.roi)}</p>
      </div>
    </div>
    ` : ''}

    ${propuesta.cta_cierre ? `
    <div class="section">
      <div class="cta-box">
        <p>${escapeHtml(propuesta.cta_cierre)}</p>
      </div>
    </div>
    ` : ''}
  </div>

  <div class="footer">
    <p>Propuesta generada con AI Agency OS &middot; Simedalavida</p>
  </div>
</body>
</html>`;

  return new NextResponse(html, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
    },
  });
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('es-ES', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}
