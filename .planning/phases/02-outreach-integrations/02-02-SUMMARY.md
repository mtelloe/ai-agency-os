---
phase: 02-outreach-integrations
plan: "02"
subsystem: config
tags: [env, zod, outreach, apollo, hunter, gmail]
dependency_graph:
  requires: []
  provides: [AppConfig.apolloApiKey, AppConfig.hunterApiKey, AppConfig.gmailClientId, AppConfig.gmailClientSecret, AppConfig.gmailRefreshToken, AppConfig.gmailSenderAddress]
  affects: [all downstream integration clients reading from AppConfig]
tech_stack:
  added: []
  patterns: [zod-env-validation, fail-fast-startup]
key_files:
  created:
    - /Users/mariatelloesbri/sales-orchestrator/tests/config/env.test.ts
  modified:
    - /Users/mariatelloesbri/sales-orchestrator/src/config/env.ts
decisions:
  - GMAIL_SENDER_ADDRESS validated with z.string().email() (not just min(1)) to catch invalid emails at startup
  - Existing pre-existing test updated to include new required vars (previously would have passed only because new fields didn't exist)
metrics:
  duration: "83 seconds"
  completed: "2026-04-16T10:55:58Z"
  tasks_completed: 2
  files_modified: 2
requirements: [REQ-2.1, REQ-2.2, REQ-2.3]
---

# Phase 02 Plan 02: Env Config Extension for Outreach Integrations Summary

Extended `src/config/env.ts` with six new env vars required by Apollo, Hunter, and Gmail integrations, validated via Zod and exposed through the `AppConfig` type.

## What Was Built

Six new env vars added to the Zod schema and `AppConfig` type:

| Env Var (SCREAMING_SNAKE) | AppConfig field (camelCase) | Validation |
|---|---|---|
| `APOLLO_API_KEY` | `apolloApiKey` | `z.string().min(1)` |
| `HUNTER_API_KEY` | `hunterApiKey` | `z.string().min(1)` |
| `GMAIL_CLIENT_ID` | `gmailClientId` | `z.string().min(1)` |
| `GMAIL_CLIENT_SECRET` | `gmailClientSecret` | `z.string().min(1)` |
| `GMAIL_REFRESH_TOKEN` | `gmailRefreshToken` | `z.string().min(1)` |
| `GMAIL_SENDER_ADDRESS` | `gmailSenderAddress` | `z.string().email()` |

All missing vars cause a `ZodError` at startup (fail-fast). Downstream integration clients consume `cfg.*` without touching `process.env` directly.

## Test File

`/Users/mariatelloesbri/sales-orchestrator/tests/config/env.test.ts`

Tests cover:
- All six new fields returned with correct values from `loadEnv(validEnv())`
- Throws on missing `APOLLO_API_KEY`
- Throws on missing `HUNTER_API_KEY`
- Throws on missing `GMAIL_CLIENT_ID`, `GMAIL_CLIENT_SECRET`, or `GMAIL_REFRESH_TOKEN`
- Throws when `GMAIL_SENDER_ADDRESS` is not a valid email

Total: 8 tests (3 pre-existing + 5 new), all passing.

## Commits

| Task | Commit | Description |
|---|---|---|
| Task 1 (RED) | `3633e3d` | test(02-02): add failing tests for outreach env fields |
| Task 2 (GREEN) | `bc4437a` | feat(02-02): extend env.ts with Apollo, Hunter, Gmail env vars |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Updated pre-existing test to include new required vars**
- **Found during:** Task 2 (GREEN phase)
- **Issue:** The pre-existing `parses valid env into typed config` test used a minimal env object without the new required fields. After adding the new required fields to the Zod schema, this test would fail with a ZodError on the new fields.
- **Fix:** Added all six new env vars to the existing test's env object.
- **Files modified:** `tests/config/env.test.ts`
- **Commit:** `bc4437a`

## Known Stubs

None — all env fields are wired directly to the Zod schema and returned from `loadEnv()`.

## Self-Check: PASSED
