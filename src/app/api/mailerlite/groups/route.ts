import { NextRequest, NextResponse } from 'next/server';
import { getTokenFromRequest } from '@/lib/supabase/api-client';
import { listGroups, isConfigured } from '@/lib/email/mailerlite';

export async function GET(request: NextRequest) {
  try {
    const token = getTokenFromRequest(request);
    if (!token) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    if (!isConfigured()) {
      return NextResponse.json({ error: 'MailerLite no configurado' }, { status: 503 });
    }

    const groups = await listGroups();

    return NextResponse.json({ groups });
  } catch (error) {
    console.error('MailerLite groups error:', error);
    return NextResponse.json(
      { error: 'Error al obtener grupos de MailerLite' },
      { status: 500 }
    );
  }
}
