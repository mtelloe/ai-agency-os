---
phase: 02-outreach-integrations
plan: "06"
subsystem: gmail-integration
tags: [gmail, oauth2, base64url, email, nodemailer, googleapis]
dependency_graph:
  requires: [02-02, 02-03]
  provides: [GmailClient]
  affects: [02-07-ProspectorAgent]
tech_stack:
  added: [googleapis, google-auth-library, nodemailer/MailComposer]
  patterns: [OAuth2-refresh-token, base64url-encoding, dependency-injection]
key_files:
  created:
    - /Users/mariatelloesbri/sales-orchestrator/src/integrations/gmail/gmail.types.ts
    - /Users/mariatelloesbri/sales-orchestrator/src/integrations/gmail/GmailClient.ts
    - /Users/mariatelloesbri/sales-orchestrator/tests/integrations/gmail/GmailClient.test.ts
  modified: []
decisions:
  - "No Bottleneck rate limiter inside GmailClient — deferred to ProspectorAgent (plan 07) where per-run budget is known"
  - "base64url encoding uses 3-step replace chain: +→-, /→_, strip trailing ="
  - "sendEmail returns string messageId (not SendEmailResult object) — simpler for ProspectorAgent consumption"
  - "MailComposer mock uses vi.mock with default export to match nodemailer's CommonJS-style deep import"
metrics:
  duration_minutes: 12
  completed_date: "2026-04-15"
  tasks_completed: 2
  tasks_total: 2
  files_created: 3
  files_modified: 0
requirements_addressed: [REQ-2.3]
---

# Phase 02 Plan 06: GmailClient Summary

GmailClient sending MIME emails via Gmail API v1 using OAuth2 refresh token with enforced base64url encoding contract verified by unit test.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Gmail types file | 2037c50 | src/integrations/gmail/gmail.types.ts |
| 2 | GmailClient implementation + tests | 64fd55a | src/integrations/gmail/GmailClient.ts, tests/integrations/gmail/GmailClient.test.ts |

## Implementation Details

### Constructor Signature

```typescript
constructor(
  clientId: string,
  clientSecret: string,
  refreshToken: string,
  logger: Logger,
)
```

Matches AppConfig fields: `gmailClientId`, `gmailClientSecret`, `gmailRefreshToken`. OAuth2Client is constructed with `(clientId, clientSecret)` and `setCredentials({ refresh_token: refreshToken })` is called immediately.

### sendEmail Signature

```typescript
async sendEmail(params: SendEmailParams): Promise<string>
```

Returns the Gmail message ID string (from `result.data.id ?? 'unknown'`). Throws if `gmail.users.messages.send` rejects.

### base64url Encoding Chain

The encoding pipeline in `buildRaw()` is:
1. `MailComposer.compile().build()` → raw MIME Buffer
2. `Buffer.from(message).toString('base64')` → standard base64
3. `.replace(/\+/g, '-')` — replace + with -
4. `.replace(/\//g, '_')` — replace / with _
5. `.replace(/=+$/, '')` — strip trailing padding

This matches RFC 4648 §5 (base64url). Enforced by Test 3 which asserts `/^[A-Za-z0-9_-]+$/` on the raw value passed to the Gmail API.

### Deliberate Decision: No Bottleneck

Rate limiting (100 units/send, 150 sends/min max) is NOT implemented inside GmailClient. This is intentional — the ProspectorAgent (plan 07) knows the per-run budget and will apply Bottleneck at the orchestration layer. Adding it here would make the client non-reusable for burst scenarios like transactional emails.

## Test Coverage (5 tests)

| Test | What it asserts |
|------|----------------|
| Test 1 | sendEmail returns messageId from API response data.id |
| Test 2 | gmail.users.messages.send called with userId: 'me' and requestBody.raw |
| Test 3 | raw value matches `/^[A-Za-z0-9_-]+$/` (no +, /, or = chars) |
| Test 4 | Error from send() propagates (not swallowed) |
| Test 5 | Constructor with 4 args does not throw |

## Deviations from Plan

### Auto-fixed Issues

None — plan executed exactly as written.

**Note on Test 3 accessor:** The plan's sample code used a nested array access pattern; the actual `vi.fn().mock.calls[0]` structure is `[args]`, so the accessor was corrected to `(mockSend.mock.calls[0] as [...])[0].requestBody.raw`. This is a test implementation detail, not a behavioral deviation.

## Known Stubs

None. All behavior is wired: mock resolves correctly in tests, real implementation calls googleapis.

## Self-Check: PASSED

- src/integrations/gmail/gmail.types.ts: FOUND
- src/integrations/gmail/GmailClient.ts: FOUND
- tests/integrations/gmail/GmailClient.test.ts: FOUND
- Commit 2037c50: FOUND (feat(02-06): add SendEmailParams and SendEmailResult types)
- Commit 64fd55a: FOUND (feat(02-06): implement GmailClient with base64url encoding and OAuth2 refresh token)
- npm test -- tests/integrations/gmail: 5 passed
- npm run typecheck: clean
