const N8N_BASE_URL = process.env.N8N_BASE_URL;
const N8N_API_KEY = process.env.N8N_API_KEY;

export interface N8nWorkflow {
  id: string;
  name: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
  tags?: Array<{ id: string; name: string }>;
}

function assertConfigured(): void {
  if (!N8N_BASE_URL) {
    throw new Error('N8N_BASE_URL no esta configurada. Anade la variable de entorno para conectar con n8n.');
  }
  if (!N8N_API_KEY) {
    throw new Error('N8N_API_KEY no esta configurada. Anade la variable de entorno para conectar con n8n.');
  }
}

function getBaseUrl(): string {
  return N8N_BASE_URL!.replace(/\/+$/, '');
}

function apiHeaders(): Record<string, string> {
  return {
    'Content-Type': 'application/json',
    'X-N8N-API-KEY': N8N_API_KEY!,
  };
}

/**
 * Dispara un webhook de n8n enviando datos via POST.
 */
export async function triggerN8nWebhook(
  webhookPath: string,
  data: Record<string, unknown>
): Promise<unknown> {
  assertConfigured();

  const url = `${getBaseUrl()}/webhook/${webhookPath.replace(/^\/+/, '')}`;

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
    signal: AbortSignal.timeout(30000),
  });

  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new Error(`Error al disparar webhook n8n (${response.status}): ${text}`);
  }

  const contentType = response.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    return response.json();
  }
  return response.text();
}

/**
 * Lista todos los workflows de n8n.
 */
export async function listN8nWorkflows(): Promise<N8nWorkflow[]> {
  assertConfigured();

  const response = await fetch(`${getBaseUrl()}/api/v1/workflows`, {
    method: 'GET',
    headers: apiHeaders(),
    signal: AbortSignal.timeout(15000),
  });

  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new Error(`Error al obtener workflows de n8n (${response.status}): ${text}`);
  }

  const body = await response.json();
  return (body.data ?? body) as N8nWorkflow[];
}

/**
 * Obtiene un workflow especifico por ID.
 */
export async function getN8nWorkflow(id: string): Promise<N8nWorkflow> {
  assertConfigured();

  const response = await fetch(`${getBaseUrl()}/api/v1/workflows/${encodeURIComponent(id)}`, {
    method: 'GET',
    headers: apiHeaders(),
    signal: AbortSignal.timeout(15000),
  });

  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new Error(`Error al obtener workflow ${id} de n8n (${response.status}): ${text}`);
  }

  return response.json() as Promise<N8nWorkflow>;
}

/**
 * Activa o desactiva un workflow de n8n.
 */
export async function toggleN8nWorkflow(id: string, active: boolean): Promise<N8nWorkflow> {
  assertConfigured();

  const response = await fetch(`${getBaseUrl()}/api/v1/workflows/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    headers: apiHeaders(),
    body: JSON.stringify({ active }),
    signal: AbortSignal.timeout(15000),
  });

  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new Error(`Error al cambiar estado del workflow ${id} (${response.status}): ${text}`);
  }

  return response.json() as Promise<N8nWorkflow>;
}

/**
 * Comprueba si n8n esta configurado (variables de entorno presentes).
 */
export function isN8nConfigured(): boolean {
  return Boolean(N8N_BASE_URL && N8N_API_KEY);
}
