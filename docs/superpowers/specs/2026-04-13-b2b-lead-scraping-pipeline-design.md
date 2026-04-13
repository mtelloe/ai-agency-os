# B2B Lead Scraping & Enrichment Pipeline

**Fecha:** 2026-04-13
**Estado:** Aprobado
**Enfoque:** Apify Google Maps (discovery) + Apollo.io (enrichment) + n8n (orquestacion)

## Problema

El pipeline actual de prospecting no funciona:
- El actor de Apify (`compass~crawler-google-places`) falla o devuelve resultados inconsistentes
- No se identifica al decisor de la empresa (nombre, cargo)
- No se obtiene email ni movil directo del decisor
- La extraccion de contacto via scraping web es poco fiable para PYMEs

## Objetivo

Pipeline automatico que dado un nicho + ciudad:
1. Encuentre empresas reales (Google Maps)
2. Identifique al decisor (propietario, CEO, gerente)
3. Obtenga su email verificado y movil
4. Guarde todo en Supabase listo para outreach

## Target

- PYMEs locales espanolas (dueño = decisor) y empresas medianas (responsable marketing/IT)
- Mix configurable por workspace
- 10-50 leads/semana por workspace, priorizando calidad sobre cantidad

## Arquitectura

```
n8n Orchestrator
    |
    v
Trigger (cron lunes 8AM / webhook manual)
    |
    v
GET /api/prospecting/workspaces-activos
    | (workspaces con auto_prospecting: true)
    |
    v
Loop por workspace:
    |
    v
Apify Google Maps (nwua9~google-maps-scraper)
    | query: "{nicho} en {ciudad}", max 30 resultados
    |
    v
Loop por empresa:
    |
    v
POST /api/webhooks/n8n { action: "check-duplicate" }
    | (compara domain, phone, name vs Supabase)
    | IF duplicada -> skip
    |
    v
Apollo People Search
    | POST https://api.apollo.io/api/v1/mixed_people/search
    | buscar por dominio empresa + cargos de decisor
    | IF no encontrado -> retry por nombre empresa + ciudad
    |
    v
Enriquecimiento:
    | - nombre, cargo, email, linkedin -> siempre (gratis)
    | - movil -> solo si score >= 75 (consume 1 credito Apollo)
    | - IF Apollo no encuentra nada -> telefono negocio como fallback
    |
    v
POST /api/webhooks/n8n { action: "prospect-complete" }
    | guarda empresa + lead enriquecido en Supabase
```

## Paso 1: Apify Google Maps (Discovery)

### Actor

Cambiar de `compass~crawler-google-places` a `nwua9~google-maps-scraper` (mas estable, 1M+ runs, mejor mantenido).

### Configuracion del actor

```json
{
  "searchStringsArray": ["{nicho} en {ciudad}"],
  "language": "es",
  "countryCode": "es",
  "maxCrawledPlacesPerSearch": 30,
  "skipClosedPlaces": true
}
```

### Datos extraidos por empresa

| Campo Apify | Campo en Supabase | Uso |
|-------------|-------------------|-----|
| `title` | `nombre` | Nombre del negocio |
| `website` | `website` | Clave para buscar en Apollo |
| `phone` | `telefono` | Telefono del negocio (fallback) |
| `address` | `direccion` | Direccion fisica |
| `totalScore` | `rating` | Rating Google |
| `reviewsCount` | `resenas` | Numero de resenas |
| `categoryName` | `categoria` | Categoria del negocio |
| `url` | `google_maps_url` | URL de Google Maps |

### Limites

- Free tier Apify: $5/mes -> ~500 resultados/mes
- Suficiente para ~15 busquedas de 30 resultados

## Paso 2: Apollo People Search (Enrichment)

### Free tier Apollo

| Recurso | Limite mensual |
|---------|---------------|
| Emails | 10.000 (verificados) |
| Moviles | 60 creditos |
| Exports | 120 creditos |
| People Search | Ilimitado |

### Busqueda por empresa

```json
{
  "q_organization_domains": ["restauranteejemplo.es"],
  "person_titles": [
    "Owner", "Propietario", "CEO", "Director General",
    "Gerente", "Fundador", "Director", "Responsable"
  ],
  "person_locations": ["Spain"],
  "page": 1,
  "per_page": 1
}
```

### Datos devueltos por Apollo

| Campo Apollo | Campo en Supabase | Notas |
|-------------|-------------------|-------|
| `first_name` + `last_name` | `decisor_nombre` | Nombre completo |
| `title` | `decisor_cargo` | Cargo |
| `email` | `decisor_email` | Email verificado (gratis) |
| `phone_numbers[].sanitized_number` | `decisor_movil` | Consume 1 credito movil |
| `linkedin_url` | `decisor_linkedin` | Perfil LinkedIn |

### Estrategia de optimizacion de creditos movil

