# B2B Lead Scraping & Enrichment Pipeline — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the broken prospecting pipeline with Apify Google Maps (discovery) + Apollo.io (enrichment) orchestrated by n8n, so each lead includes the decision-maker's name, email, and mobile phone.

**Architecture:** n8n workflow triggers Apify to discover businesses, then Apollo People Search to find the decision-maker at each company. New API routes handle deduplication and storing enriched leads. The existing prospect route becomes a thin trigger for the n8n pipeline.

**Tech Stack:** Next.js 16, Supabase (Postgres), Apify REST API, Apollo.io REST API, n8n webhooks, TypeScript

---

## File Structure

| File | Action | Responsibility |
|------|--------|----------------|
| `src/lib/apollo.ts` | Create | Apollo API client: people search, contact enrichment |
| `src/lib/google-maps.ts` | Modify | Swap actor to `nwua9~google-maps-scraper`, update field mapping |
| `src/app/api/prospecting/workspaces-activos/route.ts` | Create | GET endpoint for n8n: returns workspaces with auto_prospecting |
| `src/app/api/prospecting/manual/route.ts` | Create | POST endpoint: triggers n8n pipeline for one workspace |
| `src/app/api/webhooks/n8n/route.ts` | Modify | Add handlers: `check-duplicate`, `prospect-complete`, `prospect-error` |
| `src/app/api/ai/prospect/route.ts` | Modify | Refactor to trigger n8n instead of calling Apify directly |
| `src/lib/types/database.ts` | Modify | Add enrichment fields to Lead interface |
| `src/app/(dashboard)/prospeccion/page.tsx` | Modify | Show enrichment status, async feedback |
| `src/app/(dashboard)/pipeline/page.tsx` | Modify | Show decisor name, email, phone in lead cards |

---

### Task 1: Apollo API Client

**Files:**
- Create: `src/lib/apollo.ts`

- [ ] **Step 1: Create Apollo client with people search**

```typescript
// src/lib/apollo.ts

const APOLLO_API_KEY = process.env.APOLLO_API_KEY;
const APOLLO_BASE_URL = 'https://api.apollo.io/api/v1';

// Titles that indicate a decision-maker, in Spanish and English
const DECISION_MAKER_TITLES = [
  'Owner', 'Propietario', 'CEO', 'Director General',
  'Gerente', 'Fundador', 'Director', 'Responsable',
  'Managing Director', 'Co-Founder', 'Cofundador',
];

export interface ApolloContact {
  nombre: string;
  cargo: string | null;
  email: string | null;
  movil: string | null;
  linkedin: string | null;
  organizacion: string | null;
}

/**
 * Search Apollo for a decision-maker at a given company.
 * First tries by domain, then falls back to company name + location.
 */
export async function searchDecisionMaker(
  domain: string | null,
  companyName: string,
  location: string = 'Spain',
): Promise<ApolloContact | null> {
  if (!APOLLO_API_KEY) {
    console.error('[apollo] APOLLO_API_KEY no configurada');
    return null;
  }

  // Attempt 1: search by domain
  if (domain) {
    const result = await apolloPeopleSearch({
      q_organization_domains: [domain],
      person_titles: DECISION_MAKER_TITLES,
      person_locations: [location],
    });
    if (result) return result;
  }

  // Attempt 2: search by company name
  const result = await apolloPeopleSearch({
    q_organization_name: companyName,
    person_titles: DECISION_MAKER_TITLES,
    person_locations: [location],
  });
  return result;
}

/**
 * Request a mobile number for a specific Apollo person.
 * Consumes 1 mobile credit — only call for high-score leads.
 */
export async function revealMobile(apolloPersonId: string): Promise<string | null> {
  if (!APOLLO_API_KEY) return null;

  try {
    const res = await fetch(`${APOLLO_BASE_URL}/people/match`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Api-Key': APOLLO_API_KEY,
      },
      body: JSON.stringify({ id: apolloPersonId, reveal_phone_number: true }),
      signal: AbortSignal.timeout(15000),
    });

    if (!res.ok) return null;

    const data = await res.json();
    const phones = data.person?.phone_numbers;
    if (Array.isArray(phones) && phones.length > 0) {
      const mobile = phones.find((p: { type?: string }) => p.type === 'mobile');
      return (mobile || phones[0]).sanitized_number || null;
    }
    return null;
  } catch {
    return null;
  }
}

async function apolloPeopleSearch(
  params: Record<string, unknown>,
): Promise<ApolloContact | null> {
  try {
    const res = await fetch(`${APOLLO_BASE_URL}/mixed_people/search`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Api-Key': APOLLO_API_KEY!,
      },
      body: JSON.stringify({
        ...params,
        page: 1,
        per_page: 1,
      }),
      signal: AbortSignal.timeout(15000),
    });

    if (!res.ok) {
      console.error(`[apollo] People search failed: ${res.status}`);
      return null;
    }

    const data = await res.json();
    const people = data.people;
    if (!Array.isArray(people) || people.length === 0) return null;

    const person = people[0];
    return {
      nombre: [person.first_name, person.last_name].filter(Boolean).join(' '),
      cargo: person.title || null,
      email: person.email || null,
      movil: null, // Mobile requires separate reveal call
      linkedin: person.linkedin_url || null,
      organizacion: person.organization?.name || null,
    };
  } catch (error) {
    console.error('[apollo] People search error:', error);
    return null;
  }
}

export function isApolloConfigured(): boolean {
  return Boolean(APOLLO_API_KEY);
}
```

- [ ] **Step 2: Verify the file compiles**

Run: `cd /Users/mariatelloesbri/ai-agency-analysis/ai-agency-os && npx tsc --noEmit src/lib/apollo.ts 2>&1 | head -20`
Expected: No errors (or only unrelated project-wide errors)

- [ ] **Step 3: Commit**

```bash
git add src/lib/apollo.ts
git commit -m "feat: add Apollo.io API client for decision-maker search"
```

---

### Task 2: Update Google Maps Actor

**Files:**
- Modify: `src/lib/google-maps.ts`

- [ ] **Step 1: Change actor ID and add google_maps_url field**

In `src/lib/google-maps.ts`, replace the full file content:

