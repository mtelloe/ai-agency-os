import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { from_email, subject, api_key } = body;

    if (api_key !== process.env.INTERNAL_WEBHOOK_SECRET) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    if (!from_email || typeof from_email !== 'string') {
      return NextResponse.json({ error: 'from_email requerido' }, { status: 400 });
    }

    const email = from_email.toLowerCase().trim();

    const { data: leads } = await supabase
      .from('leads')
      .select('id, workspace_id, nombre_contacto, decisor_email, email, estado_pipeline, empresas(nombre)')
      .or(`decisor_email.ilike.${email},email.ilike.${email}`)
      .not('estado_pipeline', 'in', '("Ganado","Perdido","Follow-up","Demo creada","Propuesta enviada")')
      .limit(1);

    if (!leads || leads.length === 0) {
      return NextResponse.json({ found: false, message: 'Lead no encontrado para ese email' });
    }

    const lead = leads[0] as any;
    const empresa = lead.empresas?.nombre || 'Empresa desconocida';

    await supabase
      .from('leads')
      .update({ estado_pipeline: 'Follow-up', ultima_actividad_at: new Date().toISOString() })
      .eq('id', lead.id);

    await supabase.from('actividad').insert({
      workspace_id: lead.workspace_id,
      tipo_evento: 'respuesta_recibida',
      descripcion: `Respuesta de email recibida${subject ? `: "${subject}"` : ''}`,
      entidad_tipo: 'leads',
      entidad_id: lead.id,
    });

    return NextResponse.json({ found: true, empresa, lead_id: lead.id });
  } catch (error) {
    console.error('lead-reply webhook error:', error);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}
