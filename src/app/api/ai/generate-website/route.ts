import { NextRequest, NextResponse } from 'next/server';
import { createApiClient, getTokenFromRequest } from '@/lib/supabase/api-client';
import { callClaude } from '@/lib/ai/claude';
import { GENERATE_WEBSITE_SYSTEM, buildWebsitePrompt } from '@/lib/ai/prompts/generate-website';
import { spendCredit, logActivity } from '@/lib/credits';

export async function POST(request: NextRequest) {
  try {
    const token = getTokenFromRequest(request);
    if (!token) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });

    const db = createApiClient(token);
    const { auditoriaId, workspaceId, userId } = await request.json();

    if (!auditoriaId || !workspaceId || !userId) {
      return NextResponse.json({ error: 'Faltan campos requeridos' }, { status: 400 });
    }

    // Get audit data
    const { data: auditoria } = await db
      .from('auditorias')
      .select('*, empresas(nombre, website, telefono, email, ciudad, nicho)')
      .eq('id', auditoriaId)
      .single();

    if (!auditoria || auditoria.estado !== 'completada') {
      return NextResponse.json({ error: 'Auditoría no encontrada o no completada' }, { status: 404 });
    }

    // Spend credit
    const spent = await spendCredit(workspaceId, userId, 'web_demo', `Web demo para ${auditoria.url}`, token);
    if (!spent) return NextResponse.json({ error: 'No tienes créditos suficientes' }, { status: 402 });

    const empresa = auditoria.empresas || {};

    // Generate HTML with Claude
    const html = await callClaude(GENERATE_WEBSITE_SYSTEM, buildWebsitePrompt({
      nombre: empresa.nombre || 'Negocio',
      servicios: auditoria.servicios || '',
      descripcion: auditoria.resumen_negocio || '',
      telefono: (auditoria as Record<string, unknown>).contacto_telefono as string || empresa.telefono || undefined,
      email: (auditoria as Record<string, unknown>).contacto_email as string || empresa.email || undefined,
      ciudad: empresa.ciudad || undefined,
      redesSociales: auditoria.raw_scraping?.socialLinks || [],
    }));

    // Clean the HTML (remove any markdown wrapping)
    let cleanHtml = html.trim();
    if (cleanHtml.startsWith('```')) {
      cleanHtml = cleanHtml.replace(/^```html?\n?/, '').replace(/\n?```$/, '');
    }

    // Deploy to Netlify via API
    const netlifyToken = process.env.NETLIFY_AUTH_TOKEN;
    let deployUrl = '';

    if (netlifyToken) {
      try {
        const siteName = `demo-${empresa.nombre?.toLowerCase().replace(/[^a-z0-9]/g, '-').slice(0, 30) || 'site'}-${Date.now().toString(36)}`;

        // Create site
        const createRes = await fetch('https://api.netlify.com/api/v1/sites', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${netlifyToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ name: siteName }),
        });

        if (createRes.ok) {
          const site = await createRes.json();

          // Deploy HTML
          const deployRes = await fetch(`https://api.netlify.com/api/v1/sites/${site.id}/deploys`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${netlifyToken}`,
              'Content-Type': 'application/zip',
            },
            // Send as single file deploy using the file digest API
          });

          // Alternative: use file-based deploy
          const fileDigest = {
            files: { '/index.html': await sha1(cleanHtml) },
          };

          const digestRes = await fetch(`https://api.netlify.com/api/v1/sites/${site.id}/deploys`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${netlifyToken}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(fileDigest),
          });

          if (digestRes.ok) {
            const deploy = await digestRes.json();

            // Upload the file
            await fetch(`https://api.netlify.com/api/v1/deploys/${deploy.id}/files/index.html`, {
              method: 'PUT',
              headers: {
                'Authorization': `Bearer ${netlifyToken}`,
                'Content-Type': 'application/octet-stream',
              },
              body: cleanHtml,
            });

            deployUrl = `https://${siteName}.netlify.app`;
          }
        }
      } catch (err) {
        console.error('Netlify deploy error:', err);
      }
    }

    // If Netlify deploy failed or no token, return HTML for manual deploy
    if (!deployUrl) {
      // Save HTML to audit for manual download
      await db.from('auditorias').update({
        demo_url: 'pending',
      }).eq('id', auditoriaId);

      await logActivity(workspaceId, userId, 'web_generada', `Web demo generada para ${empresa.nombre} (deploy manual)`, token);

      return NextResponse.json({
        html: cleanHtml,
        deployUrl: null,
        message: 'Web generada. Despliégala manualmente en Netlify.',
      });
    }

    // Save deploy URL
    await db.from('auditorias').update({
      demo_url: deployUrl,
      tipo_oferta: 'web',
    }).eq('id', auditoriaId);

    await logActivity(workspaceId, userId, 'web_desplegada', `Web demo desplegada: ${deployUrl}`, token);

    return NextResponse.json({
      html: cleanHtml,
      deployUrl,
      message: 'Web generada y desplegada',
    });
  } catch (error) {
    console.error('Generate website error:', error);
    return NextResponse.json({ error: 'Error al generar la web' }, { status: 500 });
  }
}

async function sha1(text: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(text);
  const hash = await crypto.subtle.digest('SHA-1', data);
  return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('');
}