```typescript
// src/lib/google-maps.ts

const APIFY_TOKEN = process.env.APIFY_API_TOKEN;
const ACTOR_ID = 'nwua9~google-maps-scraper';

export interface GoogleMapsResult {
  title: string;
  phone: string | null;
  website: string | null;
  address: string | null;
  city: string | null;
  totalScore: number | null;
  reviewsCount: number | null;
  categoryName: string | null;
  placeId: string | null;
  googleMapsUrl: string | null;
}

/**
 * Search Google Maps for businesses via Apify.
 * @param query - Search query (e.g. "centro estetica Barcelona")
 * @param maxResults - How many results to return
 * @param excludeNames - Businesses already in the system (normalized lowercase names) to skip
 */
export async function searchGoogleMaps(
  query: string,
  maxResults: number = 5,
  excludeNames: string[] = [],
): Promise<GoogleMapsResult[]> {
  if (!APIFY_TOKEN) return [];

  try {
    const requestCount = maxResults + excludeNames.length + 5;

    const res = await fetch(
      `https://api.apify.com/v2/acts/${ACTOR_ID}/run-sync-get-dataset-items?token=${APIFY_TOKEN}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          searchStringsArray: [query],
          maxCrawledPlacesPerSearch: Math.min(requestCount, 30),
          language: 'es',
          countryCode: 'es',
          skipClosedPlaces: true,
        }),
        signal: AbortSignal.timeout(120000), // 2 min — new actor can be slower
      }
    );

    if (!res.ok) return [];

    const items = await res.json();
    if (!Array.isArray(items)) return [];

    const excludeSet = new Set(excludeNames.map(n => normalizeName(n)));

    const results: GoogleMapsResult[] = [];
    for (const item of items) {
      const title = (item.title as string) || '';
      if (!title) continue;

      if (excludeSet.has(normalizeName(title))) continue;

      const phone = (item.phone as string) || null;
      const website = (item.website as string) || null;
      if (results.some(r =>
        normalizeName(r.title) === normalizeName(title) ||
        (phone && r.phone === phone) ||
        (website && r.website && normalizeUrl(r.website) === normalizeUrl(website))
      )) continue;

      results.push({
        title,
        phone,
        website,
        address: (item.address as string) || null,
        city: (item.city as string) || null,
        totalScore: (item.totalScore as number) || null,
        reviewsCount: (item.reviewsCount as number) || null,
        categoryName: (item.categoryName as string) || null,
        placeId: (item.placeId as string) || null,
        googleMapsUrl: (item.url as string) || null,
      });

      if (results.length >= maxResults) break;
    }

    return results;
  } catch {
    return [];
  }
}

function normalizeName(name: string): string {
  return name.toLowerCase().trim()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ');
}

function normalizeUrl(url: string): string {
  try {
    const u = new URL(url);
    return u.hostname.replace('www.', '').toLowerCase();
  } catch {
    return url.toLowerCase().replace('www.', '');
  }
}
```

Changes vs original:
- Actor: `compass~crawler-google-places` → `nwua9~google-maps-scraper`
- Added `skipClosedPlaces: true` to config
- Added `googleMapsUrl` field (from `item.url`)
- Timeout increased to 120s (new actor can take longer)

- [ ] **Step 2: Verify it compiles**

Run: `cd /Users/mariatelloesbri/ai-agency-analysis/ai-agency-os && npx tsc --noEmit src/lib/google-maps.ts 2>&1 | head -20`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add src/lib/google-maps.ts
git commit -m "fix: swap Apify actor to nwua9~google-maps-scraper for reliable Google Maps scraping"
```

---

### Task 3: Update Lead Type with Enrichment Fields

**Files:**
- Modify: `src/lib/types/database.ts`

- [ ] **Step 1: Add enrichment fields to Lead interface**

In `src/lib/types/database.ts`, find the `Lead` interface and add the new fields before the closing `}`:

Find:
```typescript
export interface Lead {
  id: string;
  workspace_id: string;
  empresa_id: string | null;
  nombre_contacto: string;
  cargo: string | null;
  email: string | null;
  telefono: string | null;
  estado_pipeline: EstadoPipeline;
  valor_estimado: number | null;
  score: number | null;
  fuente: string | null;
  proximo_paso: string | null;
  owner_user_id: string | null;
  ultima_actividad_at: string;
  created_at: string;
  updated_at: string;
  empresa?: Empresa;
}
```

Replace with:
```typescript
export type EnrichmentStatus = 'pending' | 'full' | 'partial' | 'no_contact';

export interface Lead {
  id: string;
  workspace_id: string;
  empresa_id: string | null;
  nombre_contacto: string;
  cargo: string | null;
  email: string | null;
  telefono: string | null;
  estado_pipeline: EstadoPipeline;
  valor_estimado: number | null;
  score: number | null;
  fuente: string | null;
  proximo_paso: string | null;
  owner_user_id: string | null;
  ultima_actividad_at: string;
  created_at: string;
  updated_at: string;
  // Enrichment fields (Apollo)
  decisor_nombre: string | null;
  decisor_cargo: string | null;
  decisor_email: string | null;
  decisor_movil: string | null;
  decisor_linkedin: string | null;
  enrichment_status: EnrichmentStatus;
  enrichment_source: string | null;
  empresa?: Empresa;
}
```

- [ ] **Step 2: Verify it compiles**

Run: `cd /Users/mariatelloesbri/ai-agency-analysis/ai-agency-os && npx tsc --noEmit 2>&1 | head -30`
Expected: May show errors in files that create Lead objects without the new fields — these will be fixed in later tasks.

- [ ] **Step 3: Commit**

```bash
git add src/lib/types/database.ts
git commit -m "feat: add enrichment fields to Lead type for decision-maker data"
```

---

### Task 4: Supabase Migration — Add Enrichment Columns

**Files:**
- Create: `supabase/migrations/20260413_add_lead_enrichment_fields.sql`

- [ ] **Step 1: Create the migration file**

```sql
-- supabase/migrations/20260413_add_lead_enrichment_fields.sql
-- Adds decision-maker enrichment fields to leads table

ALTER TABLE leads ADD COLUMN IF NOT EXISTS decisor_nombre TEXT;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS decisor_cargo TEXT;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS decisor_email TEXT;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS decisor_movil TEXT;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS decisor_linkedin TEXT;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS enrichment_status TEXT DEFAULT 'pending'
  CHECK (enrichment_status IN ('pending', 'full', 'partial', 'no_contact'));
ALTER TABLE leads ADD COLUMN IF NOT EXISTS enrichment_source TEXT;
```

