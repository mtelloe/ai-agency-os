# Dashboard de Ventas — Spec de Diseño
**Fecha:** 2026-04-17
**Fase:** 3 — Dashboard & Reporting
**Proyecto:** ai-agency-os (Next.js + Supabase) + sales-orchestrator backend

---

## Objetivo

Añadir una página `/ventas` al dashboard existente de ai-agency-os que permita:
1. Observar en tiempo real qué están haciendo los agentes del Sales Orchestrator
2. Lanzar nuevas campañas de prospección con control total (criterios + email completo)
3. Editar templates de email sin tocar código
4. Pausar y reanudar agentes

---

## Arquitectura

```
ai-agency-os (Next.js, Vercel)
  └── /ventas (nueva página)
        ├── Supabase client (polling 30s)
        │     ├── outreach_log → actividad + KPIs
        │     ├── agents → estado agentes (activo/pausado)
        │     └── email_templates → templates editables
        └── Server Action → sales-orchestrator API
              └── POST /api/prospect (lanzar campaña)
```

Los datos viven en Supabase (ya existente, tablas creadas en Fase 2). La comunicación con el Sales Orchestrator se hace desde un Server Action de Next.js que guarda el `API_SECRET_KEY` como env var en Vercel.

---

## Página `/ventas`

### Localización
`src/app/(dashboard)/ventas/page.tsx`

Añadir enlace en el sidebar/nav existente del layout `(dashboard)`.

### Layout general
- Nav existente de ai-agency-os con nueva pestaña activa "Ventas"
- Botón `▶ Nueva campaña` en la cabecera derecha (abre modal)
- Paleta: cremas (`#f5f0e8`, `#fff9f0`), pistacho (`#d4e8c2`, `#8ac47a`), rosa (`#f4a7b9`, `#e87a9a`), grises cálidos

### Bloque 1 — KPIs (4 tarjetas horizontales)
Datos calculados desde `outreach_log`:

| Tarjeta | Fuente | Métrica |
|---------|--------|---------|
| Emails enviados | `outreach_log` WHERE status='sent' | COUNT total + COUNT hoy |
| Respuestas | `outreach_log` WHERE status='replied' | COUNT + tasa % |
| Agentes activos | `agents` WHERE is_active=true | COUNT + COUNT pausados |
| Leads en pipeline | `outreach_contacts` creados esta semana | COUNT |

### Bloque 2 — Oficina de agentes (Canvas, vista aérea top-down)
Componente React: `src/components/ventas/AgentOffice.tsx`

**Comportamiento:**
- Canvas 2D, vista aérea (perspectiva cenital), estilo pixel-art sin emojis
- Tiles de suelo tipo tablero de ajedrez con colores crema
- Mesas con ordenador y teclado visibles desde arriba
- Plantas decorativas en esquinas
- Un personaje por agente activo en Supabase

**Personajes:**
- Agente `working`: sentado en mesa, animación de "escribir" (bob suave), burbuja de diálogo con la acción actual (ej: "Buscando leads...", "Enviando email...")
- Agente `idle`/pausado: deambula lentamente por la sala, burbuja "💤 pausado"
- Ocasionalmente el personaje se levanta, camina y vuelve

**Datos:**
- Estado de cada agente: `agents.is_active`, `agents.slug`
- Texto de la burbuja: última entrada de `agent_executions` para ese agente

### Bloque 3 — Actividad reciente
Feed vertical de los últimos 20 eventos de `outreach_log` + `agent_executions`, ordenados por `created_at DESC`. Cada ítem muestra:
- Punto de color (rosa = respuesta recibida, azul = email enviado, pistacho = leads encontrados)
- Descripción del evento
- Timestamp relativo ("hace 2h")

Polling cada 30 segundos con `setInterval` + Supabase client.

### Bloque 4 — Panel lateral derecho

**Lista de agentes:**
- Nombre del agente, frecuencia de ejecución, últimas acciones
- Badge de estado (activo/pausado) con color pistacho/melocotón
- Botón "pausar" o "reanudar" → llama a Server Action que actualiza `agents.is_active` en Supabase

