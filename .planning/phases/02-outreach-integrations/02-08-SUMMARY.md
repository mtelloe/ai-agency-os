---
phase: 02-outreach-integrations
plan: "08"
subsystem: api
tags: [express, prospector, api-endpoint, wiring]
dependency_graph:
  requires: [02-07]
  provides: [POST /api/prospect, ProspectorAgent-wired-in-index]
  affects: [src/index.ts, src/api/server.ts]
tech_stack:
  added: []
  patterns: [options-object-factory, bearer-auth-middleware]
key_files:
  created:
    - tests/api/server.test.ts
  modified:
    - src/api/server.ts
    - src/index.ts
decisions:
  - createServer migrated to options-object (CreateServerOptions) to avoid positional parameter explosion
  - v1 runs prospect synchronously (not queued via BullMQ) — each 25-lead run ~30s within HTTP timeout
metrics:
  duration: "~10 minutes"
  completed: "2026-04-15"
  tasks_completed: 2
  files_changed: 3
---

# Phase 02 Plan 08: Wire ProspectorAgent + Expose POST /api/prospect — Summary

One-liner: ProspectorAgent wired into index.ts with all integration clients and exposed via a Bearer-auth-protected POST /api/prospect endpoint on the Express server.

## What Was Built

### createServer options-object refactor (src/api/server.ts)

Previous positional signature:
```typescript
createServer(cfg: AppConfig, queue: Queue<RunRequest>, logger: Logger)
```

New options-object signature:
```typescript
export interface CreateServerOptions {
  cfg: AppConfig;
  queue: Queue<RunRequest>;
  logger: Logger;
  prospector: ProspectorAgent;
}
export function createServer(opts: CreateServerOptions): Express
```

### POST /api/prospect contract

- **Auth:** `Authorization: Bearer <API_SECRET_KEY>` (same auth middleware as /api/execute/:slug)
- **Body:** `{ templateSlug: string, searchCriteria: ApolloSearchParams, workspaceId?: string }`
- **Response 202:** `{ status: 'started', result: { processed: number, sent: number, failed: number } }`
- **Response 400:** `{ error: 'invalid_body', details: string }` — when templateSlug or searchCriteria missing
- **Response 401:** `{ error: 'unauthorized' }` — missing or wrong Bearer token
- **Response 500:** `{ error: 'prospect_failed', details: string }` — when ProspectorAgent.run() throws

### ProspectorAgent wiring (src/index.ts)

All integration clients instantiated from `cfg` in `main()` before createServer:
```typescript
const apollo = new ApolloClient(cfg.apolloApiKey, logger);
const hunter = new HunterClient(cfg.hunterApiKey, logger);
const gmail = new GmailClient(cfg.gmailClientId, cfg.gmailClientSecret, cfg.gmailRefreshToken, logger);
const prospector = new ProspectorAgent({ apollo, hunter, gmail, supabase, logger, senderAddress: cfg.gmailSenderAddress });
```

### Sample curl command

```bash
curl -X POST https://sales-orchestrator.hjbrvj.easypanel.host/api/prospect \
  -H "Authorization: Bearer $API_SECRET_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "templateSlug": "outreach-v1",
    "workspaceId": "e804b86b-c67a-4e95-9f11-375eb4294b56",
    "searchCriteria": {
      "titles": ["Gerente", "Director", "CEO"],
      "per_page": 25
    }
  }'
```

Expected response (202):
```json
{ "status": "started", "result": { "processed": 25, "sent": 18, "failed": 2 } }
```

## Test Results

7 tests in `tests/api/server.test.ts` — all passing:
1. GET /health returns 200 (regression)
2. POST /api/execute/:slug works with Bearer auth (regression)
3. POST /api/prospect without Authorization returns 401
4. POST /api/prospect with valid body calls prospector.run and returns 202
5. POST /api/prospect with missing templateSlug returns 400
6. POST /api/prospect with missing searchCriteria returns 400
7. POST /api/prospect when prospector.run rejects returns 500

Full suite: 63 tests passed, 1 skipped (integration/end-to-end — requires RUN_INTEGRATION env).

## Deviations from Plan

None — plan executed exactly as written. The tests file counts (plan expected "at least 6 `it(` calls") was met with 7 tests (split the missing-body test into separate templateSlug and searchCriteria cases for clarity).

## Commits

| Task | Commit | Description |
|------|--------|-------------|
| Task 1 (TDD) | 2aaa14d | feat(02-08): add POST /api/prospect route to server.ts with options-object signature |
| Task 2 | 40cf061 | feat(02-08): wire ProspectorAgent + integration clients in index.ts |

## Known Stubs

None. All data flows from real integration clients (Apollo, Hunter, Gmail) through ProspectorAgent.run().

## Self-Check: PASSED

- tests/api/server.test.ts: FOUND
- src/api/server.ts contains `/api/prospect`: FOUND
- src/api/server.ts contains `CreateServerOptions`: FOUND
- src/index.ts contains `new ProspectorAgent`: FOUND
- Commits 2aaa14d and 40cf061: FOUND
