---
phase: 02-outreach-integrations
plan: "05"
subsystem: integrations
tags: [hunter, email-finder, email-verifier, rate-limiter, bottleneck]
dependency_graph:
  requires: ["02-02 (ApolloClient)", "02-03 (ApolloClient types)"]
  provides: ["HunterClient", "hunter.types"]
  affects: ["ProspectorAgent (future)"]
tech_stack:
  added: ["bottleneck (already in deps)"]
  patterns: ["Bottleneck rate limiting", "fetch with URL searchParams", "typed response casting"]
key_files:
  created:
    - /Users/mariatelloesbri/sales-orchestrator/src/integrations/hunter/hunter.types.ts
    - /Users/mariatelloesbri/sales-orchestrator/src/integrations/hunter/HunterClient.ts
    - /Users/mariatelloesbri/sales-orchestrator/tests/integrations/hunter/HunterClient.test.ts
  modified: []
decisions:
  - "minTime: 100ms (not 80ms from RESEARCH.md) per plan spec — conservative under Hunter's 15req/s limit"
  - "max_duration=20 set on findEmail per RESEARCH.md pitfall #6 to avoid long polling"
  - "null return from findEmail is correct behavior, not an error — no credit counted by Hunter"
metrics:
  duration: "~10 minutes"
  completed: "2026-04-15"
  tasks_completed: 2
  files_created: 3
---

# Phase 02 Plan 05: HunterClient Summary

**One-liner:** Typed Hunter.io client with `findEmail` (returns `{email,score}|null`) and `verifyEmail` (returns `HunterVerifyStatus`), rate-limited via Bottleneck at 100ms/2-concurrent to stay well under Hunter's 15req/s limit.

## What Was Built

### `src/integrations/hunter/hunter.types.ts`
Five named exports:
- `HunterFindEmailParams` — `{ domain, first_name, last_name }`
- `HunterEmailResult` — `{ email: string; score: number }`
- `HunterVerifyStatus` — strict union `'valid' | 'invalid' | 'accept_all' | 'unknown'`
- `HunterFindResponse` — `{ data: HunterEmailResult | null }`
- `HunterVerifyResponse` — `{ data: { status: HunterVerifyStatus } }`

### `src/integrations/hunter/HunterClient.ts`
Class with constructor `(apiKey: string, logger: Logger)`:

**`findEmail(params: HunterFindEmailParams): Promise<HunterEmailResult | null>`**
- Calls `GET https://api.hunter.io/v2/email-finder`
- Sets: `api_key`, `domain`, `first_name`, `last_name`, `max_duration=20`
- Returns `null` when `data: null` (no email found — NOT an error, no API credit consumed by Hunter for misses)
- Throws `Error('Hunter find {status}')` on non-2xx

**`verifyEmail(email: string): Promise<HunterVerifyStatus>`**
- Calls `GET https://api.hunter.io/v2/email-verifier`
- Sets: `api_key`, `email`
- Returns typed status string
- Throws `Error('Hunter verify {status}')` on non-2xx

Both methods wrapped in `this.limiter.schedule()` — Bottleneck config: `{ minTime: 100, maxConcurrent: 2 }`.

### `tests/integrations/hunter/HunterClient.test.ts`
7 tests, all passing:
1. findEmail returns `{ email, score }` on success
2. findEmail returns `null` when `data: null`
3. findEmail URL has `api_key`, `domain`, `first_name`, `last_name`, `max_duration=20`
4. findEmail throws `'Hunter find 401'` on 401
5. verifyEmail returns `'valid'` on success
6. verifyEmail URL has `api_key` and `email`
7. verifyEmail throws `'Hunter verify 429'` on 429

## Credit-Saving Behaviour

ProspectorAgent should call Hunter **only when Apollo does not already provide a verified email**. The free tier allows 25 finds + 50 verifies/month. Key design decisions that conserve credits:

- `findEmail` returning `null` is not retried — it means no email exists in Hunter's database
- `verifyEmail` is separate from `findEmail` — skip verify if Apollo already provides a valid email
- `max_duration=20` prevents Hunter from spending extra time enriching low-confidence results

## Deviations from Plan

None — plan executed exactly as written. The only minor deviation: RESEARCH.md showed `minTime: 80` but the plan spec mandated `minTime: 100` (more conservative). Plan spec takes precedence.

## Self-Check

- [x] `src/integrations/hunter/hunter.types.ts` exists
- [x] `src/integrations/hunter/HunterClient.ts` exists
- [x] `tests/integrations/hunter/HunterClient.test.ts` exists with 7 `it(` calls
- [x] `export class HunterClient` grep matches
- [x] `minTime: 100` grep matches
- [x] `maxConcurrent: 2` grep matches
- [x] `https://api.hunter.io/v2/email-finder` grep matches
- [x] `https://api.hunter.io/v2/email-verifier` grep matches
- [x] `max_duration` grep matches
- [x] `npm test -- tests/integrations/hunter` exits 0 (7 tests pass)
- [x] `npm run typecheck` exits 0

## Self-Check: PASSED
