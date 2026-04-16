# Project State

## Current Phase: 2 (Planning)

## Immutable Decisions

| Decision | Value |
|----------|-------|
| Orchestrator repo | `/Users/mariatelloesbri/sales-orchestrator/` |
| Orchestrator URL | https://sales-orchestrator.hjbrvj.easypanel.host |
| Supabase project | `ttpduldgqbdbkdpnfuvj` (AI Agency OS, eu-west-3) |
| Workspace Simedalavida | `e804b86b-c67a-4e95-9f11-375eb4294b56` |
| Claude model | `claude-sonnet-4-6` |
| LinkedIn | OUT OF SCOPE (legal decision) |
| Outreach APIs | Apollo.io + Hunter.io + Gmail only |
| Deploy | Easypanel (`automatizaciones` project) |
| No LinkedIn MCP | Legal decision, never add |

## Current Position

- Current Phase: 02-outreach-integrations
- Current Plan: 02 of 10
- Last completed: 02-01 (Outreach tables migration)
- Last session: 2026-04-16

## Decisions

| Phase | Decision |
|-------|----------|
| 02-01 | Reuse update_agent_updated_at() trigger from Phase 1 — no redundant function |
| 02-01 | outreach_log has no updated_at (immutable log records), no trigger needed |
| 02-01 | RLS SELECT-only; service_role bypasses for writes |

## Phase 1 Artifacts (reference)

- Migration: `supabase/migrations/20260414_add_agents_tables.sql`
- Seed generator: `supabase/generate_seed_sql.ts`
- Orchestrator entry: `sales-orchestrator/src/index.ts`
- AgentRunner: `sales-orchestrator/src/agents/AgentRunner.ts`
- Scheduler: `sales-orchestrator/src/scheduler/Scheduler.ts`
- API: `sales-orchestrator/src/api/server.ts`

## Phase 2 Artifacts

- Migration: `supabase/migrations/20260415_add_outreach_tables.sql` (02-01)