1. Email siempre (ilimitado) -> todos los leads tienen email
2. Movil solo si `opportunity_score >= 75` (leads de mayor valor)
3. Si no se encuentra por dominio, retry por nombre empresa + ciudad
4. Si Apollo no encuentra a nadie, usar telefono del negocio de Google Maps como fallback y marcar `enrichment_status = "partial"`

## Paso 3: Pipeline n8n

### Workflow: `prospect-enrich-pipeline`

**Triggers:**

| Trigger | Cuando | Que hace |
|---------|--------|----------|
| Cron semanal | Lunes 8:00 AM | Todos los workspaces con `auto_prospecting: true` |
| Webhook manual | Usuario pulsa "Buscar leads" | Solo ese workspace |

**Rate limiting:**

- Apify: 1 run a la vez, esperar a que termine antes del siguiente
- Apollo: max 5 requests/minuto en free tier -> n8n Wait node de 12s entre busquedas
- Callback a API: sin limite

**Error handling:**

- Apify falla -> reintentar 1 vez, si falla de nuevo -> callback con `action: "prospect-error"`
- Apollo rate limit -> esperar 60s y reintentar
- Apollo sin datos -> guardar empresa sin lead enriquecido, marcar `enrichment_status = "no_contact"`

## Paso 4: Cambios en el codigo

### Archivos nuevos

| Archivo | Proposito |
|---------|-----------|
| `src/lib/apollo.ts` | Cliente Apollo API: `searchPeople(domain, titles)`, `enrichContact(personId)` |
| `src/app/api/prospecting/workspaces-activos/route.ts` | GET: devuelve workspaces con `auto_prospecting: true`, su nicho y ciudad |
| `src/app/api/prospecting/manual/route.ts` | POST: trigger manual del pipeline para un workspace |

### Archivos a modificar

| Archivo | Cambio |
|---------|--------|
| `src/lib/google-maps.ts` | Cambiar actor a `nwua9~google-maps-scraper`, actualizar mapeo de campos |
| `src/app/api/webhooks/n8n/route.ts` | Anadir actions: `check-duplicate`, `prospect-complete`, `prospect-error` |
| `src/app/api/ai/prospect/route.ts` | Refactorizar: trigger n8n pipeline en vez de llamar Apify directo |
| `.env.local` | Anadir `APOLLO_API_KEY` |

### Migracion Supabase

```sql
ALTER TABLE leads ADD COLUMN IF NOT EXISTS decisor_nombre TEXT;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS decisor_cargo TEXT;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS decisor_email TEXT;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS decisor_movil TEXT;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS decisor_linkedin TEXT;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS enrichment_status TEXT DEFAULT 'pending'
  CHECK (enrichment_status IN ('pending', 'full', 'partial', 'no_contact'));
ALTER TABLE leads ADD COLUMN IF NOT EXISTS enrichment_source TEXT;
```

### Cambios en UI (dashboard)

- Vista de leads en pipeline: mostrar `decisor_nombre`, `decisor_cargo`, `decisor_email`, `decisor_movil` con iconos clicables (mailto:, tel:)
- Vista de prospeccion: boton "Buscar leads ahora" -> POST `/api/prospecting/manual`
- Badge de `enrichment_status`: verde (full), amarillo (partial), rojo (no_contact)

## Costes

### Free tier (estimado 2 workspaces, ~50 leads/semana)

| Recurso | Free tier | Consumo estimado | Alcanza |
|---------|-----------|------------------|---------|
| Apify | $5/mes gratis | ~200 resultados = ~$2/mes | Si |
| Apollo emails | 10.000/mes | ~200 busquedas/mes | Si, de sobra |
| Apollo moviles | 60/mes | ~50 (score >= 75) | Justo, priorizar |
| Apollo exports | 120/mes | 0 (usamos API directa) | Si |
| n8n | Self-hosted | Ilimitado | Si |
| Supabase | Free 500MB | KB por lead | Si |

**Coste total: $0-2/mes** dentro del free tier.

### Escalado (cuando supere free tier)

| Recurso | Precio |
|---------|--------|
| Apify | $49/mes -> ~5.000 resultados |
| Apollo Basic | $49/mes -> 900 moviles, unlimited emails |
| Apollo Professional | $79/mes -> 1.200 moviles, buyer intent |

### Sistema de creditos

- Coste actual de `prospeccion`: 0.03 EUR/operacion
- Coste real por lead enriquecido: ~0.02 EUR (Apify) + 0 EUR (Apollo email)
- Con movil: ~0.07 EUR total
- Recomendacion: subir a **0.05 EUR/lead** para cubrir costes con margen

## Variables de entorno nuevas

```
APOLLO_API_KEY=          # API key de Apollo.io (free tier)
```

La variable `APIFY_API_TOKEN` ya existe.

## Fuera de scope

- Integracion con Lusha (free tier demasiado limitado: 50 creditos/mes totales)
- Integracion con Hunter.io (solo 25 busquedas/mes, no justifica la complejidad)
- Scraping de LinkedIn (riesgo de ban, requiere proxies)
- Verificacion de email adicional (Apollo ya verifica)
