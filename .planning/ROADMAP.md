# Sales Orchestrator — Roadmap

## Project Goal

Departamento de ventas autónomo para Simedalavida. El orchestrator crea y ejecuta agentes IA para prospectar leads, encontrar emails y enviar outreach automático.

## Tech Stack

- **Orchestrator**: Node.js/TypeScript (`/Users/mariatelloesbri/sales-orchestrator/`) — deployed en Easypanel
- **Frontend/DB**: Next.js + Supabase (`ai-agency-os`) — deployed en Vercel
- **Modelo**: claude-sonnet-4-6
- **Queue**: Redis (BullMQ)
- **URL live**: https://sales-orchestrator.hjbrvj.easypanel.host

---

## Phase 1: Core Orchestrator ✅ COMPLETE

**Goal:** Motor de ejecución de agentes desplegado y operativo.

**Delivered:**
- Supabase tables: `agents`, `agent_schedules`, `agent_executions`
- 8 agentes seed para Simedalavida (workspace `e804b86b-c67a-4e95-9f11-375eb4294b56`)
- AgentRunner, Scheduler (cron), Queue (BullMQ/Redis), API REST
- Tests unitarios (12 pass), CI/CD GitHub Actions
- Deploy Easypanel + HTTPS Let's Encrypt
- Heartbeat `/health` endpoint

**Repo state:** `sales-orchestrator` main @ `669772e`

---

## Phase 2: Outreach Integrations

**Goal:** Conectar el orchestrator con Apollo.io (prospección), Hunter.io (emails) y Gmail (envío) para que el departamento de ventas funcione de extremo a extremo sin intervención humana.

**Requirements:**
- REQ-2.1: Integración Apollo.io API — búsqueda de leads por criterios (sector, tamaño empresa, cargo)
- REQ-2.2: Integración Hunter.io API — verificación y búsqueda de emails corporativos
- REQ-2.3: Integración Gmail API (OAuth2) — envío de emails de outreach desde cuenta Simedalavida
- REQ-2.4: Agente ProspectorAgent — orquesta Apollo → Hunter → Gmail en secuencia
- REQ-2.5: Rate limiting y reintentos para APIs externas
- REQ-2.6: Tracking de outreach en Supabase (quién recibió qué, cuándo, estado)
- REQ-2.7: Templates de email en Supabase (editables sin deploy)

**Out of scope:** LinkedIn MCP (decisión legal)

**Plans:** 2/10 plans executed

Plans:
- [x] 02-01-PLAN.md — Supabase migration: outreach_contacts, email_templates, outreach_log tables + RLS
- [ ] 02-02-PLAN.md — Extend src/config/env.ts with Apollo/Hunter/Gmail env vars (Zod schema + AppConfig)
- [x] 02-03-PLAN.md — Install npm deps: googleapis, google-auth-library, bottleneck, nodemailer
- [ ] 02-04-PLAN.md — ApolloClient + shared withRetry helper (REQ-2.1, REQ-2.5)
- [ ] 02-05-PLAN.md — HunterClient: findEmail + verifyEmail (REQ-2.2)
- [ ] 02-06-PLAN.md — GmailClient: OAuth2 + base64url MIME send (REQ-2.3)
- [ ] 02-07-PLAN.md — db/outreach.ts + ProspectorAgent (orchestration, dedup, template interpolation)
- [ ] 02-08-PLAN.md — Wire ProspectorAgent into index.ts and expose POST /api/prospect
- [ ] 02-09-PLAN.md — Sentinel coverage test + full vitest suite green
- [ ] 02-10-PLAN.md — Deploy doc + Gmail OAuth helper script + Easypanel rollout (human checkpoint)

---

## Phase 3: Dashboard & Reporting (future)

**Goal:** UI en ai-agency-os para ver métricas de outreach, leads procesados, emails enviados y respuestas.
