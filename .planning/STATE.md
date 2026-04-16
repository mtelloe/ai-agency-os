---
gsd_state_version: 1.0
milestone: v1.0
milestone_name: milestone
status: unknown
last_updated: "2026-04-16T11:00:19.765Z"
progress:
  total_phases: 3
  completed_phases: 0
  total_plans: 10
  completed_plans: 8
---

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
- Current Plan: 08 of 10
- Last completed: 02-08 (ProspectorAgent wired into index.ts + POST /api/prospect endpoint)
- Last session: 2026-04-15

## Decisions

| Phase | Decision |
|-------|----------|
| 02-01 | Reuse update_agent_updated_at() trigger from Phase 1 — no redundant function |
| 02-01 | outreach_log has no updated_at (immutable log records), no trigger needed |
| 02-01 | RLS SELECT-only; service_role bypasses for writes |

- [Phase 02-outreach-integrations]: @types/bottleneck omitted: package does not exist on npm; bottleneck ships its own bundled .d.ts
- [02-04]: ApolloEmailStatus defined as strict union for type safety in ProspectorAgent
- [02-04]: withRetry uses err.message.includes('429') — covers both string and Error shapes
- [02-05]: minTime: 100ms (plan spec) over RESEARCH.md's 80ms — more conservative under Hunter's 15req/s limit
- [02-05]: max_duration=20 set on findEmail per RESEARCH.md pitfall #6 to avoid long polling
- [02-05]: findEmail null return is correct behavior (not an error) — Hunter does not count failed finds against quota
- [Phase 02-outreach-integrations]: No Bottleneck inside GmailClient — rate limiting deferred to ProspectorAgent (plan 07)
- [02-07]: Apollo 'verified' maps to outreach 'valid' in resolveEmail — explicit enum bridge
- [02-07]: interpolateTemplate silent empty-string fallback for missing vars (v1 decision, revisit later)
- [02-07]: ProspectorAgent gmailLimiter minTime:1000 maxConcurrent:1 — conservative Gmail rate limit

## Phase 1 Artifacts (reference)

- Migration: `supabase/migrations/20260414_add_agents_tables.sql`
- Seed generator: `supabase/generate_seed_sql.ts`
- Orchestrator entry: `sales-orchestrator/src/index.ts`
- AgentRunner: `sales-orchestrator/src/agents/AgentRunner.ts`
- Scheduler: `sales-orchestrator/src/scheduler/Scheduler.ts`
- API: `sales-orchestrator/src/api/server.ts`

## Phase 2 Artifacts

- Migration: `supabase/migrations/20260415_add_outreach_tables.sql` (02-01)
- withRetry: `sales-orchestrator/src/integrations/retry.ts` (02-04)
- Apollo types: `sales-orchestrator/src/integrations/apollo/apollo.types.ts` (02-04)
- ApolloClient: `sales-orchestrator/src/integrations/apollo/ApolloClient.ts` (02-04)
- Hunter types: `sales-orchestrator/src/integrations/hunter/hunter.types.ts` (02-05)
- HunterClient: `sales-orchestrator/src/integrations/hunter/HunterClient.ts` (02-05)
- Hunter tests: `sales-orchestrator/tests/integrations/hunter/HunterClient.test.ts` (02-05)
- db/outreach: `sales-orchestrator/src/db/outreach.ts` (02-07)
- ProspectorAgent: `sales-orchestrator/src/agents/ProspectorAgent.ts` (02-07)
- Outreach tests: `sales-orchestrator/tests/db/outreach.test.ts` (02-07)
- ProspectorAgent tests: `sales-orchestrator/tests/agents/ProspectorAgent.test.ts` (02-07)
- server.ts (options-object, /api/prospect): `sales-orchestrator/src/api/server.ts` (02-08)
- index.ts (ProspectorAgent wired): `sales-orchestrator/src/index.ts` (02-08)
- server route tests: `sales-orchestrator/tests/api/server.test.ts` (02-08)
