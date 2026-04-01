const MAILERLITE_API = 'https://connect.mailerlite.com/api';

function getHeaders() {
  return {
    'Authorization': `Bearer ${process.env.MAILERLITE_API_KEY}`,
    'Content-Type': 'application/json',
  };
}

export function isConfigured(): boolean {
  return !!process.env.MAILERLITE_API_KEY;
}

export async function addSubscriber(data: {
  email: string;
  name?: string;
  fields?: Record<string, string>;
  groups?: string[];
}): Promise<{ success: boolean; id?: string; error?: string }> {
  if (!isConfigured()) {
    return { success: false, error: 'MAILERLITE_API_KEY no configurada' };
  }

  try {
    const body: Record<string, unknown> = {
      email: data.email,
    };

    if (data.name) {
      body.fields = { ...data.fields, name: data.name };
    } else if (data.fields) {
      body.fields = data.fields;
    }

    if (data.groups?.length) {
      body.groups = data.groups;
    }

    const response = await fetch(`${MAILERLITE_API}/subscribers`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(body),
    });

    const result = await response.json();

    if (!response.ok) {
      return {
        success: false,
        error: result.message || `Error ${response.status}: ${response.statusText}`,
      };
    }

    return { success: true, id: result.data?.id };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Error desconocido al sincronizar con MailerLite';
    return { success: false, error: message };
  }
}

export async function listGroups(): Promise<Array<{ id: string; name: string; subscriber_count: number }>> {
  if (!isConfigured()) return [];

  try {
    const response = await fetch(`${MAILERLITE_API}/groups?limit=100`, {
      method: 'GET',
      headers: getHeaders(),
    });

    if (!response.ok) return [];

    const result = await response.json();
    return (result.data || []).map((g: { id: string; name: string; active_count: number }) => ({
      id: g.id,
      name: g.name,
      subscriber_count: g.active_count || 0,
    }));
  } catch {
    return [];
  }
}

export async function createGroup(name: string): Promise<{ id: string; name: string } | null> {
  if (!isConfigured()) return null;

  try {
    const response = await fetch(`${MAILERLITE_API}/groups`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ name }),
    });

    if (!response.ok) return null;

    const result = await response.json();
    return result.data ? { id: result.data.id, name: result.data.name } : null;
  } catch {
    return null;
  }
}

export async function findOrCreateGroup(name: string): Promise<string | null> {
  const groups = await listGroups();
  const existing = groups.find((g) => g.name === name);
  if (existing) return existing.id;

  const created = await createGroup(name);
  return created?.id || null;
}