**Templates activos:**
- Lista de `email_templates` activos con nombre
- Botón `✏ editar` → abre modal de edición de template

---

## Modal "Nueva campaña"

Abierto desde el botón `▶ Nueva campaña`.

### Campos

**Criterios de búsqueda (Apollo)**
- `Sector / industria` — text input libre o dropdown con opciones comunes (wellness, fitness, healthcare, education...)
- `Cargo objetivo` — text input (ej: "director", "gerente", "fundador")
- `Región` — text input (ej: "Madrid", "Barcelona", "España")
- `Nº de leads` — slider o input numérico, 1-25 (límite free tier Apollo)

**Email**
- `Usar template existente` — dropdown con `email_templates.slug`. Al seleccionar, rellena asunto y cuerpo automáticamente (editable)
- `Asunto` — input de texto. Soporta variables: `{{nombre}}`, `{{empresa}}`, `{{cargo}}`
- `Cuerpo del email` — textarea. Mismas variables. Contador de caracteres.
- Chips de variables disponibles debajo del textarea: clic en chip inserta la variable en el cursor

**Preview**
- Sección colapsable "Ver preview" que sustituye las variables por valores de ejemplo y muestra el email como se verá

**Programación**
- Toggle: "Ejecutar ahora" / "Programar"
- Si "Programar": selector de hora + frecuencia (una vez / diario / cada N horas)

**Acción**
- Botón "Cancelar" (cierra modal)
- Botón "▶ Lanzar campaña" → Server Action → `POST /api/prospect` con `{templateSlug, searchCriteria}`. Si el template no existe en Supabase, lo crea primero.

### Comportamiento tras lanzar
- Toast de confirmación "Campaña lanzada"
- El agente aparece en la oficina y empieza a moverse
- La actividad reciente se actualiza en el próximo polling

---

## Modal "Editar template"

Abierto desde `✏ editar` en cualquier template.

### Campos
- `Nombre del template` (slug autogenerado)
- `Asunto` — input
- `Cuerpo` — textarea con variables

### Variables disponibles
Chips clicables: `{{nombre}}`, `{{empresa}}`, `{{cargo}}`, `{{sector}}`. Clic inserta en el cursor del campo activo.

### Acción
- "Guardar" → `UPDATE email_templates` en Supabase
- "Cancelar"

---

## Server Actions (Next.js)

`src/app/actions/ventas.ts`

```typescript
// Lanzar campaña
export async function launchCampaign(params: {
  templateSlug: string;
  subject: string;
  body: string;
  searchCriteria: {
    q_organization_industries: string[];
    person_titles: string[];
    person_locations: string[];
    per_page: number;
  };
}): Promise<{ success: boolean; error?: string }>

// Pausar/reanudar agente
export async function toggleAgent(agentId: string, active: boolean): Promise<void>

// Guardar template
export async function saveTemplate(template: {
  id?: string;
  slug: string;
  subject: string;
  body: string;
}): Promise<void>
```

`SALES_ORCHESTRATOR_URL` y `SALES_ORCHESTRATOR_KEY` como env vars en Vercel.

---

## Variables de entorno necesarias en Vercel

```
SALES_ORCHESTRATOR_URL=https://sales-orchestrator.hjbrvj.easypanel.host
SALES_ORCHESTRATOR_KEY=5da7affd5014ce62c073a9ee582913ad158ece0956f0f71305365f69f3be9932
```

---

## Fuera de scope (Fase 3)

- Estadísticas históricas / gráficas de evolución (Fase 4+)
- Notificaciones push cuando llega una respuesta (Fase 4)
- Responder emails desde la UI (Fase 4)
- Gestión de leads individual (Fase 4)

---

## Criterios de éxito

- `/ventas` carga en <2s con datos reales de Supabase
- El canvas de la oficina corre a 60fps sin bloquear el UI thread
- Se puede lanzar una campaña completa desde la UI sin tocar código ni la API directamente
- Los templates se pueden editar y el cambio se refleja en el próximo email enviado
- Los agentes se pueden pausar/reanudar desde la UI
