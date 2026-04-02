import { NextRequest, NextResponse } from 'next/server';
import { createApiClient, getTokenFromRequest } from '@/lib/supabase/api-client';
import { sendEmail } from '@/lib/email/resend';
import { buildColdEmailHTML } from '@/lib/email/templates/cold-email-funnel';
import { buildFollowUpHTML } from '@/lib/email/templates/follow-up';
import { buildDemoOfferHTML } from '@/lib/email/templates/demo-offer';
import { logActivity } from '@/lib/credits';

export async function POST(request: NextRequest) {
  try {
    const token = getTokenFromRequest(request);
    if (!token) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    const db = createApiClient(token);
    const { to, scriptId, type, workspaceId, userId, tipoOferta, demoUrl } = await request.json();

    if (!to || !type || !workspaceId || !userId) {
      return NextResponse.json({ error: 'Faltan campos requeridos' }, { status: 400 });
    }

    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(workspaceId) || !uuidRegex.test(userId)) {
      return NextResponse.json({ error: 'Formato de ID invalido' }, { status: 400 });
    }

    if (!['cold_email', 'follow_up', 'demo_offer'].includes(type)) {
      return NextResponse.json({ error: 'Tipo de email invalido' }, { status: 400 });
    }

    // Handle demo_offer type (no scriptId needed)
    if (type === 'demo_offer') {
      if (!demoUrl) return NextResponse.json({ error: 'Falta la URL de la demo' }, { status: 400 });

      const { data: auditoria } = await db
        .from('auditorias')
        .select('*, empresas(nombre)')
        .eq('id', scriptId) // scriptId is actually auditoriaId for demo_offer
        .single();

      const empresaNombre = auditoria?.empresas?.nombre || 'tu negocio';
      const contactoNombre = (auditoria as Record<string, unknown>)?.contacto_nombre as string || empresaNombre;

      const html = buildDemoOfferHTML({
        tipo: (tipoOferta || 'automatizacion') as 'web' | 'agente' | 'automatizacion',
        empresaNombre,
        contactoNombre,
        problemas: auditoria?.problemas || [],
        demoUrl,
        calUrl: 'https://cal.com/simedalavida',
        agenciaNombre: 'Simedalavida',
        agenciaEmail: 'info@simedalavida.com',
      });

      const result = await sendEmail({
        to, subject: `Demo personalizada para ${empresaNombre}`, html,
        from: 'Equipo de Simedalavida <noreply@simedalavida.com>',
        replyTo: 'info@simedalavida.com',
      });

      if (!result.success) return NextResponse.json({ error: result.error }, { status: 500 });

      await logActivity(workspaceId, userId, 'demo_enviada', `Demo enviada a ${empresaNombre} (${to})`, token);
      return NextResponse.json({ success: true, emailId: result.id });
    }

    if (!scriptId || !uuidRegex.test(scriptId)) {
      return NextResponse.json({ error: 'scriptId requerido' }, { status: 400 });
    }

    // Fetch script with linked auditoria and empresa
    const { data: script, error: scriptError } = await db
      .from('scripts')
      .select('*, auditorias(*, empresas(*))')
      .eq('id', scriptId)
      .single();

    if (scriptError || !script) {
      return NextResponse.json({ error: 'Script no encontrado' }, { status: 404 });
    }

    const auditoria = script.auditorias;
    const empresa = auditoria?.empresas;
    const empresaNombre = empresa?.nombre || 'tu empresa';
    const contactoNombre = to.split('@')[0].split(/[._-]/).map((w: string) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');

    // Fetch workspace for agency info
    const { data: workspace } = await db
      .from('workspaces')
      .select('nombre')
      .eq('id', workspaceId)
      .single();

    const agenciaNombre = 'Simedalavida';
    const agenciaEmail = 'info@simedalavida.com';

    let html: string;
    let subject: string;

    if (type === 'cold_email') {
      subject = `Oportunidades de mejora para ${empresaNombre}`;
      html = buildColdEmailHTML({
        empresaNombre,
        contactoNombre,
        problemas: auditoria?.problemas || ['Oportunidades de mejora detectadas en tu web'],
        solucion: script.cold_email?.split('\n').slice(1).join(' ').substring(0, 300) || 'Podemos ayudarte a mejorar tus resultados con automatizacion e IA.',
        roi: auditoria?.roi_estimado || 'Mejora significativa en conversion y eficiencia',
        ctaUrl: 'https://simedalavida.com/contacto',
        ctaText: 'Reservar demo gratuita',
        agenciaNombre,
        agenciaEmail,
        psText: 'Esta propuesta se ha preparado especificamente para tu negocio. Solo te llevara 2 minutos revisarla.',
      });
    } else {
      subject = `Re: Oportunidades para ${empresaNombre}`;
      html = buildFollowUpHTML({
        empresaNombre,
        contactoNombre,
        diasSinRespuesta: 3,
        resumenOriginal: auditoria?.resumen_negocio
          ? `${auditoria.resumen_negocio.substring(0, 200)}...`
          : 'Detectamos varias oportunidades de mejora y automatizacion para tu negocio.',
        ctaUrl: 'https://simedalavida.com/contacto',
        agenciaNombre,
        agenciaEmail,
      });
    }

    const result = await sendEmail({
      to,
      subject,
      html,
      from: 'Equipo de Simedalavida <noreply@simedalavida.com>',
      replyTo: 'info@simedalavida.com',
    });

    if (!result.success) {
      return NextResponse.json({ error: result.error || 'Error al enviar email' }, { status: 500 });
    }

    await logActivity(
      workspaceId,
      userId,
      'email_enviado',
      `Email enviado a ${empresaNombre} (${to})`,
      token,
      'scripts',
      scriptId,
    );

    // Sync contact to MailerLite when email is actually sent
    if (process.env.MAILERLITE_API_KEY) {
      try {
        const { addSubscriber } = await import('@/lib/email/mailerlite');
        await addSubscriber({
          email: to,
          name: script.empresas?.nombre,
          fields: {
            company: script.empresas?.nombre || '',
            website: script.empresas?.website || '',
          },
        });
      } catch { /* silent fail */ }
    }

    return NextResponse.json({ success: true, emailId: result.id });
  } catch (error) {
    console.error('Send email error:', error);
    return NextResponse.json({ error: 'Error al enviar email. Intentalo de nuevo mas tarde.' }, { status: 500 });
  }
}