- [ ] **Step 2: Apply the migration via Supabase dashboard or CLI**

Run: Apply via Supabase MCP tool `apply_migration` with the SQL above, or run manually in the Supabase SQL editor.

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/20260413_add_lead_enrichment_fields.sql
git commit -m "feat: add enrichment columns to leads table (decisor, email, movil)"
```

---

### Task 5: Workspaces Activos Endpoint (for n8n)

**Files:**
- Create: `src/app/api/prospecting/workspaces-activos/route.ts`

- [ ] **Step 1: Create the endpoint**

```typescript
// src/app/api/prospecting/workspaces-activos/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function getServerClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}

function verifyN8nAuth(request: NextRequest): boolean {
  const apiKey = process.env.N8N_API_KEY;
  if (!apiKey) return false;
  return request.headers.get('X-N8N-API-KEY') === apiKey;
}

/**
 * GET /api/prospecting/workspaces-activos
 * Returns workspaces that have auto_prospecting enabled and enough credits.
 * Called by n8n cron workflow.
 */
export async function GET(request: NextRequest) {
  if (!verifyN8nAuth(request)) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  const db = getServerClient();

  const { data: workspaces, error } = await db
    .from('workspaces')
    .select('id, nombre, nicho_principal, ciudad_principal, creditos_total, creditos_usados')
    .eq('auto_prospecting', true);

  if (error) {
    console.error('[workspaces-activos] Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Filter to workspaces with at least 2 credits available
  const activos = (workspaces || []).filter(
    (w) => w.creditos_total - w.creditos_usados >= 2
  );

  return NextResponse.json({ workspaces: activos });
}
```

- [ ] **Step 2: Verify it compiles**

Run: `cd /Users/mariatelloesbri/ai-agency-analysis/ai-agency-os && npx tsc --noEmit src/app/api/prospecting/workspaces-activos/route.ts 2>&1 | head -20`

- [ ] **Step 3: Commit**

```bash
git add src/app/api/prospecting/workspaces-activos/route.ts
git commit -m "feat: add workspaces-activos endpoint for n8n auto-prospecting"
```

---

### Task 6: Add Webhook Handlers (check-duplicate, prospect-complete, prospect-error)

**Files:**
- Modify: `src/app/api/webhooks/n8n/route.ts`

- [ ] **Step 1: Add the check-duplicate handler**

In `src/app/api/webhooks/n8n/route.ts`, add after the `handleLeadUpdate` function (before the `POST` export):

```typescript
/**
 * Handle "check-duplicate" action: check if a business already exists in workspace
 */
async function handleCheckDuplicate(
  db: ReturnType<typeof getServerClient>,
  data: Record<string, unknown>,
): Promise<{ success: boolean; duplicate: boolean; message: string }> {
  const { workspaceId, domain, phone, name } = data;

  if (!workspaceId || typeof workspaceId !== 'string') {
    return { success: false, duplicate: false, message: 'Falta workspaceId' };
  }

  const { data: empresas } = await db
    .from('empresas')
    .select('id, nombre, website, telefono')
    .eq('workspace_id', workspaceId);

  if (!empresas || empresas.length === 0) {
    return { success: true, duplicate: false, message: 'No hay empresas en el workspace' };
  }

  const normalizedName = typeof name === 'string'
    ? name.toLowerCase().trim().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9\s]/g, '').replace(/\s+/g, ' ')
    : '';

  const normalizedDomain = typeof domain === 'string'
    ? domain.toLowerCase().replace('www.', '').replace(/\/+$/, '')
    : '';

  const normalizedPhone = typeof phone === 'string'
    ? phone.replace(/\s/g, '')
    : '';

  for (const emp of empresas) {
    // Check by domain
    if (normalizedDomain && emp.website) {
      try {
        const empDomain = new URL(emp.website).hostname.replace('www.', '').toLowerCase();
        if (empDomain === normalizedDomain) {
          return { success: true, duplicate: true, message: `Duplicado por dominio: ${emp.nombre}` };
        }
      } catch { /* skip */ }
    }

    // Check by phone
    if (normalizedPhone && emp.telefono) {
      if (emp.telefono.replace(/\s/g, '') === normalizedPhone) {
        return { success: true, duplicate: true, message: `Duplicado por telefono: ${emp.nombre}` };
      }
    }

    // Check by name
    if (normalizedName && emp.nombre) {
      const empName = emp.nombre.toLowerCase().trim().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9\s]/g, '').replace(/\s+/g, ' ');
      if (empName === normalizedName) {
        return { success: true, duplicate: true, message: `Duplicado por nombre: ${emp.nombre}` };
      }
    }
  }

  return { success: true, duplicate: false, message: 'No es duplicado' };
}
```

- [ ] **Step 2: Add the prospect-complete handler**

Add after `handleCheckDuplicate`:

```typescript
/**
 * Handle "prospect-complete" action: save enriched empresa + lead from n8n pipeline
 */
