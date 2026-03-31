import { NextRequest, NextResponse } from 'next/server';
import { getTokenFromRequest, createApiClient } from '@/lib/supabase/api-client';
import { listN8nWorkflows, toggleN8nWorkflow, isN8nConfigured } from '@/lib/n8n/client';

export async function GET(request: NextRequest) {
  try {
    const token = getTokenFromRequest(request);
    if (!token) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    // Verificar que el usuario tiene sesion valida
    const db = createApiClient(token);
    const { data: { user }, error: authError } = await db.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Sesion no valida' }, { status: 401 });
    }

    if (!isN8nConfigured()) {
      return NextResponse.json(
        { error: 'n8n no esta configurado', configured: false, workflows: [] },
        { status: 200 }
      );
    }

    const workflows = await listN8nWorkflows();

    return NextResponse.json({ configured: true, workflows });
  } catch (error) {
    console.error('Error al listar workflows n8n:', error);
    return NextResponse.json(
      { error: 'Error al conectar con n8n', workflows: [] },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const token = getTokenFromRequest(request);
    if (!token) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    const db = createApiClient(token);
    const { data: { user }, error: authError } = await db.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Sesion no valida' }, { status: 401 });
    }

    if (!isN8nConfigured()) {
      return NextResponse.json({ error: 'n8n no esta configurado' }, { status: 400 });
    }

    const { id, active } = await request.json();

    if (!id || typeof active !== 'boolean') {
      return NextResponse.json({ error: 'Faltan campos: id y active son requeridos' }, { status: 400 });
    }

    // Validate workflow ID format (n8n uses numeric or short string IDs)
    if (typeof id !== 'string' || id.length > 50 || !/^[\w-]+$/.test(id)) {
      return NextResponse.json({ error: 'Formato de ID inválido' }, { status: 400 });
    }

    const workflow = await toggleN8nWorkflow(id, active);

    return NextResponse.json({ workflow });
  } catch (error) {
    console.error('Error al cambiar estado del workflow:', error);
    return NextResponse.json(
      { error: 'Error al cambiar estado del workflow' },
      { status: 500 }
    );
  }
}
