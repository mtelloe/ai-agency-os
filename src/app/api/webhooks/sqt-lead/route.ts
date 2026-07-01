import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const N8N_WEBHOOK = 'https://automatizaciones-n8n.hjbrvj.easypanel.host/webhook/sqt-lead-nuevo';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const {
      nombre, email, telefono, nombre_centro, zona_centro,
      antiguedad_centro, clientas_mes, espiculas_previas,
      angulo, gclid, ttclid,
      utm_source, utm_medium, utm_campaign, utm_content,
    } = body;

    if (!nombre || !telefono || !zona_centro) {
      return NextResponse.json({ error: 'Faltan campos requeridos' }, { status: 400 });
    }

    const canal =
      utm_source === 'tiktok'  ? 'tiktok-ads'  :
      utm_source === 'youtube' ? 'youtube-ads' :
      utm_source || 'directo';

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );

    const { data: lead, error } = await supabase
      .from('sqt_leads')
      .insert({
        nombre,
        email:             email             || null,
        telefono,
        nombre_centro:     nombre_centro     || null,
        zona_centro,
        antiguedad_centro: antiguedad_centro || null,
        clientas_mes:      clientas_mes      || null,
        espiculas_previas: espiculas_previas || null,
        etapa:             'Lead Nuevo',
        canal,
        angulo:            angulo            || null,
        gclid:             gclid             || null,
        ttclid:            ttclid            || null,
        tags:              [],
      })
      .select('id')
      .single();

    if (error) {
      console.error('sqt-lead webhook: insert error:', error.message);
      return NextResponse.json({ error: 'Error al guardar el lead' }, { status: 500 });
    }

    // Fire n8n (fire-and-forget — no await)
    fetch(N8N_WEBHOOK, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        evento:       'lead_nuevo',
        id:           lead.id,
        nombre,
        email:        email        || null,
        telefono,
        nombre_centro: nombre_centro || null,
        zona_centro,
        canal,
        angulo:       angulo       || null,
        utm_source:   utm_source   || null,
        utm_medium:   utm_medium   || null,
        utm_campaign: utm_campaign || null,
        utm_content:  utm_content  || null,
      }),
    }).catch(e => console.error('sqt-lead: n8n trigger failed:', e));

    return NextResponse.json({ ok: true, id: lead.id });
  } catch (err) {
    console.error('sqt-lead webhook error:', err);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}
