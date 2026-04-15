# Handoff — Sales Orchestrator Fase 1

**Fecha:** 2026-04-15
**Rama:** `feat/sales-orchestrator-fase1` (worktree en `/Users/mariatelloesbri/ai-agency-os-sales-fase1/`)
**Plan completo:** `docs/superpowers/plans/2026-04-14-sales-orchestrator-fase-1.md`

## Estado actual

### ✅ Task 1 — Supabase migration (COMPLETADA y aplicada en BD real)
- Migración `supabase/migrations/20260414_add_agents_tables.sql` escrita y **ya aplicada** al proyecto Supabase `ttpduldgqbdbkdpnfuvj` (AI Agency OS) vía MCP.
- 3 tablas creadas: `agents`, `agent_schedules`, `agent_executions` con RLS via `users_profile.workspace_id` (corregido respecto al plan original que asumía `workspaces.owner_id`).
- Commit: `0fc0a2e` — "feat(db): add agents, schedules and executions tables for orchestrator"
- **Verificado:** `SELECT table_name FROM information_schema.tables WHERE table_name IN ('agents','agent_schedules','agent_executions')` → 3 filas.

### ✅ Task 2 — Seed agentes (COMPLETADA 2026-04-15)
- 8 agentes insertados vía MCP `execute_sql` (la key `sb_secret_...` en `.env.local` estaba revocada → 401; el script `seed_agents.ts` quedó inútil hasta rotar la key, pero el resultado en BD es el mismo).
- Verificado: `SELECT slug, name FROM agents WHERE workspace_id='9131555f-e22b-49e3-ab52-66f6f11a91f0'` → 8 filas activas, prompts 10-20KB c/u.
- Generador alternativo: `supabase/generate_seed_sql.ts` (emite SQL por agente a `/tmp/seed_agent_N.sql`). Útil si hay que re-seedear.
- **Pendiente operativo**: rotar `SUPABASE_SERVICE_ROLE_KEY` en `.env.local` antes de Fase 2 (el heartbeat de Task 14 y el orchestrator necesitarán key válida).

### ⏳ Tasks 3–17 — pendientes
Todas sin empezar. El plan tiene código completo para cada una.

## Decisiones tomadas (inmutables)

| Concepto | Valor |
|---|---|
| Supabase project | `ttpduldgqbdbkdpnfuvj` (AI Agency OS, eu-west-3) |
| Supabase URL | `https://ttpduldgqbdbkdpnfuvj.supabase.co` |
| Workspace default | `9131555f-e22b-49e3-ab52-66f6f11a91f0` (slug `maria-ce499656`, el más activo) |
| Modelo Claude | `claude-sonnet-4-6` |
| Repo orchestrator | `/Users/mariatelloesbri/sales-orchestrator/` (separado, no creado aún) |
| Rama ai-agency-os | `feat/sales-orchestrator-fase1` (worktree) |
| CI | GitHub Actions lint+typecheck+tests (Task 16) |
| Deploy | Usuario lo hace manual siguiendo `deploy/EASYPANEL.md` (Task 17 genera guía, Task 18 saltada) |
| Credenciales | `SUPABASE_SERVICE_ROLE_KEY` ya capturada en esta sesión; `ANTHROPIC_API_KEY` disponible en `/Users/mariatelloesbri/ai-agency-analysis/ai-agency-os/.env.local` |

## Ajustes al plan original

1. **RLS policies:** El plan original asumía `workspaces.owner_id`. La BD real no lo tiene. Las policies aplicadas usan `users_profile.workspace_id`.
2. **Credenciales:** Uso MCP Supabase (`apply_migration`, `execute_sql`) para operaciones DB en vez de psql directo. `project_id = ttpduldgqbdbkdpnfuvj`.
3. **Patrón de trabajo:** A partir de Task 3 usar subagentes (Agent tool) para tareas de código, en paralelo cuando sean independientes.

## Primeros 3 pasos al retomar

### Paso 1 — Retomar worktree
```bash
cd /Users/mariatelloesbri/ai-agency-os-sales-fase1
git status   # debe estar en feat/sales-orchestrator-fase1
```

### Paso 2 — Arrancar Task 3 (scaffold repo)
Ir a plan `docs/superpowers/plans/2026-04-14-sales-orchestrator-fase-1.md` Task 3. Dispatch subagent con prompt del template `subagent-driven-development/implementer-prompt.md`. Directorio: `/Users/mariatelloesbri/sales-orchestrator/`.

## Cómo retomar con subagentes (sesión fresca)

Prompt de arranque sugerido al inicio de la próxima sesión:

> Estamos retomando la implementación de Sales Orchestrator Fase 1. Lee `/Users/mariatelloesbri/ai-agency-os-sales-fase1/HANDOFF-FASE1.md` para contexto. El plan completo está en `docs/superpowers/plans/2026-04-14-sales-orchestrator-fase-1.md`. Task 1 ✅ (migración BD aplicada), Task 2 pendiente de ejecutar seed. Invoca la skill `superpowers:subagent-driven-development` y continúa desde Task 2 (o ejecuta Task 2 inline si prefieres y despacha subagentes desde Task 3).

## Agentes paralelizables (Fase 3+)

Para optimizar, estos grupos de tasks pueden ir en subagentes paralelos porque tocan archivos distintos:
- **Grupo A (sales-orchestrator independientes):** Tasks 4 (env), 5 (logger), 7 (anthropic) — todos en `src/config/*` o `src/llm/*` sin dependencias cruzadas.
- **Grupo B:** Task 6 (db) + Task 9 (queue) después de Grupo A.
- **Grupo C:** Task 8 (AgentRunner) después de 6+7. Task 10 (Scheduler) después de 6+9.
- **Secuencial obligatorio:** Task 3 (scaffold) → Grupo A → Grupo B → Grupo C → Task 11 (API) → Task 12 (entry) → Task 13 (Docker) → Task 15 (E2E) → Task 16 (CI) → Task 17 (deploy guide).
- **Independiente:** Task 14 (heartbeat en ai-agency-os) puede ir en cualquier momento tras Task 1.

## Riesgos abiertos

- **Anthropic pricing:** el wrapper usa pricing hardcoded para `claude-sonnet-4-6` ($3/$15 per M tokens). Verificar contra pricing oficial vigente antes de deploy.
- **Workspace RLS:** el orchestrator usa service_role (bypass RLS), así que no bloquea; pero si luego se expone la API pública, revisar que multi-tenancy funcione.
- **Vercel + EasyPanel cohabitación:** ai-agency-os sigue en Vercel; solo orchestrator vive en DO. Compartir Supabase es la única integración — ojo con connection pooler si suben los ejecuciones concurrentes.
- **LinkedIn MCP:** Fase 1 no lo toca. Fase 2 usará Apollo + Hunter + Gmail (alternativas legales free-tier) tal como quedó decidido.

## Referencias útiles

- Plan: `docs/superpowers/plans/2026-04-14-sales-orchestrator-fase-1.md`
- Arquitectura original: `~/Downloads/archi.md`
- Agentes .md fuente: `/Users/mariatelloesbri/ai-agency-analysis/agency-agents/sales/`
- Módulo auditoría reutilizable (Fase 2): `/Users/mariatelloesbri/ai-agency-analysis/ai-agency-os/src/lib/audit/`
- Security review existente: `/Users/mariatelloesbri/ai-agency-analysis/ai-agency-os/SECURITY-REVIEW.md`