async function handleProspectComplete(
  db: ReturnType<typeof getServerClient>,
  data: Record<string, unknown>,
): Promise<{ success: boolean; message: string }> {
  const { workspace_id, empresa, lead } = data;

  if (!workspace_id || typeof workspace_id !== 'string') {
    return { success: false, message: 'Falta workspace_id' };
  }
  if (!empresa || typeof empresa !== 'object') {
    return { success: false, message: 'Falta datos de empresa' };
  }

  const emp = empresa as Record<string, unknown>;
  const leadData = (lead || {}) as Record<string, unknown>;

  // Create empresa
  const { data: newEmpresa, error: empresaError } = await db
    .from('empresas')
    .insert({
      workspace_id,
      nombre: emp.name || emp.nombre || 'Sin nombre',
      website: emp.website || null,
      telefono: emp.phone || emp.telefono || null,
      ciudad: emp.city || emp.ciudad || null,
      nicho: emp.nicho || null,
      origen: 'prospecting',
    })
    .select('id')
    .single();

  if (empresaError) {
    console.error('[webhook-n8n] Error creando empresa:', empresaError);
    return { success: false, message: `Error al crear empresa: ${empresaError.message}` };
  }

  // Calculate score
  let score = 70;
  if (!emp.website) score += 15;
  const reviews = Number(emp.reviews) || 0;
  if (reviews < 20) score += 5;
  const rating = Number(emp.rating) || 5;
  if (rating < 4.5) score += 5;
  score = Math.min(95, Math.max(60, score));

  const valor = emp.website ? 1000 : 2000;
  const enrichmentStatus = leadData.enrichment_status || 'no_contact';
  const contactName = (leadData.decisor_nombre as string) || `Responsable de ${emp.name || emp.nombre}`;

  // Create lead with enrichment data
  const { error: leadError } = await db
    .from('leads')
    .insert({
      workspace_id,
      empresa_id: newEmpresa.id,
      nombre_contacto: contactName,
      cargo: (leadData.decisor_cargo as string) || null,
      email: (leadData.decisor_email as string) || null,
      telefono: (leadData.decisor_movil as string) || (emp.phone as string) || null,
      estado_pipeline: 'Nuevo',
      score,
      valor_estimado: valor,
      fuente: 'Google Maps + Apollo',
      decisor_nombre: (leadData.decisor_nombre as string) || null,
      decisor_cargo: (leadData.decisor_cargo as string) || null,
      decisor_email: (leadData.decisor_email as string) || null,
      decisor_movil: (leadData.decisor_movil as string) || null,
      decisor_linkedin: (leadData.decisor_linkedin as string) || null,
      enrichment_status: enrichmentStatus,
      enrichment_source: (leadData.source as string) || 'apify+apollo',
    });

  if (leadError) {
    console.error('[webhook-n8n] Error creando lead:', leadError);
    return { success: false, message: `Error al crear lead: ${leadError.message}` };
  }

  // Log activity
  await db.from('actividad').insert({
    workspace_id,
    user_id: null,
    tipo_evento: 'prospeccion_completada',
    descripcion: `Lead enriquecido: ${contactName} (${enrichmentStatus}) via n8n pipeline`,
    entidad_tipo: 'empresa',
    entidad_id: newEmpresa.id,
    metadata: { enrichment_status: enrichmentStatus, source: 'n8n_pipeline' },
  });

  return { success: true, message: `Empresa + lead creados (enrichment: ${enrichmentStatus})` };
}

/**
 * Handle "prospect-error" action: log pipeline failure
 */
async function handleProspectError(
  db: ReturnType<typeof getServerClient>,
  data: Record<string, unknown>,
): Promise<{ success: boolean; message: string }> {
  const { workspace_id, error_message } = data;

  if (workspace_id && typeof workspace_id === 'string') {
    await db.from('actividad').insert({
      workspace_id,
      user_id: null,
      tipo_evento: 'prospeccion_error',
      descripcion: `Error en pipeline de prospeccion: ${String(error_message || 'Error desconocido')}`,
      entidad_tipo: 'workspace',
      entidad_id: workspace_id,
      metadata: { error: String(error_message || 'unknown'), source: 'n8n_pipeline' },
    });
  }

  console.error(`[webhook-n8n] Prospect error for workspace ${workspace_id}:`, error_message);
  return { success: true, message: 'Error registrado' };
}
```

- [ ] **Step 3: Wire the new handlers into the switch statement**

In the same file, find the `switch (action)` block and add the new cases before `default`:

```typescript
      case 'check-duplicate': {
        const result = await handleCheckDuplicate(db, actionData);
        return NextResponse.json(result, { status: result.success ? 200 : 400 });
      }

      case 'prospect-complete': {
        const result = await handleProspectComplete(db, actionData);
        return NextResponse.json(result, { status: result.success ? 200 : 400 });
      }

      case 'prospect-error': {
        const result = await handleProspectError(db, actionData);
        return NextResponse.json(result, { status: 200 });
      }
```

- [ ] **Step 4: Verify it compiles**

Run: `cd /Users/mariatelloesbri/ai-agency-analysis/ai-agency-os && npx tsc --noEmit src/app/api/webhooks/n8n/route.ts 2>&1 | head -20`

- [ ] **Step 5: Commit**

```bash
git add src/app/api/webhooks/n8n/route.ts
git commit -m "feat: add n8n webhook handlers for check-duplicate, prospect-complete, prospect-error"
```

---

### Task 7: Manual Prospecting Trigger Endpoint

**Files:**
- Create: `src/app/api/prospecting/manual/route.ts`

- [ ] **Step 1: Create the endpoint that triggers n8n**

```typescript
// src/app/api/prospecting/manual/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { createApiClient, getTokenFromRequest } from '@/lib/supabase/api-client';
import { spendCredit, logActivity } from '@/lib/credits';
import { triggerN8nWebhook, isN8nConfigured } from '@/lib/n8n/client';

/**
 * POST /api/prospecting/manual
 * Triggers the n8n prospect-enrich pipeline for a single workspace.
 * Called from the dashboard "Buscar leads" button.
 */
