# HANDOFF — Portal de Clientes Simedalavida
**Fecha:** 2026-06-22
**Estado:** Infraestructura base ✅ — contenido y conexiones pendientes

---

## QUÉ EXISTE YA

### Base de datos (`empresas`)
Columnas de portal ya en producción:
- `portal_slug` — URL del portal: `fidelity-one.vercel.app/cliente/[slug]`
- `portal_pin` — PIN de acceso (4 dígitos)
- `portal_fases` — JSONB array de fases/timeline
- `portal_facturas` — JSONB array de facturas
- `portal_notas` — Notas visibles al cliente
- `portal_notas_admin` — Notas internas (no visibles al cliente)

### Rutas
- **Portal cliente:** `/cliente/[slug]` — auth PIN → cookie `portal_${slug}=1`
- **Editor interno:** `/dashboard/portales/[slug]` — editar fases, facturas, notas
- **Lista portales:** `/dashboard/portales/`

### Tipos de datos (TypeScript)
```typescript
type Fase = {
  nombre: string
  descripcion?: string
  estado: 'completado' | 'en_curso' | 'pendiente'
  fecha?: string
}

type Factura = {
  numero: string
  concepto: string
  importe: string
  fecha: string
  estado: 'pagada' | 'pendiente'
  url?: string
}
```

### Tabla paralela
`clientes_onboarding` — usada por el webhook n8n (onboarding nuevo cliente).
Tiene: `nombre_cliente`, `email_cliente`, `fecha_inicio`, `estado`, `setup_fee` (1600), `mrr` (150), `agentes`, `notas`.
**Esta tabla y `empresas` no están vinculadas todavía.**

---

## LAS 4 FASES

---

### FASE 1 — Migración de clientes activos ⭐ (prioridad)
**Objetivo:** Todos los clientes activos tienen portal disponible en 1 sesión.

**Tareas:**
1. Exportar clientes activos de `clientes_onboarding` a `empresas`:
   - Crear empresa por cada cliente si no existe
   - Asignar `portal_slug` = slug del nombre (ej. "laura-herrera")
   - Generar `portal_pin` de 4 dígitos aleatorio
2. Poblar `portal_fases` con el pipeline estándar de Simedalavida:
   ```json
   [
     {"nombre": "Onboarding", "estado": "completado", "fecha": "2026-XX-XX"},
     {"nombre": "Instalación agentes", "estado": "en_curso"},
     {"nombre": "Configuración WhatsApp", "estado": "pendiente"},
     {"nombre": "Primera semana live", "estado": "pendiente"},
     {"nombre": "Revisión 30 días", "estado": "pendiente"}
   ]
   ```
3. Añadir setup_fee y MRR como primera factura en `portal_facturas`
4. Script de migración: `scripts/migrate-clientes-to-portal.ts`
5. Enviar PIN a cada cliente por WhatsApp (manual o vía Evolution)

**Entregable:** URL tipo `fidelity-one.vercel.app/cliente/laura-herrera` + PIN funcionando.

---

### FASE 2 — Portal rico (UI del cliente)
**Objetivo:** El portal se ve premium y da toda la info que el cliente necesita.

**Mejoras al `ClientPortal.tsx` actual (308 líneas, base sólida):**

1. **Header con identidad** — logo Simedalavida, nombre cliente, estado actual destacado
2. **Timeline visual** — línea de progreso con steps, no lista plana:
   - Barra de progreso (ej. "3 de 5 fases completadas")
   - Cada fase con ícono, fecha, descripción expandible
3. **Sección "Tu inversión"** — setup fee, MRR, próximo cargo
4. **Facturas** — tabla con estado (pagada/pendiente), botón de descarga (si tiene URL)
5. **Contacto directo** — botón WhatsApp a María, email de soporte
6. **Notas del equipo** — mensaje personalizado de Simedalavida al cliente

**Datos nuevos necesarios en `empresas`:**
```sql
ALTER TABLE empresas
  ADD COLUMN IF NOT EXISTS setup_fee INTEGER,
  ADD COLUMN IF NOT EXISTS mrr INTEGER,
  ADD COLUMN IF NOT EXISTS proximo_cargo DATE;
```

---

### FASE 3 — Editor interno cómodo
**Objetivo:** María puede gestionar portales sin tocar código ni SQL.

**Mejoras al `PortalEditor.tsx` actual (359 líneas):**

1. **Gestión de fases:**
   - Añadir fase con un click
   - Cambiar estado (pendiente → en_curso → completado) con dropdown
   - Reordenar drag & drop
2. **Facturas:**
   - Subir PDF a Supabase Storage → guardar URL en `portal_facturas[].url`
   - Marcar como pagada/pendiente
3. **Vista previa** — botón "Ver como cliente" desde el editor
4. **Búsqueda** en lista de portales por nombre

---

### FASE 4 — Automatización completa
**Objetivo:** Cero trabajo manual en onboarding.

1. **Webhook onboarding → portal automático:**
   - El webhook n8n ya crea la fila en `clientes_onboarding`
   - Añadir paso: crear empresa en `empresas` + portal con slug + PIN
   - O bien: un endpoint `/api/portal/create` que llama el webhook
2. **Envío PIN automático:**
   - Al crear portal → WhatsApp a cliente con su URL y PIN
   - Mensaje tipo: "Tu espacio de seguimiento está listo: [URL]. Tu PIN: [PIN]"
3. **Notificaciones de cambio:**
   - Cuando María actualiza una fase → WhatsApp al cliente ("✅ Nueva fase completada: Configuración WhatsApp")
4. **Vinculación `clientes_onboarding` ↔ `empresas`:**
   - Añadir columna `empresa_id` en `clientes_onboarding`

---

## PRIORIDAD RECOMENDADA

```
Fase 1 (migración) → Fase 2 (UI) → Fase 3 (editor) → Fase 4 (auto)
```

Fase 1 + 2 = cliente puede ver su portal esta semana.
Fase 3 + 4 = sistema sin fricción para nuevos clientes.

---

## ARCHIVOS CLAVE

| Archivo | Qué hace |
|---|---|
| `src/app/(public)/cliente/[slug]/page.tsx` | Servidor: auth PIN por cookie |
| `src/app/(public)/cliente/[slug]/ClientPortal.tsx` | UI cliente (308L) |
| `src/app/(dashboard)/portales/page.tsx` | Lista portales interno |
| `src/app/(dashboard)/portales/[slug]/page.tsx` | Editor servidor |
| `src/app/(dashboard)/portales/[slug]/PortalEditor.tsx` | UI editor (359L) |
| `supabase/migrations/20260621_add_client_portal.sql` | Schema actual del portal |

## API ENDPOINTS (crear en Fase 1)

- `POST /api/portal/[slug]/verify` — validar PIN → set cookie (ya existe o por crear)
- `POST /api/portal/create` — crear empresa + portal desde webhook
- `PATCH /api/portal/[slug]/fases` — actualizar fases desde editor
- `POST /api/portal/[slug]/upload-factura` — subir PDF a Supabase Storage

## URL DEL PORTAL

`https://fidelity-one.vercel.app/cliente/[slug]`

El slug se genera del nombre del cliente: "Laura Herrera" → `laura-herrera`.

---

## PARA EMPEZAR (Fase 1)

Abrir chat nuevo y decir: *"continúa con el portal de clientes Simedalavida, Fase 1: migración de clientes activos"*

Antes de esa sesión, tener a mano:
- Lista de clientes activos (nombre, email, agente asignado, fecha inicio, estado)
- Facturas existentes en PDF (para subir en Fase 3)
