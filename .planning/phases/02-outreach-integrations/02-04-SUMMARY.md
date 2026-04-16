---
phase: 02-outreach-integrations
plan: 04
subsystem: integrations
tags: [apollo, retry, bottleneck, rate-limiting, typed-client]
dependency_graph:
  requires: [02-02, 02-03]
  provides: [ApolloClient, withRetry]
  affects: [02-05, 02-06, 02-07]
tech_stack:
  added: [bottleneck]
  patterns: [TDD, dependency-injection, rate-limiting, typed-http-client]
key_files:
  created:
    - /Users/mariatelloesbri/sales-orchestrator/src/integrations/apollo/apollo.types.ts
    - /Users/mariatelloesbri/sales-orchestrator/src/integrations/apollo/ApolloClient.ts
    - /Users/mariatelloesbri/sales-orchestrator/src/integrations/retry.ts
    - /Users/mariatelloesbri/sales-orchestrator/tests/integrations/apollo/ApolloClient.test.ts
    - /Users/mariatelloesbri/sales-orchestrator/tests/integrations/retry.test.ts
  modified: []
decisions:
  - "Bottleneck ships its own .d.ts — @types/bottleneck omitted (package does not exist on npm)"
  - "withRetry uses err.message.includes('429') as retry trigger — covers both string and Error shapes"
  - "ApolloEmailStatus defined as strict union for type safety downstream in ProspectorAgent"
metrics:
  duration_minutes: 8
  completed_date: "2026-04-15"
  tasks_completed: 3
  files_created: 5
requirements: [REQ-2.1, REQ-2.5]
---

# Phase 02 Plan 04: ApolloClient + withRetry Helper Summary

**One-liner:** Typed Apollo.io HTTP client with Bottleneck rate limiter (1300ms/req) and a shared exponential-backoff retry helper that retries only on 429 errors.

## What Was Built

### src/integrations/retry.ts
- `withRetry<T>(fn, maxAttempts=3, baseDelayMs=1000): Promise<T>`
- Retries only when `error.message.includes('429')` — rethrows all other errors immediately
- Exponential backoff: `baseDelayMs * 2^(attempt-1) + jitter(0-500ms)`
- Reused by Hunter and Gmail clients (plans 05-06)

### src/integrations/apollo/apollo.types.ts
5 named exports:
- `ApolloSearchParams` — query parameters (person_titles, seniorities, industries, locations, pagination)
- `ApolloOrganization` — nested org shape with nullable fields
- `ApolloEmailStatus` — strict union: `'verified' | 'unverified' | 'likely to engage' | 'unavailable'`
- `ApolloLead` — full lead shape with email_status (used by ProspectorAgent for skip-Hunter optimization)
- `ApolloSearchResponse` — API response envelope `{ people: ApolloLead[] }`

### src/integrations/apollo/ApolloClient.ts
- `ApolloClient(apiKey: string, logger: Logger)` — takes `cfg.apolloApiKey` via DI
- `searchPeople(params: ApolloSearchParams): Promise<ApolloLead[]>`
  - POST `https://api.apollo.io/api/v1/mixed_people/api_search`
  - Header: `x-api-key: <apiKey>`
  - Bottleneck: `{ minTime: 1300, maxConcurrent: 1 }` (46 req/min, Apollo free tier)
  - Defaults `per_page` to 25 when not provided
  - Defensive: returns `[]` when API omits `people` field
  - Throws `Error('Apollo API <status>: <body>')` on non-2xx

## Test Coverage

| Test File | Tests | Status |
|-----------|-------|--------|
| tests/integrations/retry.test.ts | 4 | PASS |
| tests/integrations/apollo/ApolloClient.test.ts | 5 | PASS |
| **Total** | **9** | **PASS** |

retry.test.ts covers: success, retry-then-succeed, exhaust-attempts, non-429-propagation
ApolloClient.test.ts covers: URL/method, x-api-key header, per_page default, 401 error, undefined people

## Commits

| Task | Commit | Description |
|------|--------|-------------|
| Task 1 — withRetry | e2da8ae | feat(02-04): implement withRetry helper with 4 passing tests |
| Task 2 — Apollo types | d330d4b | feat(02-04): add Apollo.io TypeScript types |
| Task 3 — ApolloClient | 012fada | feat(02-04): implement ApolloClient with Bottleneck rate limiter and 5 tests |

## Deviations from Plan

None — plan executed exactly as written.

## Known Stubs

None — ApolloClient.searchPeople makes live HTTP calls; no stub data flows to output.

## Self-Check: PASSED

- FOUND: src/integrations/apollo/apollo.types.ts
- FOUND: src/integrations/apollo/ApolloClient.ts
- FOUND: src/integrations/retry.ts
- FOUND: tests/integrations/apollo/ApolloClient.test.ts
- FOUND: tests/integrations/retry.test.ts
- FOUND: export class ApolloClient
- FOUND: import Bottleneck from 'bottleneck'
- FOUND: minTime: 1300
- FOUND: export async function withRetry
- FOUND: err.message.includes('429')
- Commits e2da8ae, d330d4b, 012fada all present in git log
- 9/9 tests passing, typecheck clean