export async function POST(request: NextRequest) {
  try {
    const token = getTokenFromRequest(request);
    if (!token) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });

    const db = createApiClient(token);
    const body = await request.json();
    const { nicho, ciudad, workspaceId, userId } = body;
    const cantidad = Math.min(Math.max(1, Number(body.cantidad) || 5), 20);

    if (!nicho || !ciudad || !workspaceId || !userId) {
      return NextResponse.json({ error: 'Faltan campos requeridos' }, { status: 400 });
    }

    if (typeof nicho !== 'string' || nicho.length > 200 || typeof ciudad !== 'string' || ciudad.length > 200) {
      return NextResponse.json({ error: 'Datos de entrada invalidos' }, { status: 400 });
    }

    if (!isN8nConfigured()) {
      return NextResponse.json({ error: 'n8n no configurado' }, { status: 503 });
    }

    // Spend 2 credits upfront
    const spent1 = await spendCredit(workspaceId, userId, 'prospeccion', `Prospeccion: ${nicho} en ${ciudad}`, token);
    if (!spent1) return NextResponse.json({ error: 'No tienes creditos suficientes' }, { status: 402 });
    const spent2 = await spendCredit(workspaceId, userId, 'prospeccion', `Prospeccion (2/2): ${nicho} en ${ciudad}`, token);
    if (!spent2) return NextResponse.json({ error: 'No tienes creditos suficientes' }, { status: 402 });

    // Trigger n8n pipeline — returns immediately, n8n calls back via webhooks
    await triggerN8nWebhook('prospect-enrich', {
      workspace_id: workspaceId,
      nicho,
      ciudad,
      cantidad,
      callback_url: `${process.env.BASE_URL || process.env.NEXT_PUBLIC_APP_URL}/api/webhooks/n8n`,
    });

    await logActivity(
      workspaceId, userId, 'prospeccion_iniciada',
      `Prospeccion iniciada: ${nicho} en ${ciudad} (${cantidad} leads)`,
      token,
    );

    return NextResponse.json({
      message: 'Prospeccion iniciada. Los leads apareceran en el pipeline cuando esten listos.',
      status: 'processing',
    });
  } catch (error) {
    console.error('[prospecting/manual] Error:', error);
    return NextResponse.json({ error: 'Error al iniciar prospeccion' }, { status: 500 });
  }
}
```

- [ ] **Step 2: Verify it compiles**

Run: `cd /Users/mariatelloesbri/ai-agency-analysis/ai-agency-os && npx tsc --noEmit src/app/api/prospecting/manual/route.ts 2>&1 | head -20`

- [ ] **Step 3: Commit**

```bash
git add src/app/api/prospecting/manual/route.ts
git commit -m "feat: add manual prospecting trigger endpoint for n8n pipeline"
```

---

### Task 8: Refactor Original Prospect Route to Use n8n Pipeline

**Files:**
- Modify: `src/app/api/ai/prospect/route.ts`

- [ ] **Step 1: Replace the direct Apify call with n8n trigger**

Replace the full content of `src/app/api/ai/prospect/route.ts`:

```typescript
// src/app/api/ai/prospect/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { createApiClient, getTokenFromRequest } from '@/lib/supabase/api-client';
import { spendCredit, logActivity } from '@/lib/credits';
import { triggerN8nWebhook, isN8nConfigured } from '@/lib/n8n/client';
import { searchGoogleMaps } from '@/lib/google-maps';

export async function POST(request: NextRequest) {
  try {
    const token = getTokenFromRequest(request);
    if (!token) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });

    const db = createApiClient(token);
    const body = await request.json();
    const { nicho, ciudad, workspaceId, userId } = body;
    const cantidad = Math.min(Math.max(1, Number(body.cantidad) || 5), 20);

    if (!nicho || !ciudad || !workspaceId || !userId) {
      return NextResponse.json({ error: 'Faltan campos requeridos' }, { status: 400 });
    }

    if (typeof nicho !== 'string' || nicho.length > 200 || typeof ciudad !== 'string' || ciudad.length > 200) {
      return NextResponse.json({ error: 'Datos de entrada invalidos' }, { status: 400 });
    }

    // Spend 2 credits
    const spent1 = await spendCredit(workspaceId, userId, 'prospeccion', `Prospeccion: ${nicho} en ${ciudad}`, token);
    if (!spent1) return NextResponse.json({ error: 'No tienes creditos suficientes' }, { status: 402 });
    const spent2 = await spendCredit(workspaceId, userId, 'prospeccion', `Prospeccion (2/2): ${nicho} en ${ciudad}`, token);
    if (!spent2) return NextResponse.json({ error: 'No tienes creditos suficientes' }, { status: 402 });

    // If n8n is configured, use the async pipeline (Apify + Apollo enrichment)
    if (isN8nConfigured()) {
      await triggerN8nWebhook('prospect-enrich', {
        workspace_id: workspaceId,
        nicho,
        ciudad,
        cantidad,
        callback_url: `${process.env.BASE_URL || process.env.NEXT_PUBLIC_APP_URL}/api/webhooks/n8n`,
      });

      await logActivity(
        workspaceId, userId, 'prospeccion_iniciada',
        `Prospeccion con enriquecimiento: ${nicho} en ${ciudad} (${cantidad} leads)`,
        token,
      );

      return NextResponse.json({
        message: 'Prospeccion iniciada. Los leads apareceran en el pipeline cuando esten listos.',
        status: 'processing',
        async: true,
      });
    }

    // Fallback: direct Apify call without Apollo enrichment (if n8n not configured)
    const { data: existingEmpresas } = await db
      .from('empresas')
      .select('nombre, website, telefono')
      .eq('workspace_id', workspaceId);

    const existingNames = (existingEmpresas || []).map(e => e.nombre || '');
    const existingWebsites = new Set(
      (existingEmpresas || []).filter(e => e.website).map(e => {
        try { return new URL(e.website!).hostname.replace('www.', '').toLowerCase(); }
        catch { return e.website!.toLowerCase().replace('www.', ''); }
      })
    );
    const existingPhones = new Set(
      (existingEmpresas || []).filter(e => e.telefono).map(e => e.telefono!.replace(/\s/g, ''))
    );

    const query = `${nicho} ${ciudad}`;
    const mapResults = await searchGoogleMaps(query, cantidad, existingNames);

    if (mapResults.length === 0) {
      return NextResponse.json({ error: 'No se encontraron negocios NUEVOS en Google Maps.' }, { status: 404 });
    }

    const createdLeads = [];

    for (const biz of mapResults) {
      if (biz.website) {
        try {
          const domain = new URL(biz.website).hostname.replace('www.', '').toLowerCase();
          if (existingWebsites.has(domain)) continue;
        } catch { /* skip */ }
      }
      if (biz.phone && existingPhones.has(biz.phone.replace(/\s/g, ''))) continue;

      let score = 70;
      if (!biz.website) score += 15;
      if ((biz.reviewsCount || 0) < 20) score += 5;
      if ((biz.totalScore || 5) < 4.5) score += 5;
      score = Math.min(95, Math.max(60, score));

      const valor = biz.website ? 1000 : 2000;

      const { data: empresa, error: empresaError } = await db
        .from('empresas')
        .insert({
          workspace_id: workspaceId,
          nombre: biz.title,
          website: biz.website,
          telefono: biz.phone,
          ciudad: biz.city || ciudad,
          nicho,
          origen: 'prospecting',
        })
        .select()
        .single();

      if (empresaError) { console.error('Error creating empresa:', empresaError); continue; }

      const { data: lead, error: leadError } = await db
        .from('leads')
        .insert({
          workspace_id: workspaceId,
          empresa_id: empresa.id,
          nombre_contacto: `Responsable de ${biz.title}`,
          telefono: biz.phone,
          estado_pipeline: 'Nuevo',
          score,
          valor_estimado: valor,
          fuente: 'Google Maps',
          enrichment_status: 'pending',
          enrichment_source: 'apify',
        })
        .select()
        .single();

      if (leadError) { console.error('Error creating lead:', leadError); continue; }
      createdLeads.push({ ...lead, empresa });

      existingNames.push(biz.title);
      if (biz.website) {
        try { existingWebsites.add(new URL(biz.website).hostname.replace('www.', '').toLowerCase()); }
        catch { /* skip */ }
      }
      if (biz.phone) existingPhones.add(biz.phone.replace(/\s/g, ''));
    }

    await logActivity(workspaceId, userId, 'prospeccion_completada',
      `Prospeccion directa: ${createdLeads.length} negocios de ${nicho} en ${ciudad} (sin enriquecimiento)`,
      token, 'leads', createdLeads[0]?.id);

    return NextResponse.json({ leads: createdLeads, total: createdLeads.length, async: false });
  } catch (error) {
    console.error('Prospect error:', error);
    return NextResponse.json({ error: 'Error al prospectar.' }, { status: 500 });
  }
}
```

Key changes:
- If n8n is configured → triggers async pipeline (returns immediately with `async: true`)
- If n8n is NOT configured → falls back to direct Apify call (original behavior, but adds `enrichment_status: 'pending'`)
- Adds `enrichment_status` and `enrichment_source` to lead creation

- [ ] **Step 2: Verify it compiles**

Run: `cd /Users/mariatelloesbri/ai-agency-analysis/ai-agency-os && npx tsc --noEmit src/app/api/ai/prospect/route.ts 2>&1 | head -20`

- [ ] **Step 3: Commit**

```bash
git add src/app/api/ai/prospect/route.ts
git commit -m "refactor: prospect route now triggers n8n pipeline with Apollo enrichment"
```

---

### Task 9: Update Pipeline UI — Show Decision-Maker Info

**Files:**
- Modify: `src/app/(dashboard)/pipeline/page.tsx`

- [ ] **Step 1: Update LeadCard to show enrichment data**

In `src/app/(dashboard)/pipeline/page.tsx`, find the `LeadCard` component and replace it:

Find:
```typescript
function LeadCard({ lead }: { lead: LeadWithEmpresa }) {
  const scoreColor = (lead.score || 0) >= 80 ? 'text-green-500' : (lead.score || 0) >= 60 ? 'text-yellow-500' : 'text-red-500';

  return (
    <Card className="hover:border-primary/30 transition-colors">
      <CardContent className="p-3 space-y-2">
        <div className="flex items-start justify-between">
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium truncate">{lead.nombre_contacto}</p>
            <p className="text-xs text-muted-foreground truncate">{lead.empresas?.nombre || '—'}</p>
          </div>
          {lead.score != null && (
            <span className={cn('text-sm font-bold', scoreColor)}>{lead.score}</span>
          )}
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          {lead.email && <Mail className="h-3 w-3" />}
          {lead.telefono && <Phone className="h-3 w-3" />}
          {lead.valor_estimado != null && (
            <span className="ml-auto font-medium text-foreground">{lead.valor_estimado}€</span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
```

Replace with:
```typescript
function EnrichmentBadge({ status }: { status: string | null }) {
  if (!status || status === 'pending') return null;
  const colors: Record<string, string> = {
    full: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    partial: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
    no_contact: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  };
  const labels: Record<string, string> = {
    full: 'Enriquecido',
    partial: 'Parcial',
    no_contact: 'Sin contacto',
  };
  return (
    <span className={cn('text-[10px] px-1.5 py-0.5 rounded-full font-medium', colors[status] || 'bg-muted')}>
      {labels[status] || status}
    </span>
  );
}

function LeadCard({ lead }: { lead: LeadWithEmpresa }) {
  const scoreColor = (lead.score || 0) >= 80 ? 'text-green-500' : (lead.score || 0) >= 60 ? 'text-yellow-500' : 'text-red-500';
  const decisorName = lead.decisor_nombre || lead.nombre_contacto;
  const decisorCargo = lead.decisor_cargo || lead.cargo;

  return (
    <Card className="hover:border-primary/30 transition-colors">
      <CardContent className="p-3 space-y-2">
        <div className="flex items-start justify-between">
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium truncate">{decisorName}</p>
            {decisorCargo && (
              <p className="text-[11px] text-muted-foreground truncate">{decisorCargo}</p>
            )}
            <p className="text-xs text-muted-foreground truncate">{lead.empresas?.nombre || '—'}</p>
          </div>
          <div className="flex flex-col items-end gap-1 ml-2">
            {lead.score != null && (
              <span className={cn('text-sm font-bold', scoreColor)}>{lead.score}</span>
            )}
            <EnrichmentBadge status={lead.enrichment_status} />
          </div>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          {(lead.decisor_email || lead.email) && (
            <a href={`mailto:${lead.decisor_email || lead.email}`} title={lead.decisor_email || lead.email || ''}>
              <Mail className="h-3 w-3 hover:text-primary cursor-pointer" />
            </a>
          )}
          {(lead.decisor_movil || lead.telefono) && (
            <a href={`tel:${lead.decisor_movil || lead.telefono}`} title={lead.decisor_movil || lead.telefono || ''}>
              <Phone className="h-3 w-3 hover:text-primary cursor-pointer" />
            </a>
          )}
          {lead.decisor_linkedin && (
            <a href={lead.decisor_linkedin} target="_blank" rel="noopener noreferrer" title="LinkedIn">
              <Users className="h-3 w-3 hover:text-primary cursor-pointer" />
            </a>
          )}
          {lead.valor_estimado != null && (
            <span className="ml-auto font-medium text-foreground">{lead.valor_estimado}€</span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
```

- [ ] **Step 2: Update the Supabase query to include new fields**

In the same file, find the `useQuery` call and update the select:

Find:
```typescript
    queryFn: async () => {
      const { data, error } = await supabase
        .from('leads')
        .select('*, empresas(nombre)')
        .order('ultima_actividad_at', { ascending: false });
```

Replace with:
```typescript
    queryFn: async () => {
      const { data, error } = await supabase
        .from('leads')
        .select('*, empresas(nombre)')
        .order('ultima_actividad_at', { ascending: false });
```

No change needed — Supabase `*` already includes the new columns once the migration runs.

- [ ] **Step 3: Verify it compiles**

Run: `cd /Users/mariatelloesbri/ai-agency-analysis/ai-agency-os && npx tsc --noEmit src/app/(dashboard)/pipeline/page.tsx 2>&1 | head -20`

- [ ] **Step 4: Commit**

```bash
git add src/app/(dashboard)/pipeline/page.tsx
git commit -m "feat: show decision-maker name, email, phone and enrichment badge in pipeline"
```

---

### Task 10: Update Prospecting UI — Async Feedback

**Files:**
- Modify: `src/app/(dashboard)/prospeccion/page.tsx`

- [ ] **Step 1: Update the form handler to support async responses**

In `src/app/(dashboard)/prospeccion/page.tsx`, find the `handleProspect` function and replace it:

Find:
```typescript
  async function handleProspect(e: React.FormEvent) {
    e.preventDefault();
    if (!workspace || !user || !nicho || !ciudad) return;

    setLoading(true);
    setResults(null);

    try {
      const res = await authFetch('/api/ai/prospect', {
        method: 'POST',
        body: JSON.stringify({
          nicho,
          ciudad: ciudad.trim(),
          cantidad: parseInt(cantidad),
          workspaceId: workspace.id,
          userId: user.id,
        }),
      });

      if (res.status === 402) {
        toast.error('No tienes creditos suficientes. Actualiza tu plan.');
        setLoading(false);
        return;
      }

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Error al prospectar');
      }

      const data = await res.json();
      setResults(data.leads);
      toast.success(`${data.total} leads encontrados y añadidos al pipeline`);

      // Refresh history and workspace credits
      queryClient.invalidateQueries({ queryKey: ['prospeccion-history'] });
      queryClient.invalidateQueries({ queryKey: ['workspace'] });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Error al prospectar');
    } finally {
      setLoading(false);
    }
  }
```

Replace with:
```typescript
  async function handleProspect(e: React.FormEvent) {
    e.preventDefault();
    if (!workspace || !user || !nicho || !ciudad) return;

    setLoading(true);
    setResults(null);

    try {
      const res = await authFetch('/api/ai/prospect', {
        method: 'POST',
        body: JSON.stringify({
          nicho,
          ciudad: ciudad.trim(),
          cantidad: parseInt(cantidad),
          workspaceId: workspace.id,
          userId: user.id,
        }),
      });

      if (res.status === 402) {
        toast.error('No tienes creditos suficientes. Actualiza tu plan.');
        setLoading(false);
        return;
      }

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Error al prospectar');
      }

      const data = await res.json();

      if (data.async) {
        // n8n pipeline triggered — leads will appear asynchronously
        toast.success('Prospeccion iniciada. Los leads apareceran en el pipeline en 1-2 minutos con datos del decisor.');
        queryClient.invalidateQueries({ queryKey: ['workspace'] });
      } else {
        // Direct Apify fallback — leads returned immediately
        setResults(data.leads);
        toast.success(`${data.total} leads encontrados y anadidos al pipeline`);
        queryClient.invalidateQueries({ queryKey: ['prospeccion-history'] });
        queryClient.invalidateQueries({ queryKey: ['workspace'] });
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Error al prospectar');
    } finally {
      setLoading(false);
    }
  }
```

- [ ] **Step 2: Update the loading state text**

Find:
```typescript
      {loading && (
        <Card>
          <CardContent className="p-8 text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary mb-4" />
            <p className="font-medium">Buscando negocios...</p>
            <p className="text-sm text-muted-foreground mt-1">
              Generando prospectos de {nicho} en {ciudad}. Esto puede tardar 20-40 segundos.
            </p>
          </CardContent>
        </Card>
      )}
```

Replace with:
```typescript
      {loading && (
        <Card>
          <CardContent className="p-8 text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary mb-4" />
            <p className="font-medium">Buscando negocios reales...</p>
            <p className="text-sm text-muted-foreground mt-1">
              Buscando {nicho} en {ciudad} en Google Maps y enriqueciendo con datos del decisor.
            </p>
          </CardContent>
        </Card>
      )}
```

- [ ] **Step 3: Update the card description**

Find:
```typescript
          <CardDescription>
            La IA generara prospectos realistas para el nicho y ciudad que elijas.
            Coste: 2 creditos. Tienes {creditos} creditos disponibles.
          </CardDescription>
```

Replace with:
```typescript
          <CardDescription>
            Busca negocios reales en Google Maps y encuentra al decisor con email y movil.
            Coste: 2 creditos. Tienes {creditos} creditos disponibles.
          </CardDescription>
```

- [ ] **Step 4: Verify it compiles**

Run: `cd /Users/mariatelloesbri/ai-agency-analysis/ai-agency-os && npx tsc --noEmit src/app/(dashboard)/prospeccion/page.tsx 2>&1 | head -20`

- [ ] **Step 5: Commit**

```bash
git add src/app/(dashboard)/prospeccion/page.tsx
git commit -m "feat: update prospecting UI for async pipeline with enrichment feedback"
```

---

### Task 11: Add APOLLO_API_KEY to Environment

**Files:**
- Modify: `.env.local` (or `.env.example` if it exists)

- [ ] **Step 1: Add the Apollo API key variable**

Add to `.env.local`:
```
APOLLO_API_KEY=your_apollo_api_key_here
```

- [ ] **Step 2: Check if .env.example exists and update it**

Run: `ls /Users/mariatelloesbri/ai-agency-analysis/ai-agency-os/.env.example 2>/dev/null`

If it exists, add `APOLLO_API_KEY=` (empty) to the example file.

- [ ] **Step 3: Commit .env.example only (NEVER commit .env.local)**

```bash
git add .env.example  # Only if it exists
git commit -m "docs: add APOLLO_API_KEY to env example"
```

---

### Task 12: Build n8n Workflow — prospect-enrich-pipeline

This task is done in the n8n UI, not in code. Document the workflow structure for manual creation.

- [ ] **Step 1: Create the workflow in n8n**

Open n8n at `https://automatizaciones-n8n.hjbrvj.easypanel.host` and create a new workflow named `prospect-enrich-pipeline` with these nodes:

**Node 1: Webhook Trigger**
- Type: Webhook
- Method: POST
- Path: `prospect-enrich`
- Authentication: None (auth handled by the calling API)

**Node 2: Loop Over Quantities**
- Type: SplitInBatches
- Batch Size: 1 (process one at a time for rate limiting)

**Node 3: HTTP Request — Apify Run Actor**
- Type: HTTP Request
- Method: POST
- URL: `https://api.apify.com/v2/acts/nwua9~google-maps-scraper/run-sync-get-dataset-items?token={{$env.APIFY_API_TOKEN}}`
- Body (JSON):
```json
{
  "searchStringsArray": ["{{ $json.nicho }} en {{ $json.ciudad }}"],
  "maxCrawledPlacesPerSearch": {{ $json.cantidad }},
  "language": "es",
  "countryCode": "es",
  "skipClosedPlaces": true
}
```
- Timeout: 120000ms

**Node 4: Loop Over Results**
- Type: SplitInBatches
- Batch Size: 1

**Node 5: HTTP Request — Check Duplicate**
- Type: HTTP Request
- Method: POST
- URL: `{{ $json.callback_url }}`
- Headers: `X-N8N-API-KEY: {{$env.N8N_API_KEY}}`
- Body:
```json
{
  "action": "check-duplicate",
  "data": {
    "workspaceId": "{{ $json.workspace_id }}",
    "domain": "{{ $json.website }}",
    "phone": "{{ $json.phone }}",
    "name": "{{ $json.title }}"
  }
}
```

**Node 6: IF — Not Duplicate**
- Condition: `{{ $json.duplicate }}` equals `false`

**Node 7: HTTP Request — Apollo People Search**
- Type: HTTP Request
- Method: POST
- URL: `https://api.apollo.io/api/v1/mixed_people/search`
- Headers: `X-Api-Key: {{$env.APOLLO_API_KEY}}`
- Body:
```json
{
  "q_organization_domains": ["{{ extractDomain($json.website) }}"],
  "person_titles": ["Owner","Propietario","CEO","Director General","Gerente","Fundador","Director","Responsable"],
  "person_locations": ["Spain"],
  "page": 1,
  "per_page": 1
}
```

**Node 8: Wait — Rate Limit**
- Type: Wait
- Duration: 12 seconds (Apollo free tier: 5 req/min)

**Node 9: Set — Prepare Lead Data**
- Type: Set
- Map Apollo response to enrichment fields:
  - `decisor_nombre`: `{{ $json.people[0].first_name }} {{ $json.people[0].last_name }}`
  - `decisor_cargo`: `{{ $json.people[0].title }}`
  - `decisor_email`: `{{ $json.people[0].email }}`
  - `decisor_linkedin`: `{{ $json.people[0].linkedin_url }}`
  - `enrichment_status`: `{{ $json.people.length > 0 ? 'full' : 'no_contact' }}`

**Node 10: HTTP Request — Prospect Complete Callback**
- Type: HTTP Request
- Method: POST
- URL: `{{ $json.callback_url }}`
- Headers: `X-N8N-API-KEY: {{$env.N8N_API_KEY}}`
- Body:
```json
{
  "action": "prospect-complete",
  "data": {
    "workspace_id": "{{ $json.workspace_id }}",
    "empresa": {
      "name": "{{ $json.title }}",
      "website": "{{ $json.website }}",
      "phone": "{{ $json.phone }}",
      "city": "{{ $json.city }}",
      "rating": {{ $json.totalScore }},
      "reviews": {{ $json.reviewsCount }},
      "nicho": "{{ $json.nicho }}"
    },
    "lead": {
      "decisor_nombre": "{{ $json.decisor_nombre }}",
      "decisor_cargo": "{{ $json.decisor_cargo }}",
      "decisor_email": "{{ $json.decisor_email }}",
      "decisor_movil": null,
      "decisor_linkedin": "{{ $json.decisor_linkedin }}",
      "enrichment_status": "{{ $json.enrichment_status }}",
      "source": "apify+apollo"
    }
  }
}
```

**Node 11: Error Handler (Catch)**
- Type: Error Trigger
- Connected to: HTTP Request — Error Callback
- Body:
```json
{
  "action": "prospect-error",
  "data": {
    "workspace_id": "{{ $json.workspace_id }}",
    "error_message": "{{ $json.error.message }}"
  }
}
```

- [ ] **Step 2: Add environment variables in n8n**

In n8n Settings > Variables, add:
- `APIFY_API_TOKEN`: (same value as in .env.local)
- `APOLLO_API_KEY`: (your Apollo free tier key)
- `N8N_API_KEY`: (same value as in .env.local)

- [ ] **Step 3: Test the workflow with a sample payload**

Send a test webhook:
```bash
curl -X POST https://automatizaciones-n8n.hjbrvj.easypanel.host/webhook/prospect-enrich \
  -H "Content-Type: application/json" \
  -d '{
    "workspace_id": "test-ws-id",
    "nicho": "Restaurantes",
    "ciudad": "Barcelona",
    "cantidad": 2,
    "callback_url": "https://your-app.vercel.app/api/webhooks/n8n"
  }'
```

- [ ] **Step 4: Activate the workflow**

Enable the workflow in n8n so the webhook endpoint is live.

---

### Task 13: Update Credit Cost

**Files:**
- Modify: `src/lib/credits.ts`

- [ ] **Step 1: Update prospecting cost to reflect enrichment**

In `src/lib/credits.ts`, update the COST_MAP:

Find:
```typescript
  prospeccion: 0.03,
```

Replace with:
```typescript
  prospeccion: 0.05,
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/credits.ts
git commit -m "feat: increase prospecting cost to 0.05 EUR to cover Apollo enrichment"
```

---

### Task 14: End-to-End Verification

- [ ] **Step 1: Start the dev server**

Run: `cd /Users/mariatelloesbri/ai-agency-analysis/ai-agency-os && npm run dev`

- [ ] **Step 2: Verify the prospecting page loads**

Open `http://localhost:3000/prospeccion` in the browser. Confirm:
- Form shows updated description ("Busca negocios reales en Google Maps...")
- Nicho/Ciudad/Cantidad selectors work

- [ ] **Step 3: Verify the pipeline page loads**

Open `http://localhost:3000/pipeline` in the browser. Confirm:
- Kanban board renders
- Any existing leads show without errors (new fields are null for old leads)

- [ ] **Step 4: Test a manual prospecting run (if n8n + APIs configured)**

Fill in the form and click "Prospectar". Confirm:
- Toast shows "Prospeccion iniciada..."
- After 1-2 minutes, leads appear in pipeline with enrichment badges

- [ ] **Step 5: Commit any fixes**

```bash
git add -A
git commit -m "fix: address issues found during e2e verification"
```
